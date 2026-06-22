/**
 * Bounded tail-read for append-only JSONL logs.
 *
 * Used by workflow_usage_totals and workflow_handoff_read to cap memory when
 * scanning workflow logs that may grow unboundedly across runs.
 */
import { closeSync, openSync, readFileSync, readSync, statSync } from "fs";
/**
 * Read at most `maxBytes` from the end of `resolvedPath` as UTF-8.
 * If the file is smaller than `maxBytes`, the entire file is returned.
 *
 * Caller is responsible for splitting on newlines; the first line of a tail
 * read may be a partial line if the file exceeded `maxBytes` and that line
 * should be discarded by the caller (JSON.parse will fail and skip it).
 */
export function readFileTail(resolvedPath, maxBytes) {
    const st = statSync(resolvedPath);
    if (st.size <= maxBytes)
        return readFileSync(resolvedPath, "utf-8");
    const fd = openSync(resolvedPath, "r");
    try {
        const len = Math.min(maxBytes, st.size);
        const buf = Buffer.alloc(len);
        readSync(fd, buf, 0, len, st.size - len);
        return buf.toString("utf-8");
    }
    finally {
        closeSync(fd);
    }
}
/** Parse an env-driven byte cap with a safe minimum and a default. */
export function tailScanBytesFromEnv(envValue, defaultBytes, minBytes = 4096) {
    const n = parseInt(envValue ?? "", 10);
    return Number.isFinite(n) && n > minBytes ? n : defaultBytes;
}
