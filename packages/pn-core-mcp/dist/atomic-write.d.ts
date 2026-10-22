/**
 * Crash-safe file replacement: unique temp file in the target directory, fsync, rename.
 * POSIX rename(2) is atomic. On Windows a rename onto a file that antivirus or the search
 * indexer holds open fails transiently with EPERM / EBUSY / EACCES, so only there, and only
 * for those codes, the rename is retried with bounded backoff.
 */
export declare const RENAME_MAX_ATTEMPTS = 10;
export type AtomicWriteDeps = {
    platform?: NodeJS.Platform;
    rename?: (from: string, to: string) => void;
    sleep?: (ms: number) => void;
};
export declare function renameWithRetry(from: string, to: string, deps?: AtomicWriteDeps): void;
/** Replace `path` with `data` so readers see either the old or the new content, never a mix. */
export declare function writeFileAtomic(path: string, data: string, deps?: AtomicWriteDeps): void;
