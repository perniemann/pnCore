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
 * Names the operator lets a verify command receive: PNCORE_VERIFY_PASS_ENV (comma-separated)
 * in the MCP server env. PNCORE_* names (the approval token among them) are never forwarded,
 * because the command's output returns to the caller.
 */
export declare function forwardableEnvNames(source?: NodeJS.ProcessEnv): Set<string>;
/**
 * The only environment a verify child sees, on every backend: a fixed minimal set plus the
 * env_required names the operator allows. Values travel in the spawn env (owner-readable
 * /proc/<pid>/environ), never in argv (world-readable cmdline).
 */
export declare function verifyChildEnv(cwd: string, passEnv?: readonly string[], source?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
/** Replace every forwarded value that appears in `text` with `[REDACTED:<name>]`. */
export declare function redactForwarded(text: string, passEnv: readonly string[], childEnv: NodeJS.ProcessEnv): string;
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
