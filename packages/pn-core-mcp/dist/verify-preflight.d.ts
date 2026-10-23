/**
 * In-call preflight for workflow_verify: declared inputs, environment variables, and the
 * command are checked immediately before spawn, in the same call, so a missing dependency is
 * reported as missing_input instead of surfacing later as a behavioral test failure.
 */
import { type PreflightCheck, type PreflightEvent } from "./verify-attest.js";
export type PreflightInput = {
    path: string;
    sha256?: string;
    access?: "read" | "write" | "execute";
};
export declare function runPreflight(opts: {
    argv: string[];
    cwd: string;
    workspaceRoot: string;
    inputs?: PreflightInput[];
    env_required?: string[];
    env?: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
}): {
    ok: boolean;
    checks: PreflightCheck[];
};
/** Run the preflight checks and build the `kind: "preflight"` run event for them. */
export declare function buildPreflightEvent(opts: {
    run_id: string;
    argv: string[];
    cwd: string;
    workspaceRoot: string;
    inputs?: PreflightInput[];
    env_required?: string[];
    commandId?: string;
    candidate_id?: string;
    owner?: string;
    workflowType?: string;
    step?: number;
}): PreflightEvent;
