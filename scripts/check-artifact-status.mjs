#!/usr/bin/env node
/**
 * Attested derived-status check for docs/refs/context-index.json artifacts.
 * Fail when authored_status claims complete/done without a passing verify/acceptance
 * for the linked run_id, or when an artifact path is missing.
 * Does NOT treat markdown checkboxes as truth.
 *
 * Run from repo root: npm run check:artifact-status
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const indexPath = path.join(repoRoot, "docs/refs/context-index.json");
const runEventsPath = path.join(repoRoot, ".pncore/run-events.jsonl");

const COMPLETE = new Set(["complete", "done", "completed", "shipped"]);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function loadEventsByRunId() {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  if (!fs.existsSync(runEventsPath)) return map;
  const raw = fs.readFileSync(runEventsPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (typeof o.run_id !== "string") continue;
      if (!map.has(o.run_id)) map.set(o.run_id, []);
      map.get(o.run_id).push(o);
    } catch {
      /* skip */
    }
  }
  return map;
}

function attestedComplete(events) {
  for (const ev of events) {
    if (ev.kind === "acceptance" && ev.accepted === true) return true;
    if (ev.kind === "verify" && ev.exitCode === 0 && ev.timedOut === false) return true;
  }
  return false;
}

if (!fs.existsSync(indexPath)) fail(`Missing ${path.relative(repoRoot, indexPath)}`);

let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON in context-index.json: ${e.message}`);
}

const artifacts = Array.isArray(index.artifacts) ? index.artifacts : [];
const eventsByRun = loadEventsByRunId();
const drifts = [];

for (const art of artifacts) {
  if (!art || typeof art !== "object") continue;
  const id = typeof art.id === "string" ? art.id : "?";
  const rel = typeof art.path === "string" ? art.path : "";
  if (!rel) {
    drifts.push(`${id}: missing path`);
    continue;
  }
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    drifts.push(`${id}: path missing (${rel})`);
    continue;
  }
  const authored =
    typeof art.authored_status === "string" ? art.authored_status.trim().toLowerCase() : "";
  if (!COMPLETE.has(authored)) continue;
  const runId = typeof art.run_id === "string" ? art.run_id.trim() : "";
  if (!runId) {
    drifts.push(`${id}: authored complete without run_id attestation`);
    continue;
  }
  const events = eventsByRun.get(runId) || [];
  if (!attestedComplete(events)) {
    drifts.push(`${id}: authored complete but no passing verify/acceptance for run_id=${runId}`);
  }
}

if (drifts.length > 0) {
  console.error("artifact-status drift:");
  for (const d of drifts) console.error("  -", d);
  process.exit(1);
}

console.log("artifact-status OK:", artifacts.length, "artifacts, 0 drift");
