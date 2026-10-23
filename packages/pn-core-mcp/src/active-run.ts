/**
 * Active-run selection for project_context: which run is current, and every disagreement between
 * the state file, run log, handoff log, last recorded save, and the context index.
 * A disagreeing source is never silently promoted.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { readCheckpointMeta } from "./checkpoint.js";
import {
  CONTEXT_INDEX_REL,
  declaredCurrent as readDeclaredCurrent,
  historicalArtifactForRun,
  readJsonSafe,
  type ContextIndex,
  type DeclaredCurrent,
} from "./context-index.js";
import { readFileTail } from "./file-tail.js";
import { trailPaths } from "./run-spans.js";
import { resolveInside } from "./safe-path.js";
import {
  DEFAULT_STATE_REL,
  readLastStateSave,
  resolveStatePath,
  type StatePathSource,
} from "./state-path.js";

export const HUMAN_HANDOFF_REL = ".pncore/handoff.md";

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
  | "historical_entry_selected"
  | "trail_path_rejected";

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
  declared_current: DeclaredCurrent | null;
};

export type Consistency = { ok: boolean; mismatches: ConsistencyMismatch[] };

function readStateRunId(absPath: string): string | null {
  const raw = readJsonSafe(absPath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as Record<string, unknown>;
  if (typeof state.run_id === "string" && state.run_id.trim() !== "") return state.run_id;
  return null;
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

export function readResumeLine(cwd: string = process.cwd()): string | null {
  const text = readHumanHandoff(cwd);
  if (text == null) return null;
  const resumeMatch = text.match(/##\s*Resume here\s*\n+([^\n#]+)/i);
  if (resumeMatch?.[1]) return resumeMatch[1].trim().slice(0, 400);
  const statusMatch = text.match(/##\s*Status\s*\n+([^\n#]+)/i);
  if (statusMatch?.[1]) return statusMatch[1].trim().slice(0, 400);
  const first = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  return first ? first.slice(0, 400) : null;
}

function namesRun(text: string, runId: string): boolean {
  const escaped = runId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\w-])${escaped}($|[^\\w-])`).test(text);
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

/** Every point in a run-log or handoff JSONL file, in file order; rejected paths are reported. */
function scanRunLog(
  rel: string,
  cwd: string,
  runKey: "runId" | "run_id"
): { points: LogPoint[]; error?: string } {
  const safe = resolveInside(cwd, rel);
  if ("error" in safe) return { points: [], error: `${safe.error}: ${rel}` };
  if (!existsSync(safe.resolved)) return { points: [] };
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
    points.push({
      run_id: id,
      step: typeof o.step === "number" ? o.step : null,
      ts: typeof o.ts === "string" ? o.ts : "",
      workflowType: typeof o.workflowType === "string" ? o.workflowType : null,
      revision: typeof o.revision === "number" ? o.revision : null,
    });
  }
  return { points };
}

function deriveStepStatus(served: LogPoint[], completed: LogPoint | null): StepStatus {
  const lastServed = newestPoint(served);
  if (!lastServed) return "unknown";
  if (!completed) return "in_progress";
  const after = served.filter((s) => s.ts > completed.ts);
  if (after.length === 0) return lastServed.step === completed.step ? "idle" : "handoff_foreign";
  return new Set(after.map((s) => s.step)).size === 1 ? "in_progress" : "handoff_skipped";
}

/**
 * Select the active run explicitly and report every disagreement between the state file,
 * run log, handoff log, and last recorded save. Without an explicit run_id the selection is
 * null whenever an error-severity mismatch exists, and the mismatch says why.
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
  const serveScan = scanRunLog(paths.steps, cwd, "runId");
  const handoffScan = scanRunLog(paths.handoff, cwd, "run_id");
  const eventsSafe = resolveInside(cwd, paths.events);
  const eventsError = "error" in eventsSafe ? `${eventsSafe.error}: ${paths.events}` : undefined;
  for (const err of [serveScan.error, handoffScan.error, eventsError]) {
    if (err) mismatches.push({ code: "trail_path_rejected", severity: "warn", detail: err });
  }
  const servePoints = serveScan.points;
  let handoffPoints = handoffScan.points;
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
  const runLogNewest = newestPoint(servePoints);
  const servedForRun = target ? servePoints.filter((p) => p.run_id === target) : [];
  const handoffNewest = newestPoint(handoffPoints);
  const lastCompleted = newestPoint(target ? handoffPoints.filter((p) => p.run_id === target) : []);
  const lastServed = newestPoint(servedForRun);
  const sourceSeverity = argRun != null ? "warn" : "error";

  if (target && runLogNewest && runLogNewest.run_id !== target) {
    mismatches.push({
      code: "newer_run_in_log",
      severity: sourceSeverity,
      detail: `Newest workflow_step in the run log (${runLogNewest.ts}) is run ${runLogNewest.run_id}${runLogNewest.workflowType ? ` (${runLogNewest.workflowType})` : ""}, not ${target}.`,
    });
  }
  if (target && handoffNewest && handoffNewest.run_id !== target) {
    mismatches.push({
      code: "handoff_run_mismatch",
      severity: sourceSeverity,
      detail: `Newest workflow handoff (${handoffNewest.ts}) belongs to run ${handoffNewest.run_id}, not ${target}.`,
    });
  }
  if (argRun && stateRunId && argRun !== stateRunId) {
    mismatches.push({
      code: "state_run_differs",
      severity: "warn",
      detail: `run_id argument ${argRun} differs from ${statePath.requested} run ${stateRunId}.`,
    });
  }

  const stepStatus = deriveStepStatus(servedForRun, lastCompleted);
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

  const declared = readDeclaredCurrent(opts.index);
  if (declared?.run_id && stateRunId && declared.run_id !== stateRunId) {
    mismatches.push({
      code: "state_vs_declared_current",
      severity: "warn",
      detail: `context-index current_checkpoint ${declared.artifact_id} is run ${declared.run_id}; ${statePath.requested} holds run ${stateRunId}. Update the index or select the run explicitly.`,
    });
  }
  const historical = historicalArtifactForRun(opts.index, target);
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
  addCandidate(runLogNewest?.run_id, "run_log");
  addCandidate(handoffNewest?.run_id, "handoff_log");
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
      handoff_run_id: handoffNewest?.run_id ?? null,
      resume,
      resume_run_bound: resume && runId && handoffText ? namesRun(handoffText, runId) : null,
      declared_current: declared,
    },
    consistency: { ok: !hasError, mismatches },
  };
}
