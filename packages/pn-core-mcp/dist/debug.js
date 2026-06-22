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
let _cfg = null;
function readConfig() {
    const raw = process.env.PNCORE_DEBUG?.trim() ?? "";
    const enabled = raw !== "";
    const all = raw === "*";
    const channels = all
        ? null
        : new Set(raw
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean));
    return { enabled, all, channels, raw };
}
function getConfig() {
    if (_cfg !== null && _cfg.raw === (process.env.PNCORE_DEBUG?.trim() ?? "")) {
        return _cfg;
    }
    _cfg = readConfig();
    return _cfg;
}
/** Test-only: drop the cached config so the next call re-reads env. */
export function __resetDebugConfigForTests() {
    _cfg = null;
}
/**
 * Emit one structured JSON line to stderr for the given channel.
 * No-ops when PNCORE_DEBUG is unset (zero overhead on hot paths).
 */
export function debug(channel, msg, extra) {
    const cfg = getConfig();
    if (!cfg.enabled)
        return;
    if (!cfg.all && !cfg.channels.has(channel))
        return;
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        channel,
        msg,
        ...extra,
    });
    process.stderr.write(line + "\n");
}
