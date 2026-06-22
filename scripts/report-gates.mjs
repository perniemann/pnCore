#!/usr/bin/env node
/**
 * Summarize .pncore/gate-log.jsonl for dogfood compliance (Phase A measurement).
 * Usage: npm run report:gates [-- path/to/gate-log.jsonl]
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const logPath = process.argv[2] ?? ".pncore/gate-log.jsonl";
const abs = resolve(process.cwd(), logPath);

if (!existsSync(abs)) {
  console.log(`No gate log at ${abs}. Run workflow_confirm or record gates after AskQuestion.`);
  process.exit(0);
}

const lines = readFileSync(abs, "utf-8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

let skeptic = 0;
let byType = new Map();
let byVerdict = new Map();

for (const line of lines) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }
  const gt = row.gate_type ?? "unknown";
  byType.set(gt, (byType.get(gt) ?? 0) + 1);
  if (gt === "skeptic") {
    skeptic += 1;
    const v = row.verdict ?? "unset";
    byVerdict.set(v, (byVerdict.get(v) ?? 0) + 1);
  }
}

console.log(`Gate log: ${abs}`);
console.log(`Total entries: ${lines.length}`);
console.log(`Skeptic gates: ${skeptic}`);
for (const [k, v] of [...byType.entries()].sort()) {
  console.log(`  ${k}: ${v}`);
}
if (skeptic > 0) {
  console.log("Skeptic verdicts:");
  for (const [k, v] of [...byVerdict.entries()].sort()) {
    console.log(`  ${k}: ${v}`);
  }
}

console.log(
  "\nTarget: ≥80% of /pn-skeptic turns should produce a gate tool call (manual count vs transcripts)."
);
