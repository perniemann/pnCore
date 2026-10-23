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
    signal: string | null;
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
/**
 * The only environment a verify child sees, on every backend: a fixed minimal set plus the
 * names the caller declared in env_required. Values travel in the spawn env (owner-readable
 * /proc/<pid>/environ), never in argv (world-readable cmdline).
 */
export declare function verifyChildEnv(cwd: string, passEnv?: readonly string[], source?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export declare function spawnVerify(opts: {
    argv: string[];
    cwd: string;
    timeoutMs?: number;
    backend?: SandboxBackend;
    passEnv?: readonly string[];
}): Promise<SpawnVerifyResult>;
/** A spawn that never started, as a receipt: ENOENT → 127 and EACCES → 126, like a shell. */
export declare function spawnFailureResult(err: unknown): SpawnVerifyResult & {
    spawnErrorCode: string;
    spawnError: string;
};
export declare function sandboxLabel(backend: SandboxBackend): {
    backend: "bubblewrap" | "docker" | "seatbelt" | "unavailable";
    jailed: boolean;
};
