/**
 * Tests for scripts/best-of-n-select.mjs
 * Run: node --test scripts/__tests__/best-of-n-select.test.mjs
 *      or: npm run test:scripts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AUTO_SELECT_MIN_DELTA, resolveBestOfNSelection } from "../best-of-n-select.mjs";
import { validate, validateSelectionCoherence } from "../validate-best-of-n-contract.mjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "__fixtures__", "best-of-n");

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8"));
}

// ── resolveBestOfNSelection ───────────────────────────────────────────────────

test("DEFAULT_AUTO_SELECT_MIN_DELTA is 0.15", () => {
  assert.equal(DEFAULT_AUTO_SELECT_MIN_DELTA, 0.15);
});

test("single gate survivor → auto_selected without scores", () => {
  const result = resolveBestOfNSelection({
    objective_gate_results: [
      { candidate_id: "path-a", passed: true },
      { candidate_id: "path-b", passed: false },
    ],
  });
  assert.equal(result.winner_id, "path-a");
  assert.equal(result.auto_selected, true);
  assert.equal(result.human_gate_required, false);
  assert.equal(result.score_delta, null);
  assert.equal(result.runner_up_id, null);
});

test("delta >= 0.15 → auto_selected: true (pilot-01-r2 top pair: 0.85 vs 0.79 = 0.06 < threshold)", () => {
  // pilot-01-r2 delta is 0.06 between path-a (0.85) and path-c (0.79) — human gate required
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "path-a", score: 0.85 },
      { candidate_id: "path-c", score: 0.79 },
      { candidate_id: "path-b", score: 0.73 },
    ],
    objective_gate_results: [
      { candidate_id: "path-a", passed: true },
      { candidate_id: "path-b", passed: true },
      { candidate_id: "path-c", passed: true },
    ],
  });
  assert.equal(result.winner_id, "path-a");
  assert.equal(result.auto_selected, false);
  assert.equal(result.human_gate_required, true);
  assert.ok(Math.abs(result.score_delta - 0.06) < 0.001);
  assert.equal(result.runner_up_id, "path-c");
});

test("delta >= 0.15 → auto_selected: true (compliant fixture: 0.82 vs 0.71 = 0.11 < 0.15)", () => {
  // The compliant fixture has 0.82 vs 0.71 = delta 0.11, which is < 0.15
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "path-a", score: 0.82 },
      { candidate_id: "path-b", score: 0.71 },
    ],
    objective_gate_results: [
      { candidate_id: "path-a", passed: true },
      { candidate_id: "path-b", passed: true },
    ],
  });
  assert.equal(result.winner_id, "path-a");
  assert.equal(result.auto_selected, false);
  assert.equal(result.human_gate_required, true);
  assert.ok(Math.abs(result.score_delta - 0.11) < 0.001);
});

test("delta exactly 0.15 → auto_selected: true", () => {
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "alpha", score: 0.9 },
      { candidate_id: "beta", score: 0.75 },
    ],
  });
  assert.equal(result.winner_id, "alpha");
  assert.equal(result.auto_selected, true);
  assert.equal(result.human_gate_required, false);
  assert.ok(Math.abs(result.score_delta - 0.15) < 0.001);
  assert.equal(result.runner_up_id, "beta");
});

test("delta > 0.15 → auto_selected: true", () => {
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "x", score: 0.95 },
      { candidate_id: "y", score: 0.7 },
    ],
  });
  assert.equal(result.auto_selected, true);
  assert.equal(result.human_gate_required, false);
  assert.ok(result.score_delta > 0.15);
});

test("sole llm_score entry → auto_selected: true, runner_up_id null", () => {
  const result = resolveBestOfNSelection({
    llm_scores: [{ candidate_id: "only", score: 0.88 }],
  });
  assert.equal(result.winner_id, "only");
  assert.equal(result.auto_selected, true);
  assert.equal(result.runner_up_id, null);
  assert.equal(result.score_delta, null);
});

test("survivors filter: failed gates excluded from ranking", () => {
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "good", score: 0.6 },
      { candidate_id: "broken", score: 0.99 },
    ],
    objective_gate_results: [
      { candidate_id: "good", passed: true },
      { candidate_id: "broken", passed: false },
    ],
  });
  assert.equal(result.winner_id, "good");
  assert.equal(result.auto_selected, true);
  assert.equal(result.score_delta, null);
});

test("custom minDelta overrides default", () => {
  const result = resolveBestOfNSelection({
    llm_scores: [
      { candidate_id: "a", score: 0.8 },
      { candidate_id: "b", score: 0.75 },
    ],
    minDelta: 0.03,
  });
  assert.equal(result.auto_selected, true);
});

// ── validateSelectionCoherence ────────────────────────────────────────────────

test("validateSelectionCoherence: compliant fixture is coherent", () => {
  const data = loadFixture("compliant-example.json");
  // delta 0.11 < 0.15 → auto_selected: false, human_gate_required: true (fixture matches)
  const result = validateSelectionCoherence(data);
  assert.equal(result.coherent, true, `unexpected issues: ${result.issues.join(", ")}`);
  assert.deepEqual(result.issues, []);
});

test("validateSelectionCoherence: no llm_scores → always coherent", () => {
  const result = validateSelectionCoherence({
    winner_id: "x",
    auto_selected: false,
  });
  assert.equal(result.coherent, true);
  assert.deepEqual(result.issues, []);
});

test("validateSelectionCoherence: incoherent-winner fixture fails", () => {
  const data = loadFixture("incoherent-winner.json");
  const result = validateSelectionCoherence(data);
  assert.equal(result.coherent, false);
  assert.ok(result.issues.some((i) => i.includes("winner_id")));
});

test("validate() catches schema errors before coherence", () => {
  const result = validate({ winner_id: "x" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("pilot-01-r2 coherence: auto_selected=false, human_gate_required=true match delta 0.06", () => {
  const data = JSON.parse(
    readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "docs",
        "audits",
        "best-of-n-2026-06-30-pilot-01-r2-validate-contract.json"
      ),
      "utf-8"
    )
  );
  const result = validateSelectionCoherence(data);
  assert.equal(result.coherent, true, `issues: ${result.issues.join(", ")}`);
});
