#!/usr/bin/env node
/**
 * AC-1: Ensures each id in docs/refs/context-index.json acceptance_criteria_ids
 * appears outside that index file (traceability for drift checks).
 * Run from repo root: npm run check:ac-traceability
 */
// AC-1 — traceability: listed in context-index + documented + enforced here

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const indexPath = path.join(repoRoot, "docs/refs/context-index.json");
const indexRel = "docs/refs/context-index.json";

const SKIP_DIR = new Set(["node_modules", ".git", "dist", "coverage", ".turbo", "out", "build"]);

const TEXT_EXT = new Set([".md", ".mdc", ".mjs", ".js", ".ts", ".json", ".yml", ".yaml"]);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function* walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      yield* walkFiles(p);
    } else {
      const ext = path.extname(e.name);
      if (TEXT_EXT.has(ext)) yield p;
    }
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(indexPath)) fail(`Missing ${indexRel}`);

let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON in context-index.json: ${e.message}`);
}

const ids = index.acceptance_criteria_ids;
if (!Array.isArray(ids)) fail("context-index.json: acceptance_criteria_ids must be an array");

if (ids.length === 0) {
  console.log("check-ac-traceability: no acceptance_criteria_ids (skip)");
  process.exit(0);
}

for (const id of ids) {
  if (typeof id !== "string" || !/^AC-[0-9]+$/.test(id)) {
    fail(`Invalid acceptance id: ${JSON.stringify(id)} (expected AC-<digits>)`);
  }
}

for (const id of ids) {
  const re = new RegExp(`\\b${escapeRe(id)}\\b`);
  let foundOutsideIndex = false;
  for (const file of walkFiles(repoRoot)) {
    const rel = path.relative(repoRoot, file).split(path.sep).join("/");
    if (rel === indexRel) continue;
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (re.test(text)) {
      foundOutsideIndex = true;
      break;
    }
  }
  if (!foundOutsideIndex) {
    fail(
      `AC traceability: ${id} is listed in ${indexRel} but was not found in any other tracked text file under the repo (add it to docs, tests, or scripts).`
    );
  }
}

console.log("check-ac-traceability OK:", ids.join(", "));
