/**
 * Project context packet for cold-session coherence (MCP pull, not hook inject).
 * Reads docs/refs/context-index.json + .pncore JSONL trails; derives status from attestations.
 */
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
    drift: ArtifactReport[];
    next_incomplete: ArtifactReport | null;
    artifacts?: ArtifactReport[];
    trail?: TrailLine[];
    pointers?: Record<string, string | null | undefined>;
};
export declare function loadContextIndex(cwd?: string): {
    index: ContextIndex | null;
    path: string;
    present: boolean;
};
export declare function readActiveRunId(cwd?: string): string | null;
export declare function readResumeLine(cwd?: string): string | null;
/** Read run-events for a run_id under an arbitrary cwd (tests + MCP handler). */
export declare function loadRunEventsForCwd(run_id: string, cwd?: string, limit?: number): RunEvent[];
export declare function deriveArtifactStatus(artifact: ContextArtifact, cwd?: string, eventsByRunId?: Map<string, RunEvent[]>): ArtifactReport;
export type BuildProjectContextOpts = {
    mode?: "operator" | "agent";
    run_id?: string;
    max_trail?: number;
    cwd?: string;
};
export declare function buildProjectContextPacket(opts?: BuildProjectContextOpts): ProjectContextPacket;
