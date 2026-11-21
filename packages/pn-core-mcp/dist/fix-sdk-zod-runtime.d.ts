/**
 * Before any @modelcontextprotocol/sdk load: ensure sdk's nested `node_modules/zod` resolves to a
 * complete zod package (junction/symlink or copy to hoisted root `node_modules/zod`). See npm layout
 * quirk documented in scripts/prune-sdk-nested-zod.mjs — keep detection logic aligned.
 */
import { symlinkSync } from "node:fs";
export type NestedZodOutcome = "no_hoisted" | "complete" | "linked" | "copied" | "failed";
/**
 * Repair `<pkgRoot>/node_modules/@modelcontextprotocol/sdk/node_modules/zod` when it is missing or
 * incomplete. Exported so tests cover every branch without depending on the install layout.
 */
export declare function ensureSdkNestedZod(pkgRoot: string, opts?: {
    platform?: NodeJS.Platform;
    link?: typeof symlinkSync;
}): NestedZodOutcome;
