#!/usr/bin/env node
/**
 * Validates that version is consistent across all synced files.
 * Single source of truth: root package.json.
 * Run from repo root: node scripts/validate-version.mjs
 * Exit 0 if all match; 1 if any mismatch.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const rootPkgPath = join(repoRoot, "package.json");

if (!existsSync(rootPkgPath)) {
  console.error("Root package.json not found");
  process.exit(1);
}

const rootVersion = JSON.parse(readFileSync(rootPkgPath, "utf8")).version;
if (!rootVersion) {
  console.error("No version in root package.json");
  process.exit(1);
}

const checks = [
  { path: "plugins/pnCore/.cursor-plugin/plugin.json", get: (j) => j.version },
  { path: ".cursor-plugin/plugin.json", get: (j) => j.version },
  { path: "packages/pn-core-mcp/package.json", get: (j) => j.version },
  { path: ".cursor-plugin/marketplace.json", get: (j) => j.metadata?.version },
];

let failed = 0;
for (const { path: relPath, get } of checks) {
  const fullPath = join(repoRoot, relPath);
  if (!existsSync(fullPath)) continue;
  try {
    const data = JSON.parse(readFileSync(fullPath, "utf8"));
    const v = get(data);
    if (v !== rootVersion) {
      console.error(`Version mismatch: ${relPath} has "${v}", expected "${rootVersion}"`);
      failed++;
    }
  } catch (e) {
    console.error(`Failed to read ${relPath}:`, e.message);
    failed++;
  }
}

// README # pnCore — vX.Y.Z
const readmePath = join(repoRoot, "README.md");
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, "utf8");
  const m = readme.match(/^# pnCore\s*[—-]+\s*v(\d+\.\d+\.\d+)/m);
  if (m) {
    if (m[1] !== rootVersion) {
      console.error(`Version mismatch: README.md has "v${m[1]}", expected "v${rootVersion}"`);
      failed++;
    }
  } else {
    console.error(`Version not found in README.md (expected "# pnCore — v${rootVersion}")`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nRun "npm run sync:version" to fix.`);
  process.exit(1);
}

console.log("Version consistent:", rootVersion);
process.exit(0);
