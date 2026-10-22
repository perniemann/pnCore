/**
 * One resolver for the workflow state file, shared by workflow_state_save / workflow_state_load
 * and project_context, so every reader and writer agrees on which file is "the" state.
 * Precedence: explicit argument > PNCORE_STATE_PATH > default. Paths must stay inside the
 * workspace (MCP cwd); a rejected path is reported, never silently replaced by the default.
 */
export declare const DEFAULT_STATE_REL = ".pncore/workflow-state.json";
export declare const STATE_SAVES_REL = ".pncore/state-saves.jsonl";
export type StatePathSource = "argument" | "env" | "default";
export type ResolvedStatePath = {
    /** Path as given (relative or absolute). */
    requested: string;
    source: StatePathSource;
    /** Absolute path; null when the path was rejected. */
    resolved: string | null;
    error?: string;
};
export declare function resolveStatePath(opts?: {
    arg?: string | null;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}): ResolvedStatePath;
export type StateSaveRecord = {
    ts: string;
    path: string;
    run_id: string | null;
};
/** Append-only record of where state was last written, so readers can detect a diverged path. */
export declare function recordStateSave(absPath: string, runId: string | null, cwd?: string): void;
export declare function readLastStateSave(cwd?: string): StateSaveRecord | null;
