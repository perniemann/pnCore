export declare const safeBase: any;
/**
 * Resolve symlinks on the deepest existing ancestor of `p` and re-append the missing tail.
 * A path whose parent is a symlink out of the workspace resolves to its real location.
 */
export declare function realpathDeepest(p: string, realpath?: (q: string) => string): string;
/**
 * Contain `filePath` inside `base`, lexically and after resolving symlinks, so a symlinked
 * `.pncore` (or any directory) pointing outside the workspace is rejected.
 */
export declare function resolveInside(base: string, filePath: string): {
    resolved: string;
} | {
    error: string;
};
export declare function resolveSafePath(filePath: string): {
    resolved: string;
} | {
    error: string;
};
