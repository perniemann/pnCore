export declare const safeBase: string;
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
