/**
 * No-shell dispose-verify execution. Jail first; never fall back to raw spawn
 * when a jail was requested and is missing.
 */
export type SandboxBackend = "bubblewrap" | "restricted" | "test" | "unavailable";
export type SpawnVerifyResult = {
    exitCode: number;
    timedOut: boolean;
    stdoutTail: string;
    stderrTail: string;
};
export declare class VerifyPolicyError extends Error {
    readonly code: "INVALID_ARGV" | "DISPOSE_UNAVAILABLE";
    constructor(code: "INVALID_ARGV" | "DISPOSE_UNAVAILABLE", message: string);
}
export declare function commandExists(name: string): boolean;
export declare function assertSafeArgv(argv: string[], opts?: {
    freeform?: boolean;
}): void;
export declare function resolveSandboxBackend(): SandboxBackend;
export declare function clampTimeoutMs(timeoutMs?: number): number;
export declare function tailOutput(buf: string): string;
export declare function buildBwrapArgv(cwd: string, argv: string[]): string[];
export declare function spawnVerify(opts: {
    argv: string[];
    cwd: string;
    timeoutMs?: number;
    backend?: SandboxBackend;
}): Promise<SpawnVerifyResult>;
export declare function sandboxLabel(backend: SandboxBackend): {
    backend: "bubblewrap" | "docker" | "seatbelt" | "unavailable";
    jailed: boolean;
};
