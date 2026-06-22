/**
 * Bounded tail-read for append-only JSONL logs.
 *
 * Used by workflow_usage_totals and workflow_handoff_read to cap memory when
 * scanning workflow logs that may grow unboundedly across runs.
 */
/**
 * Read at most `maxBytes` from the end of `resolvedPath` as UTF-8.
 * If the file is smaller than `maxBytes`, the entire file is returned.
 *
 * Caller is responsible for splitting on newlines; the first line of a tail
 * read may be a partial line if the file exceeded `maxBytes` and that line
 * should be discarded by the caller (JSON.parse will fail and skip it).
 */
export declare function readFileTail(resolvedPath: string, maxBytes: number): string;
/** Parse an env-driven byte cap with a safe minimum and a default. */
export declare function tailScanBytesFromEnv(envValue: string | undefined, defaultBytes: number, minBytes?: number): number;
