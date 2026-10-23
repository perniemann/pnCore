/**
 * Server-written verify attestations. Agents cannot invent kind=verify rows.
 */
import type { AcceptanceScope } from "./acceptance.js";
/**
 * Why a verify did not pass. Diagnostic only: gates still pass on exit 0 alone, and no class
 * refunds an attempt or relaxes a gate.
 * - missing_input: the command or a declared input/env was absent or not executable
 *   (exit 126/127, spawn ENOENT/EACCES, preflight)
 * - infrastructure: timeout, signal, or spawn failure other than a missing command
 * - behavioral: the command ran and exited non-zero
 */
export type FailureClass = "none" | "missing_input" | "infrastructure" | "behavioral";
export declare function classifyVerify(r: {
    exitCode: number;
    timedOut: boolean;
    signal?: string | null;
    spawnErrorCode?: string | null;
}): FailureClass;
export type PreflightCheck = {
    kind: "command" | "input" | "env";
    target: string;
    ok: boolean;
    reason?: string;
};
export type PreflightEvent = {
    kind: "preflight";
    run_id: string;
    ts: string;
    preflightId: string;
    ok: boolean;
    failureClass: "none" | "missing_input";
    checks: PreflightCheck[];
    argv: string[];
    cwd: string;
    commandId?: string;
    candidate_id?: string;
    owner?: string;
    workflowType?: string;
    step?: number;
};
export type GateReport = {
    kind: "verify";
    run_id: string;
    commandId?: string;
    argv: string[];
    cwd: string;
    exitCode: number;
    timedOut: boolean;
    stdoutTail: string;
    stderrTail: string;
    startedAt: string;
    finishedAt: string;
    attestationId: string;
    candidate_id?: string;
    workflowType?: string;
    step?: number;
    sandbox: {
        backend: "bubblewrap" | "docker" | "seatbelt" | "unavailable";
        jailed: boolean;
    };
    failureClass?: FailureClass;
    signal?: string | null;
    spawnError?: string;
    preflightId?: string;
    owner?: string;
};
export type RunEvent = GateReport | PreflightEvent | {
    kind: "acceptance";
    run_id: string;
    ts: string;
    workflowType: string;
    step: number;
    phasesPassed: boolean;
    verifyEarned: boolean;
    humanEarned: boolean;
    accepted: boolean;
    reasons: string[];
    scope?: AcceptanceScope;
};
export declare function defaultRunEventsPath(): string;
export declare function newAttestationId(): string;
export declare function appendRunEvent(event: RunEvent, filePath?: string): {
    path: string;
} | {
    error: string;
};
export declare function readRunEvents(run_id: string, opts?: {
    path?: string;
    kinds?: string[];
    limit?: number;
}): {
    events: RunEvent[];
    path: string;
} | {
    error: string;
};
export declare function loadGateReport(attestationId: string, filePath?: string): GateReport | undefined;
export declare function gatePassed(report: GateReport): boolean;
