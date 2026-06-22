/**
 * Structured stderr-only debug logger.
 *
 * Enabled by PNCORE_DEBUG env var:
 *   - PNCORE_DEBUG=*             → all channels
 *   - PNCORE_DEBUG=features,workflows → specific channels only
 *   - (unset)                      → no output, zero overhead
 *
 * Writes JSON lines to stderr ONLY — never stdout, which carries JSON-RPC framing.
 * Channel names align with the ErrorCode namespace so debug lines and tool errors
 * share vocabulary (features, workflows, trace, content, tickets).
 *
 * Env is read lazily on first call (and cached) so tests can set/clear
 * PNCORE_DEBUG with vi.stubEnv without resetting modules.
 */
/** Test-only: drop the cached config so the next call re-reads env. */
export declare function __resetDebugConfigForTests(): void;
/**
 * Emit one structured JSON line to stderr for the given channel.
 * No-ops when PNCORE_DEBUG is unset (zero overhead on hot paths).
 */
export declare function debug(channel: string, msg: string, extra?: Record<string, unknown>): void;
