/**
 * Pinned verify command catalog. Agents name a commandId; the server owns argv.
 */
export type CatalogEntry = {
    commandId: string;
    argv: string[];
    detect: (cwd: string) => boolean;
};
export declare const VERIFY_CATALOG: readonly CatalogEntry[];
export declare function getCatalogEntry(commandId: string): CatalogEntry | undefined;
export declare function resolveCatalogArgv(commandId: string, cwd: string): {
    argv: string[];
} | {
    error: string;
};
