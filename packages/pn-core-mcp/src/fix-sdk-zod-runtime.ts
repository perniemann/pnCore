/**
 * Before any @modelcontextprotocol/sdk load: ensure sdk's nested `node_modules/zod` resolves to a
 * complete zod package (junction/symlink or copy to hoisted root `node_modules/zod`). See npm layout
 * quirk documented in scripts/prune-sdk-nested-zod.mjs — keep detection logic aligned.
 */

import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(distDir, "..");
const nested = join(pkgRoot, "node_modules", "@modelcontextprotocol", "sdk", "node_modules", "zod");
const hoisted = join(pkgRoot, "node_modules", "zod");

function nestedZodLooksComplete(dir: string): boolean {
  return (
    existsSync(join(dir, "package.json")) &&
    existsSync(join(dir, "v3", "index.js")) &&
    existsSync(join(dir, "v4", "index.js"))
  );
}

if (!existsSync(join(hoisted, "package.json"))) {
  // Nothing to anchor to yet (pre-install); ignore.
  void nested;
} else {
  const needsFix = !existsSync(nested) || !nestedZodLooksComplete(nested);
  if (needsFix) {
    try {
      rmSync(nested, { recursive: true, force: true });
      mkdirSync(dirname(nested), { recursive: true });
      if (process.platform === "win32") {
        symlinkSync(hoisted, nested, "junction");
      } else {
        symlinkSync(hoisted, nested, "dir");
      }
    } catch {
      try {
        mkdirSync(dirname(nested), { recursive: true });
        cpSync(hoisted, nested, { recursive: true, dereference: true });
      } catch {
        /* best-effort */
      }
    }
  }
}
