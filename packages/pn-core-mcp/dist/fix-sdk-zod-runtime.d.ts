/**
 * Before any @modelcontextprotocol/sdk load: ensure sdk's nested `node_modules/zod` resolves to a
 * complete zod package (junction/symlink or copy to hoisted root `node_modules/zod`). See npm layout
 * quirk documented in scripts/prune-sdk-nested-zod.mjs — keep detection logic aligned.
 */
export {};
