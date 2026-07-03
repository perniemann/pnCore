#!/usr/bin/env node
/**
 * Runs deterministic PR gates: CHANGELOG/version policy + doc structure.
 * Used by .github/workflows/pn-gates.yml (check name: pn-gates).
 */
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const scripts = ["scripts/validate-changelog.mjs", "scripts/validate-doc-structure.mjs"];

for (const script of scripts) {
  const r = spawnSync(process.execPath, [join(root, script)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("pn-gates: all deterministic checks passed");
process.exit(0);
