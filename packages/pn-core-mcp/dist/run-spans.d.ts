/**
 * Step spans (ADR-0018): answer *where* a workflow run spent its time.
 *
 * Every `workflow_step` call is one span in a run. The span carries a monotonic `stepIndex`
 * per run_id, `sinceLastStepMs` (agent wall time since the previous step of the same run —
 * the time the agent spent doing the previous step's work), and `engineMs` (time inside
 * `getWorkflowStep` and gate checks). `get_*` loads are tagged with the stepIndex they were
 * made under, so a timeline can show which skills each step pulled.
 *
 * The cursor per run_id lives in memory (one MCP server process per session) and is
 * recovered from the run-log tail when a run_id is first seen after a restart.
 *
 * `buildRunTimeline` joins the five `.pncore/*.jsonl` trails by run_id and time window into
 * one per-step view; `workflow_run_query` exposes it.
 */
import { type RunLogEntry } from "./trajectory.js";
export type TrailId = "steps" | "loads" | "usage" | "handoff" | "gate" | "events";
/** Default path per trail, honouring the same env overrides the writers use. */
export declare function trailPaths(env?: NodeJS.ProcessEnv): Record<TrailId, string>;
export declare const TRAIL_SCAN_MAX = 786432;
export type TrailRecord = Record<string, unknown> & {
    ts: string;
};
/**
 * Tail-read one JSONL trail and return the records for `runId` (matching `run_id` or `runId`),
 * in file order. Unsafe paths return an error; a missing file returns an empty list.
 */
export declare function readTrail(relPath: string, runId: string, opts?: {
    scanMax?: number;
}): {
    records: TrailRecord[];
    path: string;
} | {
    error: string;
};
type RunCursor = {
    stepIndex: number;
    lastTsMs: number;
};
/** Test hook: forget every in-memory cursor. */
export declare function resetStepSpans(): void;
/** Rebuild the cursor for `runId` from the run-log tail (after a server restart). */
export declare function recoverCursorFromLog(runId: string, logPath: string): RunCursor | null;
export type StepSpanStart = {
    stepIndex: number;
    /** Wall time since the previous step of this run; null on the first step. */
    sinceLastStepMs: number | null;
};
/**
 * Open the span for the next `workflow_step` call of `runId`: advances the cursor and returns
 * the monotonic stepIndex plus the wall time since the previous step.
 */
export declare function beginStepSpan(runId: string, opts?: {
    nowMs?: number;
    logPath?: string;
}): StepSpanStart;
/** stepIndex of the most recent `workflow_step` seen for `runId` in this process, if any. */
export declare function currentStepIndex(runId: string | undefined): number | undefined;
/** Round engine timings to 0.01 ms; sub-microsecond noise is not information. */
export declare function roundMs(ms: number): number;
export type TimelineLoad = {
    ts: string;
    tool: string;
    id: string;
};
export type TimelineStep = {
    stepIndex: number;
    ts: string;
    step: number;
    nextStep: number;
    gate: string;
    done: boolean;
    workflowPhase?: string;
    parallel?: boolean;
    taskIds?: string[];
    sinceLastStepMs: number | null;
    engineMs: number | null;
    stateKeys: string[];
    loads: TimelineLoad[];
    verify: number;
    handoff: string | null;
    usage: {
        inputTokens: number;
        outputTokens: number;
    } | null;
    gates: number;
};
export type RunTimeline = {
    run_id: string;
    workflowType: string | null;
    startedAt: string | null;
    endedAt: string | null;
    /** First step ts → last step ts. */
    wallMs: number | null;
    done: boolean;
    steps: TimelineStep[];
    totals: {
        steps: number;
        engineMs: number;
        loads: number;
        verify: number;
        gates: number;
        inputTokens: number;
        outputTokens: number;
    };
    /** Step whose preceding agent work took longest (by sinceLastStepMs). */
    slowest: {
        stepIndex: number;
        step: number;
        sinceLastStepMs: number;
    } | null;
    accepted: boolean | null;
};
export type TimelineTrails = {
    steps: RunLogEntry[];
    loads?: TrailRecord[];
    usage?: TrailRecord[];
    handoff?: TrailRecord[];
    gate?: TrailRecord[];
    events?: TrailRecord[];
};
/** Join the trails for one run into a per-step timeline. Pure. */
export declare function buildRunTimeline(runId: string, trails: TimelineTrails): RunTimeline;
export {};
