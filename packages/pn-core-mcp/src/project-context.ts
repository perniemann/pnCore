/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */

import { existsSync } from "fs";
import { join } from "path";
import { computeActiveRun, type ActiveRun, type Consistency } from "./active-run.js";
import {
  ARTIFACT_TYPES,
  currentCheckpointId,
  isEvidenceOnly,
  loadContextIndex,
  type ArtifactLifecycle,
  type ArtifactType,
  type ContextArtifact,
} from "./context-index.js";
import { readFileTail } from "./file-tail.js";
import { trailPaths } from "./run-spans.js";
import { resolveInside } from "./safe-path.js";
import { defaultRunEventsPath, type RunEvent } from "./verify-attest.js";

export type DerivedStatus =
  "ok" | "missing" | "complete_attested" | "drift" | "in_progress" | "unattested";

export type ArtifactReport = {
  id: string;
  type: ArtifactType;
  path: string;
  path_exists: boolean;
  authored_status: string | null;
  derived_status: DerivedStatus;
  run_id: string | null;
  tracker: string | null;
  tracker_checked: false;
  notes: string[];
  /** Present when the index declares one; historical / superseded entries are evidence only. */
  lifecycle?: ArtifactLifecycle;
  superseded_by?: string;
};

export type TrailLine = {
  source: "workflow_handoff" | "run_events";
  ts: string;
  summary: string;
};

/** Compact alias table for project_context (ADR-0013 / ADR-0017). Not the full skill. */
export type ResponseAlias = { alias: string; expand: string };

export const RESPONSE_ALIASES: readonly ResponseAlias[] = [
  {
    alias: "scr",
    expand:
      "Simplify, compress, and repeat your last response. Cut filler; keep facts and decisions.",
  },
  {
    alias: "eli",
    expand: "Explain like I am 18. Simplify language. Shorten the response.",
  },
  {
    alias: "foc",
    expand:
      "Focus on what matters most. What is the true signal and value? Boil down to the single most important point.",
  },
  {
    alias: "ref",
    expand:
      "Rewrite using reference points: F# findings, D# decisions, O# options, R# risks, Q# questions, A# actions. Preserve codes for the rest of the session.",
  },
  {
    alias: "scp",
    expand:
      "Scope lock: deliver only what was requested. Drop unsolicited cleanup, refactors, docs, or adjacent features.",
  },
];

export type ProjectContextPacket = {
  mode: "operator" | "agent";
  version: string;
  calendarDateUtc: string;
  context_index: {
    version: string | null;
    last_reviewed: string | null;
    path: string;
    present: boolean;
  };
  counts: Record<string, number>;
  active_run_id: string | null;
  resume: string | null;
  active_run: ActiveRun;
  consistency: Consistency;
  /** `drift` covers context-index artifacts only; run/state freshness is under `consistency`. */
  drift_scope: "indexed_files";
  drift: ArtifactReport[];
  next_incomplete: ArtifactReport | null;
  responseAliases: readonly ResponseAlias[];
  artifacts?: ArtifactReport[];
  trail?: TrailLine[];
  pointers?: Record<string, string | null | undefined>;
};

const COMPLETE_CLAIMS = new Set(["complete", "done", "completed", "shipped"]);
const IN_PROGRESS_CLAIMS = new Set(["in_progress", "in-progress", "wip", "active", "started"]);

function parseRunEventLine(line: string): RunEvent | null {
  try {
    const o = JSON.parse(line) as Record<string, unknown>;
    if (
      o.kind === "verify" &&
      typeof o.attestationId === "string" &&
      typeof o.run_id === "string"
    ) {
      return o as Extract<RunEvent, { kind: "verify" }>;
    }
    if (
      o.kind === "preflight" &&
      typeof o.preflightId === "string" &&
      typeof o.run_id === "string"
    ) {
      return o as Extract<RunEvent, { kind: "preflight" }>;
    }
    if (o.kind === "acceptance" && typeof o.run_id === "string") {
      return o as Extract<RunEvent, { kind: "acceptance" }>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Read run-events for a run_id under an arbitrary cwd (tests + MCP handler). */
export function loadRunEventsForCwd(
  run_id: string,
  cwd: string = process.cwd(),
  limit: number = 80
): RunEvent[] {
  const abs = join(cwd, defaultRunEventsPath());
  if (!existsSync(abs)) return [];
  const raw = readFileTail(abs, 786_432);
  const matched: RunEvent[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const ev = parseRunEventLine(t);
    if (!ev || ev.run_id !== run_id) continue;
    matched.push(ev);
  }
  const cap = Math.min(Math.max(limit, 1), 200);
  return matched.slice(-cap);
}

function isCompleteClaim(authored: string | null): boolean {
  if (!authored) return false;
  return COMPLETE_CLAIMS.has(authored.trim().toLowerCase());
}

function isInProgressClaim(authored: string | null): boolean {
  if (!authored) return false;
  return IN_PROGRESS_CLAIMS.has(authored.trim().toLowerCase());
}

function attestationSupportsComplete(events: RunEvent[]): boolean {
  for (const ev of events) {
    if (ev.kind === "acceptance" && ev.accepted === true) return true;
    if (ev.kind === "verify" && ev.exitCode === 0 && ev.timedOut === false) return true;
  }
  return false;
}

export function deriveArtifactStatus(
  artifact: ContextArtifact,
  cwd: string = process.cwd(),
  eventsByRunId?: Map<string, RunEvent[]>
): ArtifactReport {
  const pathExists = existsSync(join(cwd, artifact.path));
  const authored =
    typeof artifact.authored_status === "string" && artifact.authored_status.trim() !== ""
      ? artifact.authored_status.trim()
      : null;
  const runId =
    typeof artifact.run_id === "string" && artifact.run_id.trim() !== ""
      ? artifact.run_id.trim()
      : null;
  const tracker =
    typeof artifact.tracker === "string" && artifact.tracker.trim() !== ""
      ? artifact.tracker.trim()
      : null;
  const notes: string[] = [];

  if (!pathExists) {
    notes.push("path missing on disk");
    return {
      id: artifact.id,
      type: artifact.type,
      path: artifact.path,
      path_exists: false,
      authored_status: authored,
      derived_status: "missing",
      run_id: runId,
      tracker,
      tracker_checked: false,
      notes,
    };
  }

  if (isCompleteClaim(authored)) {
    if (!runId) {
      notes.push("authored complete without run_id attestation");
      return {
        id: artifact.id,
        type: artifact.type,
        path: artifact.path,
        path_exists: true,
        authored_status: authored,
        derived_status: "drift",
        run_id: null,
        tracker,
        tracker_checked: false,
        notes,
      };
    }
    let events = eventsByRunId?.get(runId);
    if (!events) {
      events = loadRunEventsForCwd(runId, cwd, 80);
    }
    if (attestationSupportsComplete(events)) {
      notes.push("complete attested via run-events");
      return {
        id: artifact.id,
        type: artifact.type,
        path: artifact.path,
        path_exists: true,
        authored_status: authored,
        derived_status: "complete_attested",
        run_id: runId,
        tracker,
        tracker_checked: false,
        notes,
      };
    }
    notes.push("authored complete but no passing verify/acceptance for run_id");
    return {
      id: artifact.id,
      type: artifact.type,
      path: artifact.path,
      path_exists: true,
      authored_status: authored,
      derived_status: "drift",
      run_id: runId,
      tracker,
      tracker_checked: false,
      notes,
    };
  }

  if (isInProgressClaim(authored)) {
    return {
      id: artifact.id,
      type: artifact.type,
      path: artifact.path,
      path_exists: true,
      authored_status: authored,
      derived_status: "in_progress",
      run_id: runId,
      tracker,
      tracker_checked: false,
      notes,
    };
  }

  if (authored) {
    notes.push("authored_status is a claim only; not used as derived truth");
  }

  return {
    id: artifact.id,
    type: artifact.type,
    path: artifact.path,
    path_exists: true,
    authored_status: authored,
    derived_status: "ok",
    run_id: runId,
    tracker,
    tracker_checked: false,
    notes,
  };
}

function countByType(reports: ArtifactReport[]): Record<string, number> {
  const counts: Record<string, number> = {
    total: reports.length,
    drift: 0,
    missing: 0,
    historical: 0,
  };
  for (const t of ARTIFACT_TYPES) counts[t] = 0;
  for (const r of reports) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (isEvidenceOnly(r)) {
      counts.historical += 1;
      continue;
    }
    if (r.derived_status === "drift") counts.drift += 1;
    if (r.derived_status === "missing") counts.missing += 1;
  }
  return counts;
}

const INCOMPLETE_ORDER: DerivedStatus[] = ["drift", "missing", "in_progress", "unattested"];

/** The declared current checkpoint first; historical / superseded entries never become blockers. */
function pickNextIncomplete(
  reports: ArtifactReport[],
  currentId: string | null
): ArtifactReport | null {
  const live = reports.filter((r) => !isEvidenceOnly(r));
  const current = currentId ? live.find((r) => r.id === currentId) : undefined;
  if (current && INCOMPLETE_ORDER.includes(current.derived_status)) return current;
  for (const status of INCOMPLETE_ORDER) {
    const hit = live.find((r) => r.derived_status === status);
    if (hit) return hit;
  }
  return null;
}

function readHandoffTrail(runId: string | null, maxLines: number, cwd: string): TrailLine[] {
  const safe = resolveInside(cwd, trailPaths().handoff);
  if ("error" in safe || !existsSync(safe.resolved)) return [];
  const raw = readFileTail(safe.resolved, 786_432);
  const lines: TrailLine[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      if (runId && o.run_id !== runId) continue;
      const ts = typeof o.ts === "string" ? o.ts : "";
      const summary = typeof o.summary === "string" ? o.summary : "";
      if (!summary) continue;
      lines.push({ source: "workflow_handoff", ts, summary: summary.slice(0, 400) });
    } catch {
      /* skip */
    }
  }
  return lines.slice(-maxLines);
}

function readRunEventTrail(runId: string | null, maxLines: number, cwd: string): TrailLine[] {
  if (!runId) return [];
  return loadRunEventsForCwd(runId, cwd, maxLines).map((ev) => {
    if (ev.kind === "verify") {
      return {
        source: "run_events" as const,
        ts: ev.finishedAt,
        summary: `verify exit=${ev.exitCode}${ev.failureClass && ev.failureClass !== "none" ? ` class=${ev.failureClass}` : ""} ${ev.commandId ?? ev.argv.join(" ").slice(0, 80)}`,
      };
    }
    if (ev.kind === "preflight") {
      const failed = ev.checks.filter((c) => !c.ok).map((c) => `${c.kind}:${c.target}`);
      return {
        source: "run_events" as const,
        ts: ev.ts,
        summary: `preflight ok=${ev.ok}${failed.length ? ` missing=${failed.join(",").slice(0, 120)}` : ""}`,
      };
    }
    return {
      source: "run_events" as const,
      ts: ev.ts,
      summary: `acceptance accepted=${ev.accepted} workflow=${ev.workflowType} step=${ev.step}`,
    };
  });
}

export type BuildProjectContextOpts = {
  mode?: "operator" | "agent";
  run_id?: string;
  state_path?: string;
  max_trail?: number;
  cwd?: string;
};

export function buildProjectContextPacket(
  opts: BuildProjectContextOpts = {}
): ProjectContextPacket {
  const mode = opts.mode === "operator" ? "operator" : "agent";
  const cwd = opts.cwd ?? process.cwd();
  const maxTrail = Math.min(Math.max(opts.max_trail ?? 20, 1), 80);
  const { index, path: indexPath, present } = loadContextIndex(cwd);
  const { active_run, consistency } = computeActiveRun({
    cwd,
    run_id: opts.run_id,
    state_path: opts.state_path,
    indexPresent: present,
    index,
  });
  const activeRunId = active_run.run_id;
  const artifactsRaw = Array.isArray(index?.artifacts) ? index!.artifacts! : [];
  const artifacts = artifactsRaw.filter(
    (a): a is ContextArtifact =>
      !!a &&
      typeof a === "object" &&
      typeof a.id === "string" &&
      typeof a.path === "string" &&
      typeof a.type === "string" &&
      (ARTIFACT_TYPES as readonly string[]).includes(a.type)
  );

  const eventsByRunId = new Map<string, RunEvent[]>();
  const runIds = new Set<string>();
  for (const a of artifacts) {
    if (typeof a.run_id === "string" && a.run_id.trim()) runIds.add(a.run_id.trim());
  }
  if (activeRunId) runIds.add(activeRunId);
  for (const id of runIds) {
    eventsByRunId.set(id, loadRunEventsForCwd(id, cwd, 80));
  }

  const reports = artifacts.map((a) => {
    const report = deriveArtifactStatus(a, cwd, eventsByRunId);
    if (a.lifecycle) report.lifecycle = a.lifecycle;
    if (typeof a.superseded_by === "string" && a.superseded_by !== "") {
      report.superseded_by = a.superseded_by;
    }
    if (isEvidenceOnly(report))
      report.notes.push(`${a.lifecycle}: evidence only, not a current blocker`);
    return report;
  });

  const drift = reports.filter(
    (r) => !isEvidenceOnly(r) && (r.derived_status === "drift" || r.derived_status === "missing")
  );
  const packet: ProjectContextPacket = {
    mode,
    version: "1",
    calendarDateUtc: new Date().toISOString().slice(0, 10),
    context_index: {
      version: index?.version ?? null,
      last_reviewed: index?.last_reviewed ?? null,
      path: indexPath,
      present,
    },
    counts: countByType(reports),
    active_run_id: activeRunId,
    resume: active_run.resume,
    active_run,
    consistency,
    drift_scope: "indexed_files",
    drift,
    next_incomplete: pickNextIncomplete(reports, currentCheckpointId(index)),
    responseAliases: RESPONSE_ALIASES,
  };

  if (mode === "agent") {
    packet.artifacts = reports;
    packet.pointers = index?.pointers;
    const handoffTrail = readHandoffTrail(activeRunId, maxTrail, cwd);
    const eventTrail = readRunEventTrail(activeRunId, maxTrail, cwd);
    packet.trail = [...handoffTrail, ...eventTrail]
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(-maxTrail);
  }

  return packet;
}
