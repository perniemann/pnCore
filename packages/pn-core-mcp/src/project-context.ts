/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { readFileTail } from "./file-tail.js";
import { trailPaths } from "./run-spans.js";
import { resolveInside } from "./safe-path.js";
import {
  DEFAULT_STATE_REL,
  readLastStateSave,
  resolveStatePath,
  type StatePathSource,
} from "./state-path.js";
import { readCheckpointMeta } from "./checkpoint.js";
import { defaultRunEventsPath, type RunEvent } from "./verify-attest.js";

export const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export const HUMAN_HANDOFF_REL = ".pncore/handoff.md";
export const WORKFLOW_STATE_REL = DEFAULT_STATE_REL;
export const WORKFLOW_HANDOFF_REL = ".pncore/workflow-handoff.jsonl";

export const ARTIFACT_TYPES = [
  "discovery",
  "plan",
  "prd",
  "design",
  "workflow",
  "convention",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type AuthoredStatus = string | null | undefined;

export type ArtifactLifecycle = "current" | "historical" | "superseded";

export type ContextArtifact = {
  id: string;
  type: ArtifactType;
  path: string;
  tracker?: string | null;
  authored_status?: AuthoredStatus;
  run_id?: string | null;
  lifecycle?: ArtifactLifecycle;
  superseded_by?: string;
};

export type ContextIndex = {
  version: string;
  last_reviewed: string;
  pointers?: Record<string, string | null | undefined>;
  artifacts?: ContextArtifact[];
  acceptance_criteria_ids?: string[];
  verify?: Array<{ command: string; expect: string }>;
};

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

export type MismatchCode =
  | "state_path_rejected"
  | "workspace_root_suspect"
  | "state_path_diverged"
  | "default_state_shadowed"
  | "newer_run_in_log"
  | "handoff_run_mismatch"
  | "state_run_differs"
  | "handoff_skipped"
  | "handoff_foreign"
  | "handoff_revision_ahead"
  | "state_unversioned"
  | "state_vs_declared_current"
  | "historical_entry_selected";

export type ConsistencyMismatch = {
  code: MismatchCode;
  severity: "error" | "warn" | "info";
  detail: string;
};

/**
 * Served vs completed for the selected run. `workflow_step` logs a step when its instruction is
 * served; `workflow_handoff_append` logs it when the work is done. Served = completed + 1 is
 * normal in-flight work, not a mismatch.
 */
export type StepStatus = "unknown" | "idle" | "in_progress" | "handoff_skipped" | "handoff_foreign";

export type RunCandidate = {
  run_id: string;
  source: "argument" | "state" | "run_log" | "handoff_log" | "state_save";
};

export type ActiveRun = {
  workspace_root: string;
  state_path: string;
  state_path_source: StatePathSource;
  state_present: boolean;
  state_run_id: string | null;
  /** Checkpoint revision of the state file (workflow_state_save commit mode); null when unversioned. */
  state_revision: number | null;
  /** Selected run: explicit argument, or the state run when no source disagrees; else null. */
  run_id: string | null;
  run_id_source: "argument" | "state" | "none";
  candidates: RunCandidate[];
  workflowType: string | null;
  last_served_step: number | null;
  last_served_ts: string | null;
  last_completed_step: number | null;
  last_completed_ts: string | null;
  step_status: StepStatus;
  /** run_id of the newest workflow-handoff.jsonl line (any run). */
  handoff_run_id: string | null;
  resume: string | null;
  /** Whether .pncore/handoff.md names the selected run; null when either is absent. */
  resume_run_bound: boolean | null;
  /** context-index pointers.current_checkpoint artifact and its run_id; null when undeclared. */
  declared_current: { artifact_id: string; run_id: string | null } | null;
};

export type Consistency = { ok: boolean; mismatches: ConsistencyMismatch[] };

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

function readJsonSafe(absPath: string): unknown | null {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, "utf-8")) as unknown;
  } catch {
    return null;
  }
}

export function loadContextIndex(cwd: string = process.cwd()): {
  index: ContextIndex | null;
  path: string;
  present: boolean;
} {
  const abs = join(cwd, CONTEXT_INDEX_REL);
  const raw = readJsonSafe(abs);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { index: null, path: CONTEXT_INDEX_REL, present: false };
  }
  return { index: raw as ContextIndex, path: CONTEXT_INDEX_REL, present: true };
}

function readStateRunId(absPath: string): string | null {
  const raw = readJsonSafe(absPath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as Record<string, unknown>;
  if (typeof state.run_id === "string" && state.run_id.trim() !== "") return state.run_id;
  return null;
}

/** run_id from the resolved state file (argument > PNCORE_STATE_PATH > default). */
export function readActiveRunId(cwd: string = process.cwd(), statePath?: string): string | null {
  const resolved = resolveStatePath({ arg: statePath, cwd });
  if (!resolved.resolved) return null;
  return readStateRunId(resolved.resolved);
}

export function readResumeLine(cwd: string = process.cwd()): string | null {
  const abs = join(cwd, HUMAN_HANDOFF_REL);
  if (!existsSync(abs)) return null;
  try {
    const text = readFileSync(abs, "utf-8");
    const resumeMatch = text.match(/##\s*Resume here\s*\n+([^\n#]+)/i);
    if (resumeMatch?.[1]) return resumeMatch[1].trim().slice(0, 400);
    const statusMatch = text.match(/##\s*Status\s*\n+([^\n#]+)/i);
    if (statusMatch?.[1]) return statusMatch[1].trim().slice(0, 400);
    const first = text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#"));
    return first ? first.slice(0, 400) : null;
  } catch {
    return null;
  }
}

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

function isEvidenceOnly(r: ArtifactReport): boolean {
  return r.lifecycle === "historical" || r.lifecycle === "superseded";
}

function countByType(reports: ArtifactReport[]): Record<string, number> {
  const counts: Record<string, number> = {
    total: reports.length,
    drift: 0,
    missing: 0,
  };
  for (const t of ARTIFACT_TYPES) counts[t] = 0;
  for (const r of reports) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (isEvidenceOnly(r)) {
      counts.historical = (counts.historical ?? 0) + 1;
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
  const current = currentId ? reports.find((r) => r.id === currentId) : undefined;
  if (current && INCOMPLETE_ORDER.includes(current.derived_status)) return current;
  const live = reports.filter((r) => !isEvidenceOnly(r));
  for (const status of INCOMPLETE_ORDER) {
    const hit = live.find((r) => r.derived_status === status);
    if (hit) return hit;
  }
  return null;
}

function readHandoffTrail(runId: string | null, maxLines: number, cwd: string): TrailLine[] {
  const abs = join(cwd, WORKFLOW_HANDOFF_REL);
  if (!existsSync(abs)) return [];
  const raw = readFileTail(abs, 786_432);
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

type LogPoint = {
  run_id: string;
  step: number | null;
  ts: string;
  workflowType: string | null;
  revision: number | null;
};

function newestPoint(points: LogPoint[]): LogPoint | null {
  return points.reduce<LogPoint | null>((acc, p) => (!acc || p.ts >= acc.ts ? p : acc), null);
}

/** Every point in a run-log or handoff JSONL file, in file order. */
function scanRunLog(rel: string, cwd: string, runKey: "runId" | "run_id"): LogPoint[] {
  const safe = resolveInside(cwd, rel);
  if ("error" in safe || !existsSync(safe.resolved)) return [];
  const points: LogPoint[] = [];
  for (const line of readFileTail(safe.resolved, 786_432).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(t) as Record<string, unknown>;
    } catch {
      continue;
    }
    const id = o[runKey];
    if (typeof id !== "string" || id === "") continue;
    const point: LogPoint = {
      run_id: id,
      step: typeof o.step === "number" ? o.step : null,
      ts: typeof o.ts === "string" ? o.ts : "",
      workflowType: typeof o.workflowType === "string" ? o.workflowType : null,
      revision: typeof o.revision === "number" ? o.revision : null,
    };
    points.push(point);
  }
  return points;
}

function deriveStepStatus(served: LogPoint[], completed: LogPoint | null): StepStatus {
  const lastServed = served[served.length - 1];
  if (!lastServed) return "unknown";
  if (!completed) return "in_progress";
  const after = served.filter((s) => s.ts > completed.ts);
  if (after.length === 0) return lastServed.step === completed.step ? "idle" : "handoff_foreign";
  return new Set(after.map((s) => s.step)).size === 1 ? "in_progress" : "handoff_skipped";
}

function readHumanHandoff(cwd: string): string | null {
  const abs = join(cwd, HUMAN_HANDOFF_REL);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Select the active run explicitly and report every disagreement between the state file,
 * run log, handoff log, and last recorded save. A disagreeing source is never silently
 * promoted: without an explicit run_id the selection is null and the mismatch says why.
 */
export function computeActiveRun(opts: {
  cwd: string;
  run_id?: string;
  state_path?: string;
  indexPresent: boolean;
  index?: ContextIndex | null;
  env?: NodeJS.ProcessEnv;
}): { active_run: ActiveRun; consistency: Consistency } {
  const { cwd, indexPresent } = opts;
  const env = opts.env ?? process.env;
  const mismatches: ConsistencyMismatch[] = [];
  const argRun = opts.run_id?.trim() || null;

  const statePath = resolveStatePath({ arg: opts.state_path, cwd, env });
  if (statePath.error) {
    mismatches.push({ code: "state_path_rejected", severity: "error", detail: statePath.error });
  }
  const statePresent = statePath.resolved != null && existsSync(statePath.resolved);
  const stateRunId = statePresent ? readStateRunId(statePath.resolved!) : null;
  const stateMeta = statePresent ? readCheckpointMeta(statePath.resolved!) : null;
  if (statePresent && !stateMeta) {
    mismatches.push({
      code: "state_unversioned",
      severity: "info",
      detail: `${statePath.requested} has no checkpoint revision (plain save); use workflow_state_save with run_id, step, and summary for revision-checked saves.`,
    });
  }

  if (!existsSync(join(cwd, ".pncore")) && !indexPresent) {
    mismatches.push({
      code: "workspace_root_suspect",
      severity: "warn",
      detail: `No .pncore/ and no ${CONTEXT_INDEX_REL} under ${cwd}; the MCP cwd is likely not the workspace root.`,
    });
  }

  const lastSave = readLastStateSave(cwd);
  if (lastSave && statePath.resolved) {
    const savedAbs = resolveInside(cwd, lastSave.path);
    if ("resolved" in savedAbs && savedAbs.resolved !== statePath.resolved) {
      mismatches.push({
        code: "state_path_diverged",
        severity: "error",
        detail: `Last workflow_state_save (${lastSave.ts}) wrote ${lastSave.path}${lastSave.run_id ? ` for run ${lastSave.run_id}` : ""}, but this packet reads ${statePath.requested}. Pass state_path or set PNCORE_STATE_PATH.`,
      });
    }
  }

  if (statePath.source !== "default") {
    const defaultAbs = join(cwd, DEFAULT_STATE_REL);
    if (defaultAbs !== statePath.resolved && existsSync(defaultAbs)) {
      const defaultRun = readStateRunId(defaultAbs);
      if (defaultRun !== stateRunId) {
        mismatches.push({
          code: "default_state_shadowed",
          severity: "warn",
          detail: `${DEFAULT_STATE_REL} holds run ${defaultRun ?? "(none)"} while ${statePath.requested} holds ${stateRunId ?? "(none)"}; the default file is stale for this selection.`,
        });
      }
    }
  }

  const target = argRun ?? stateRunId;
  const paths = trailPaths(env);
  const servePoints = scanRunLog(paths.steps, cwd, "runId");
  let handoffPoints = scanRunLog(paths.handoff, cwd, "run_id");
  const committedRevision = stateMeta && stateMeta.run_id === target ? stateMeta.revision : null;
  if (committedRevision != null) {
    const uncommitted = handoffPoints.filter(
      (p) => p.run_id === target && p.revision != null && p.revision > committedRevision
    );
    if (uncommitted.length > 0) {
      mismatches.push({
        code: "handoff_revision_ahead",
        severity: "warn",
        detail: `${uncommitted.length} handoff line(s) for run ${target} carry a revision above the state file's revision ${committedRevision} (interrupted save); they are ignored as uncommitted.`,
      });
      handoffPoints = handoffPoints.filter((p) => !uncommitted.includes(p));
    }
  }
  const runLog = {
    newest: newestPoint(servePoints),
    forRun: target ? servePoints.filter((p) => p.run_id === target) : [],
  };
  const handoffLog = {
    newest: newestPoint(handoffPoints),
    forRun: target ? handoffPoints.filter((p) => p.run_id === target) : [],
  };
  const lastCompleted = newestPoint(handoffLog.forRun);
  const lastServed = runLog.forRun[runLog.forRun.length - 1] ?? null;
  const fromArg = argRun != null;
  const sourceSeverity = fromArg ? "warn" : "error";

  if (target && runLog.newest && runLog.newest.run_id !== target) {
    mismatches.push({
      code: "newer_run_in_log",
      severity: sourceSeverity,
      detail: `Newest workflow_step in the run log (${runLog.newest.ts}) is run ${runLog.newest.run_id}${runLog.newest.workflowType ? ` (${runLog.newest.workflowType})` : ""}, not ${target}.`,
    });
  }
  if (target && handoffLog.newest && handoffLog.newest.run_id !== target) {
    mismatches.push({
      code: "handoff_run_mismatch",
      severity: sourceSeverity,
      detail: `Newest workflow handoff (${handoffLog.newest.ts}) belongs to run ${handoffLog.newest.run_id}, not ${target}.`,
    });
  }
  if (argRun && stateRunId && argRun !== stateRunId) {
    mismatches.push({
      code: "state_run_differs",
      severity: "warn",
      detail: `run_id argument ${argRun} differs from ${statePath.requested} run ${stateRunId}.`,
    });
  }

  const stepStatus = deriveStepStatus(runLog.forRun, lastCompleted);
  if (stepStatus === "handoff_skipped") {
    mismatches.push({
      code: "handoff_skipped",
      severity: "warn",
      detail: `More than one step was served after the last handoff (step ${lastCompleted?.step}); a workflow_handoff_append was skipped.`,
    });
  } else if (stepStatus === "handoff_foreign") {
    mismatches.push({
      code: "handoff_foreign",
      severity: "warn",
      detail: `Last handoff is for step ${lastCompleted?.step} but the last served step is ${lastServed?.step}.`,
    });
  }

  const indexArtifacts = Array.isArray(opts.index?.artifacts) ? opts.index!.artifacts! : [];
  const currentId = opts.index?.pointers?.current_checkpoint;
  const currentArtifact =
    typeof currentId === "string" && currentId !== ""
      ? indexArtifacts.find((a) => a && typeof a === "object" && a.id === currentId)
      : undefined;
  const declaredCurrent =
    typeof currentId === "string" && currentId !== ""
      ? {
          artifact_id: currentId,
          run_id:
            typeof currentArtifact?.run_id === "string" && currentArtifact.run_id !== ""
              ? currentArtifact.run_id
              : null,
        }
      : null;
  if (declaredCurrent?.run_id && stateRunId && declaredCurrent.run_id !== stateRunId) {
    mismatches.push({
      code: "state_vs_declared_current",
      severity: "warn",
      detail: `context-index current_checkpoint ${declaredCurrent.artifact_id} is run ${declaredCurrent.run_id}; ${statePath.requested} holds run ${stateRunId}. Update the index or select the run explicitly.`,
    });
  }
  const historical = target
    ? indexArtifacts.find(
        (a) =>
          a &&
          typeof a === "object" &&
          a.run_id === target &&
          (a.lifecycle === "historical" || a.lifecycle === "superseded")
      )
    : undefined;
  if (historical) {
    mismatches.push({
      code: "historical_entry_selected",
      severity: "warn",
      detail: `Run ${target} belongs to context-index artifact ${historical.id} (lifecycle ${historical.lifecycle}${historical.superseded_by ? `, superseded by ${historical.superseded_by}` : ""}); treat its findings as evidence, not current blockers.`,
    });
  }

  const hasError = mismatches.some((m) => m.severity === "error");
  let runId: string | null = null;
  let runIdSource: ActiveRun["run_id_source"] = "none";
  if (argRun) {
    runId = argRun;
    runIdSource = "argument";
  } else if (stateRunId && !hasError) {
    runId = stateRunId;
    runIdSource = "state";
  }

  const candidates: RunCandidate[] = [];
  const addCandidate = (id: string | null | undefined, source: RunCandidate["source"]) => {
    if (id && !candidates.some((c) => c.run_id === id)) candidates.push({ run_id: id, source });
  };
  addCandidate(argRun, "argument");
  addCandidate(stateRunId, "state");
  addCandidate(runLog.newest?.run_id, "run_log");
  addCandidate(handoffLog.newest?.run_id, "handoff_log");
  addCandidate(lastSave?.run_id, "state_save");

  const handoffText = readHumanHandoff(cwd);
  const resume = readResumeLine(cwd);

  return {
    active_run: {
      workspace_root: cwd,
      state_path: statePath.requested,
      state_path_source: statePath.source,
      state_present: statePresent,
      state_run_id: stateRunId,
      state_revision: stateMeta?.revision ?? null,
      run_id: runId,
      run_id_source: runIdSource,
      candidates,
      workflowType: lastServed?.workflowType ?? null,
      last_served_step: lastServed?.step ?? null,
      last_served_ts: lastServed?.ts ?? null,
      last_completed_step: lastCompleted?.step ?? null,
      last_completed_ts: lastCompleted?.ts ?? null,
      step_status: stepStatus,
      handoff_run_id: handoffLog.newest?.run_id ?? null,
      resume,
      resume_run_bound: resume && runId && handoffText ? handoffText.includes(runId) : null,
      declared_current: declaredCurrent,
    },
    consistency: { ok: !hasError, mismatches },
  };
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
  const currentId =
    typeof index?.pointers?.current_checkpoint === "string"
      ? index.pointers.current_checkpoint
      : null;
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
    next_incomplete: pickNextIncomplete(reports, currentId),
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
