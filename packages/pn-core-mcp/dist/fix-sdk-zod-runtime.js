/**
 * Before any @modelcontextprotocol/sdk load: ensure sdk's nested `node_modules/zod` resolves to a
 * complete zod package (junction/symlink or copy to hoisted root `node_modules/zod`). See npm layout
 * quirk documented in scripts/prune-sdk-nested-zod.mjs — keep detection logic aligned.
 */
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
function nestedZodLooksComplete(dir) {
    return (existsSync(join(dir, "package.json")) &&
        existsSync(join(dir, "v3", "index.js")) &&
        existsSync(join(dir, "v4", "index.js")));
}
/**
 * Repair `<pkgRoot>/node_modules/@modelcontextprotocol/sdk/node_modules/zod` when it is missing or
 * incomplete. Exported so tests cover every branch without depending on the install layout.
 */
export function ensureSdkNestedZod(pkgRoot, opts = {}) {
    const platform = opts.platform ?? process.platform;
    const link = opts.link ?? symlinkSync;
    const nested = join(pkgRoot, "node_modules", "@modelcontextprotocol", "sdk", "node_modules", "zod");
    const hoisted = join(pkgRoot, "node_modules", "zod");
    // Nothing to anchor to yet (pre-install); ignore.
    if (!existsSync(join(hoisted, "package.json")))
        return "no_hoisted";
    if (existsSync(nested) && nestedZodLooksComplete(nested))
        return "complete";
    try {
        rmSync(nested, { recursive: true, force: true });
        mkdirSync(dirname(nested), { recursive: true });
        link(hoisted, nested, platform === "win32" ? "junction" : "dir");
        return "linked";
    }
    catch {
        try {
            mkdirSync(dirname(nested), { recursive: true });
            cpSync(hoisted, nested, { recursive: true, dereference: true });
            return "copied";
        }
        catch {
            /* best-effort */
            return "failed";
        }
    }
}
ensureSdkNestedZod(join(dirname(fileURLToPath(import.meta.url)), ".."));
