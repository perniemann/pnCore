#!/usr/bin/env node
/**
 * Fixture check: skeptic transcript snippets must end with AskQuestion or workflow_confirm
 * within a few lines of a proceed/revise verdict.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dir, "__fixtures__", "skeptic");

const GATE_TOOLS = /"name":"AskQuestion"|"name":"workflow_confirm"/;
const VERDICT_MARKERS = /\b(proceed as planned|revise plan|conditional_go|go_no_go)\b/i;

function loadFixture(name) {
  const p = join(fixturesDir, name);
  if (!existsSync(p)) throw new Error(`Missing fixture: ${p}`);
  return readFileSync(p, "utf-8");
}

function checkCompliantTranscript(text, label) {
  const lines = text.split("\n").filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (!VERDICT_MARKERS.test(lines[i])) continue;
    const window = lines.slice(i, i + 4).join("\n");
    if (!GATE_TOOLS.test(window)) {
      throw new Error(
        `${label}: verdict near line ${i + 1} without AskQuestion/workflow_confirm in next 3 lines`
      );
    }
  }
}

function checkNonCompliantTranscript(text, label) {
  const lines = text.split("\n").filter(Boolean);
  let foundVerdict = false;
  let foundGate = false;
  for (const line of lines) {
    if (VERDICT_MARKERS.test(line)) foundVerdict = true;
    if (GATE_TOOLS.test(line)) foundGate = true;
  }
  if (foundVerdict && foundGate) {
    throw new Error(`${label}: expected non-compliant fixture (verdict without gate tool)`);
  }
  if (!foundVerdict) {
    throw new Error(`${label}: fixture must contain a verdict marker`);
  }
}

let failed = false;
try {
  checkCompliantTranscript(loadFixture("compliant-skeptic-turn.jsonl"), "compliant-skeptic-turn");
  checkNonCompliantTranscript(
    loadFixture("noncompliant-reply-yes.jsonl"),
    "noncompliant-reply-yes"
  );
  console.log("validate-skeptic-gates: ok");
} catch (err) {
  console.error(String(err));
  failed = true;
}

process.exit(failed ? 1 : 0);
