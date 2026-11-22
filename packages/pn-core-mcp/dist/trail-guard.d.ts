export type TrailKind = "steps" | "events" | "tickets" | "gate" | "handoff" | "usage" | "loads" | "stateSaves";
/** Workspace-relative path of every engine trail, honouring the same env overrides as the writers. */
export declare function engineTrails(env?: NodeJS.ProcessEnv): Record<TrailKind, string>;
/**
 * Null when `resolvedPath` is not an engine trail or is the caller's own trail; otherwise the
 * reason the write is refused. Paths compare after resolving symlinks.
 */
export declare function reservedTrailError(resolvedPath: string, own: TrailKind, opts?: {
    base?: string;
    env?: NodeJS.ProcessEnv;
}): string | null;
