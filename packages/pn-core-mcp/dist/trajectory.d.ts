/**
 * Deterministic trajectory replay (ADR-0019).
 *
 * A trajectory is the ordered sequence of `workflow_step` calls for one run_id together with
 * the routing the engine produced for each call (nextStep, gate, done, phase, parallel tasks).
 * Trajectories are recorded from `.pncore/workflow-runs.jsonl` (with `PNCORE_RUN_LOG_STATE=1`
 * so state values are present) and replayed through `getWorkflowStep` in CI. The grade is
 * exact-match on routing; instruction text is only checked for opted-in substrings.
 *
 * Nothing here calls an LLM. This module is pure apart from `getWorkflowStep`.
 */
import { type GateType, type WorkflowType } from "./workflows.js";
export type RunLogEntry = {
    ts: string;
    runId?: string;
    workflowType: WorkflowType;
    step: number;
    nextStep: number;
    gate: GateType;
    done: boolean;
    workflowPhase?: string;
    parallel?: boolean;
    taskIds?: string[];
    /** Step-span fields (ADR-0018); absent in logs written before spans existed. */
    stepIndex?: number;
    sinceLastStepMs?: number | null;
    engineMs?: number;
    stateKeys: string[];
    /** Present when the server ran with PNCORE_RUN_LOG_STATE=1. */
    state?: Record<string, unknown>;
};
export declare const RUN_LOG_STATE_ENV = "PNCORE_RUN_LOG_STATE";
export declare const RUN_LOG_STATE_MAX_STRING = 240;
export declare const RUN_LOG_STATE_MAX_DEPTH = 6;
export declare function runLogStateEnabled(env?: NodeJS.ProcessEnv): boolean;
/**
 * Copy of `state` safe to append to the run log: long strings are head-capped, tickets and
 * tokens are redacted, depth is bounded. Routing-relevant values (booleans, enums, short ids,
 * array membership, object keys) survive unchanged, which is what replay needs.
 */
export declare function snapshotStateForLog(state: Record<string, unknown>, opts?: {
    maxString?: number;
    maxDepth?: number;
}): Record<string, unknown>;
export declare function parseRunLog(text: string): {
    entries: RunLogEntry[];
    skipped: number;
};
export declare const UNKNOWN_RUN_ID = "(no runId)";
/** Group entries by runId, each group ordered by `ts` then file order. */
export declare function groupRunLogByRun(entries: RunLogEntry[]): Map<string, RunLogEntry[]>;
export type TrajectoryExpect = {
    nextStep: number;
    gate: GateType;
    done: boolean;
    workflowPhase?: string;
    parallel?: boolean;
    /** Task ids when the step fans out (`tasks[].id`), order-insensitive. */
    taskIds?: string[];
    /** Substrings that must appear in `instruction`. */
    instructionContains?: string[];
};
/** A step the engine must reject; `error` is a substring of the engine's error message. */
export type TrajectoryExpectError = {
    error: string;
};
export type TrajectoryStep = {
    step: number;
    state: Record<string, unknown>;
    expect: TrajectoryExpect | TrajectoryExpectError;
    /** Free-text note for reviewers (why this call happened). */
    note?: string;
};
export type Trajectory = {
    name: string;
    workflowType: WorkflowType;
    source: "recorded" | "authored";
    runId?: string;
    recordedAt?: string;
    steps: TrajectoryStep[];
};
export declare function isErrorExpect(e: TrajectoryExpect | TrajectoryExpectError): e is TrajectoryExpectError;
/**
 * Build a trajectory from one run's log entries. Every entry must carry `state`, otherwise
 * replay would only see key names and routing on values would be unverifiable.
 */
export declare function trajectoryFromRunLog(entries: RunLogEntry[], opts: {
    name: string;
    runId?: string;
}): Trajectory;
export type TrajectoryMismatch = {
    index: number;
    step: number;
    field: string;
    expected: unknown;
    actual: unknown;
};
export type ReplayResult = {
    name: string;
    workflowType: WorkflowType;
    stepsReplayed: number;
    mismatches: TrajectoryMismatch[];
    ok: boolean;
};
/** Replay every step through `getWorkflowStep` and diff routing against the recorded expectations. */
export declare function replayTrajectory(t: Trajectory): ReplayResult;
/**
 * Structural checks independent of the engine: the workflow exists, every step index is in
 * range, and each call continues from the previous routing (same step after an error or a
 * same-step phase, else the recorded nextStep). Returns human-readable problems.
 */
export declare function checkTrajectoryContinuity(t: Trajectory): string[];
/** Parse and validate a fixture object; throws with a precise message on shape errors. */
export declare function parseTrajectory(raw: unknown, sourceLabel?: string): Trajectory;
/** One-line summary used by the CLI and test names. */
export declare function describeTrajectory(t: Trajectory): string;
