/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */
import { type StatePathSource } from "./state-path.js";
import { type RunEvent } from "./verify-attest.js";
export declare const CONTEXT_INDEX_REL = "docs/refs/context-index.json";
export declare const HUMAN_HANDOFF_REL = ".pncore/handoff.md";
export declare const WORKFLOW_STATE_REL = ".pncore/workflow-state.json";
export declare const WORKFLOW_HANDOFF_REL = ".pncore/workflow-handoff.jsonl";
export declare const ARTIFACT_TYPES: readonly ["discovery", "plan", "prd", "design", "workflow", "convention"];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type AuthoredStatus = string | null | undefined;
export type ContextArtifact = {
    id: string;
    type: ArtifactType;
    path: string;
    tracker?: string | null;
    authored_status?: AuthoredStatus;
    run_id?: string | null;
};
export type ContextIndex = {
    version: string;
    last_reviewed: string;
    pointers?: Record<string, string | null | undefined>;
    artifacts?: ContextArtifact[];
    acceptance_criteria_ids?: string[];
    verify?: Array<{
        command: string;
        expect: string;
    }>;
};
export type DerivedStatus = "ok" | "missing" | "complete_attested" | "drift" | "in_progress" | "unattested";
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
};
export type TrailLine = {
    source: "workflow_handoff" | "run_events";
    ts: string;
    summary: string;
};
/** Compact alias table for project_context (ADR-0013 / ADR-0017). Not the full skill. */
export type ResponseAlias = {
    alias: string;
    expand: string;
};
export declare const RESPONSE_ALIASES: readonly ResponseAlias[];
export type MismatchCode = "state_path_rejected" | "workspace_root_suspect" | "state_path_diverged" | "default_state_shadowed" | "newer_run_in_log" | "handoff_run_mismatch" | "state_run_differs" | "handoff_skipped" | "handoff_foreign";
export type ConsistencyMismatch = {
    code: MismatchCode;
    severity: "error" | "warn";
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
};
export type Consistency = {
    ok: boolean;
    mismatches: ConsistencyMismatch[];
};
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
export declare function loadContextIndex(cwd?: string): {
    index: ContextIndex | null;
    path: string;
    present: boolean;
};
/** run_id from the resolved state file (argument > PNCORE_STATE_PATH > default). */
export declare function readActiveRunId(cwd?: string, statePath?: string): string | null;
export declare function readResumeLine(cwd?: string): string | null;
/** Read run-events for a run_id under an arbitrary cwd (tests + MCP handler). */
export declare function loadRunEventsForCwd(run_id: string, cwd?: string, limit?: number): RunEvent[];
export declare function deriveArtifactStatus(artifact: ContextArtifact, cwd?: string, eventsByRunId?: Map<string, RunEvent[]>): ArtifactReport;
/**
 * Select the active run explicitly and report every disagreement between the state file,
 * run log, handoff log, and last recorded save. A disagreeing source is never silently
 * promoted: without an explicit run_id the selection is null and the mismatch says why.
 */
export declare function computeActiveRun(opts: {
    cwd: string;
    run_id?: string;
    state_path?: string;
    indexPresent: boolean;
    env?: NodeJS.ProcessEnv;
}): {
    active_run: ActiveRun;
    consistency: Consistency;
};
export type BuildProjectContextOpts = {
    mode?: "operator" | "agent";
    run_id?: string;
    state_path?: string;
    max_trail?: number;
    cwd?: string;
};
export declare function buildProjectContextPacket(opts?: BuildProjectContextOpts): ProjectContextPacket;
