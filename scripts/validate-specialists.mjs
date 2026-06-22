#!/usr/bin/env node
/**
 * Validates that config/specialists.json aligns with canonical source.
 * Canonical: packages/pn-core-mcp/content/config/specialists.json
 * Repo root config/ should match (for workspace consistency).
 * Run from repo root: node scripts/validate-specialists.mjs
 * Exit 0 if aligned; 1 if mismatch.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const contentPath = join(
  repoRoot,
  "packages",
  "pn-core-mcp",
  "content",
  "config",
  "specialists.json"
);
const rootPath = join(repoRoot, "config", "specialists.json");

if (!existsSync(contentPath)) {
  console.error("Canonical specialists.json not found at", contentPath);
  process.exit(1);
}

const canonical = JSON.parse(readFileSync(contentPath, "utf-8"));
const root = existsSync(rootPath) ? JSON.parse(readFileSync(rootPath, "utf-8")) : null;

if (!root) {
  console.warn(
    "config/specialists.json missing at repo root; run sync:content or copy from content/config/"
  );
  process.exit(0);
}

// Compare key fields that matter for routing
const canonicalKey = JSON.stringify({
  specialists: canonical.specialists,
  parallelGroups: canonical.parallelGroups || {},
  scaffolds: canonical.scaffolds,
});
const rootKey = JSON.stringify({
  specialists: root.specialists,
  parallelGroups: root.parallelGroups || {},
  scaffolds: root.scaffolds,
});

if (canonicalKey !== rootKey) {
  console.error(
    "config/specialists.json mismatch: repo root differs from packages/pn-core-mcp/content/config/"
  );
  console.error("Canonical source: packages/pn-core-mcp/content/config/specialists.json");
  console.error(
    "Align repo root config/ or run: cp packages/pn-core-mcp/content/config/specialists.json config/"
  );
  process.exit(1);
}

console.log("config/specialists.json aligned with canonical source");
process.exit(0);
