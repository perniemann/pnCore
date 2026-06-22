#!/usr/bin/env node
/**
 * Validates that config/stacks.json aligns with canonical source.
 * Canonical: packages/pn-core-mcp/content/config/stacks.json
 * Repo root config/ should match (for workspace consistency).
 * Run from repo root: node scripts/validate-stacks.mjs
 * Exit 0 if aligned; 1 if mismatch.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const contentPath = join(repoRoot, "packages", "pn-core-mcp", "content", "config", "stacks.json");
const rootPath = join(repoRoot, "config", "stacks.json");

if (!existsSync(contentPath)) {
  console.error("Canonical stacks.json not found at", contentPath);
  process.exit(1);
}

const canonical = JSON.parse(readFileSync(contentPath, "utf-8"));
const root = existsSync(rootPath) ? JSON.parse(readFileSync(rootPath, "utf-8")) : null;

if (!root) {
  console.warn(
    "config/stacks.json missing at repo root; run sync:content or copy from content/config/"
  );
  process.exit(0);
}

const canonicalKey = JSON.stringify({
  description: canonical.description,
  stacks: canonical.stacks,
});
const rootKey = JSON.stringify({
  description: root.description,
  stacks: root.stacks,
});

if (canonicalKey !== rootKey) {
  console.error(
    "config/stacks.json mismatch: repo root differs from packages/pn-core-mcp/content/config/"
  );
  console.error("Canonical source: packages/pn-core-mcp/content/config/stacks.json");
  console.error(
    "Align repo root config/ or run: cp packages/pn-core-mcp/content/config/stacks.json config/"
  );
  process.exit(1);
}

console.log("config/stacks.json aligned with canonical source");
process.exit(0);
