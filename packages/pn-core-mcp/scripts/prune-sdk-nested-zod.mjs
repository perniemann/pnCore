#!/usr/bin/env node
/**
 * npm can leave `@modelcontextprotocol/sdk/node_modules/zod` incomplete (directories only).
 * Replace with junction/symlink to hoisted `node_modules/zod`, or recursive copy fallback.
 * Keep `nestedZodLooksComplete` aligned with src/fix-sdk-zod-runtime.ts.
 */
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nested = join(
  pkgRoot,
  "node_modules",
  "@modelcontextprotocol",
  "sdk",
  "node_modules",
  "zod",
);
const hoisted = join(pkgRoot, "node_modules", "zod");

/** @returns {boolean} */
function nestedZodLooksComplete(dir) {
  return (
    existsSync(join(dir, "package.json")) &&
    existsSync(join(dir, "v3", "index.js")) &&
    existsSync(join(dir, "v4", "index.js"))
  );
}

if (!existsSync(join(hoisted, "package.json"))) {
  process.exit(0);
}

const needsFix = !existsSync(nested) || !nestedZodLooksComplete(nested);

if (!needsFix) {
  process.exit(0);
}

try {
  rmSync(nested, { recursive: true, force: true });
  mkdirSync(dirname(nested), { recursive: true });
  if (process.platform === "win32") {
    symlinkSync(hoisted, nested, "junction");
  } else {
    symlinkSync(hoisted, nested, "dir");
  }
  console.warn("linked sdk/node_modules/zod → hoisted zod");
} catch (e1) {
  try {
    mkdirSync(dirname(nested), { recursive: true });
    cpSync(hoisted, nested, { recursive: true, dereference: true });
    console.warn("copied hoisted zod → sdk nest");
  } catch (e2) {
    console.warn("pn-core-mcp fix-sdk-zod:", e1?.message ?? e1, "|", e2?.message ?? e2);
    process.exit(0);
  }
}
