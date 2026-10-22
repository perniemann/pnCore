/**
 * Checkpoint commit protocol for workflow_state_save commit mode (ADR-0022).
 *
 * One save binds state, run, step, and a handoff line under a revision number:
 *   lock → read prior revision → check expected_revision and run binding → append handoff
 *   line (revision N+1, stateHash) → optional history line (prior state) → atomic state write
 *   (the commit point) → read back → unlock.
 *
 * The state rename is the only commit point. A handoff line whose revision is above the state
 * file's revision is uncommitted (the save was interrupted between the append and the rename);
 * readers ignore it, so an interrupted save leaves the prior state and handoff consistent.
 */
export declare const META_KEY = "_pncore";
export declare const HANDOFF_SUMMARY_LIMIT = 4000;
export declare const LOCK_STALE_MS = 30000;
export type CheckpointMeta = {
    revision: number;
    run_id: string;
    step: number;
    savedAt: string;
    stateHash: string;
};
export declare function sha256(text: string): string;
/** Hash of the routing state (envelope excluded, key order irrelevant). */
export declare function hashState(state: Record<string, unknown>): string;
/** Split a stored state object into routing state and the persistence envelope. */
export declare function splitState(raw: Record<string, unknown>): {
    state: Record<string, unknown>;
    meta: CheckpointMeta | null;
};
/** Envelope of a state file, or null when the file is missing, unparsable, or unversioned. */
export declare function readCheckpointMeta(absPath: string): CheckpointMeta | null;
export type CommitErrorCode = "REVISION_CONFLICT" | "RUN_MISMATCH" | "LOCKED" | "IO_ERROR";
export type CommitInput = {
    statePath: string;
    handoffPath: string;
    historyPath?: string;
    state: Record<string, unknown>;
    run_id: string;
    step: number;
    summary: string;
    expected_revision?: number;
};
export type CommitSuccess = {
    ok: true;
    revision: number;
    previous_revision: number;
    run_id: string;
    step: number;
    stateHash: string;
    handoffHash: string;
    path: string;
    handoff_path: string;
    history_path?: string;
    readBack: {
        revision: number;
        stateHash: string;
        run_id: string;
    };
};
export type CommitFailure = {
    ok: false;
    code: CommitErrorCode;
    message: string;
    current_revision?: number;
    current_run_id?: string | null;
};
export type CommitDeps = {
    now?: () => Date;
    lockStaleMs?: number;
    /** Test seam: runs after the handoff append, before the state commit. */
    beforeCommit?: () => void;
    /** Test seam: runs after the state commit, before the read-back. */
    afterCommit?: () => void;
};
export declare function commitCheckpoint(input: CommitInput, deps?: CommitDeps): CommitSuccess | CommitFailure;
