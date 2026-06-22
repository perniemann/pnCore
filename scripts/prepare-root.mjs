#!/usr/bin/env node
/**
 * Root prepare hook: sync version; build MCP only when dist is missing (git/npx consumers
 * ship prebuilt dist — skip the expensive build:mcp path).
 */
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = join(root, "packages", "pn-core-mcp", "dist", "index.js");

spawnSync(process.execPath, ["scripts/sync-version.mjs"], { cwd: root, stdio: "inherit" });

if (existsSync(distEntry)) {
  process.exit(0);
}

console.log("prepare-root: dist missing — running build:mcp (source checkout)");
const build = spawnSync("npm", ["run", "build:mcp"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(build.status ?? 1);
