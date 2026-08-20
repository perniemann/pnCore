/**
 * Server-written verify attestations. Agents cannot invent kind=verify rows.
 */
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
};
export type RunEvent = GateReport | {
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
