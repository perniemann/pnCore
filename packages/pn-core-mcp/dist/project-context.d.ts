/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */
import { type ActiveRun, type Consistency } from "./active-run.js";
import { type ArtifactLifecycle, type ArtifactType, type ContextArtifact } from "./context-index.js";
import { type RunEvent } from "./verify-attest.js";
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
export type ResponseAlias = {
    alias: string;
    expand: string;
};
export declare const RESPONSE_ALIASES: readonly ResponseAlias[];
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
/** Read run-events for a run_id under an arbitrary cwd (tests + MCP handler). */
export declare function loadRunEventsForCwd(run_id: string, cwd?: string, limit?: number): RunEvent[];
export declare function deriveArtifactStatus(artifact: ContextArtifact, cwd?: string, eventsByRunId?: Map<string, RunEvent[]>): ArtifactReport;
export type BuildProjectContextOpts = {
    mode?: "operator" | "agent";
    run_id?: string;
    state_path?: string;
    max_trail?: number;
    cwd?: string;
};
export declare function buildProjectContextPacket(opts?: BuildProjectContextOpts): ProjectContextPacket;
