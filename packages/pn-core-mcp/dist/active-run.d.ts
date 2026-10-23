/**
 * Active-run selection for project_context: which run is current, and every disagreement between
 * the state file, run log, handoff log, last recorded save, and the context index.
 * A disagreeing source is never silently promoted.
 */
import { type ContextIndex, type DeclaredCurrent } from "./context-index.js";
import { type StatePathSource } from "./state-path.js";
export declare const HUMAN_HANDOFF_REL = ".pncore/handoff.md";
export type MismatchCode = "state_path_rejected" | "workspace_root_suspect" | "state_path_diverged" | "default_state_shadowed" | "newer_run_in_log" | "handoff_run_mismatch" | "state_run_differs" | "handoff_skipped" | "handoff_foreign" | "handoff_revision_ahead" | "state_unversioned" | "state_vs_declared_current" | "historical_entry_selected" | "trail_path_rejected";
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
export type Consistency = {
    ok: boolean;
    mismatches: ConsistencyMismatch[];
};
export declare function readResumeLine(cwd?: string): string | null;
/**
 * Select the active run explicitly and report every disagreement between the state file,
 * run log, handoff log, and last recorded save. Without an explicit run_id the selection is
 * null whenever an error-severity mismatch exists, and the mismatch says why.
 */
export declare function computeActiveRun(opts: {
    cwd: string;
    run_id?: string;
    state_path?: string;
    indexPresent: boolean;
    index?: ContextIndex | null;
    env?: NodeJS.ProcessEnv;
}): {
    active_run: ActiveRun;
    consistency: Consistency;
};
