#!/usr/bin/env node
/**
 * Migrate docs/refs/context-index.json when the JSON Schema contract bumps.
 * Run from repo root: node scripts/migrate-context-index.mjs [--dry-run] [path]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const posArgs = args.filter((a) => a !== "--dry-run");
const indexPath = path.resolve(repoRoot, posArgs[0] ?? "docs/refs/context-index.json");

if (!fs.existsSync(indexPath)) fail(`Missing ${path.relative(repoRoot, indexPath)}`);

let data;
try {
  data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON: ${e.message}`);
}

if (typeof data !== "object" || data === null || Array.isArray(data)) {
  fail("context-index must be a JSON object");
}

const fromVersion = data.version;
if (typeof fromVersion !== "string") fail("Missing string version");

/** @param {Record<string, unknown>} d */
function migrate_1_0_0_to_1_1_0(d) {
  if (!d.pointers || typeof d.pointers !== "object" || Array.isArray(d.pointers)) {
    d.pointers = { workspace: "AGENTS.md" };
  }
  const p = d.pointers;
  if (!("prd" in p)) p.prd = null;
  if (!("discovery" in p)) p.discovery = null;
  if (!("product" in p)) p.product = null;
  if (!("workflow_state_schema" in p)) p.workflow_state_schema = null;
  if (typeof p.workspace !== "string" || p.workspace === "") {
    p.workspace = "AGENTS.md";
  }
  d.version = "1.1.0";
}

const chain = {
  "1.0.0": migrate_1_0_0_to_1_1_0,
};

let v = fromVersion;
const applied = [];
while (chain[v]) {
  applied.push(`${v} → next`);
  chain[v](data);
  v = data.version;
}

if (applied.length === 0) {
  console.log("migrate-context-index: no migrator for version", fromVersion, "- nothing to do.");
  console.log("Known sources:", Object.keys(chain).join(", "));
  process.exit(0);
}

console.log("migrate-context-index: applied:", applied.join("; "));
console.log("migrate-context-index: new version:", data.version);

if (dryRun) {
  console.log("[dry-run] not writing file");
  process.exit(0);
}

fs.writeFileSync(indexPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("migrate-context-index: wrote", path.relative(repoRoot, indexPath));
