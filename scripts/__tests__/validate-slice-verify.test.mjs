/**
 * Unit tests for scripts/slice-verify-lib.mjs and validate-slice-verify.mjs CLI.
 * Invoke with: npm run test:scripts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  parseSliceVerifyYaml,
  validateSliceVerifyContent,
  extractPlanSliceIds,
  validateSliceVerifyProject,
} from "../slice-verify-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const fixturesDir = join(__dirname, "..", "__fixtures__", "slice-verify");
const cli = join(repoRoot, "scripts", "validate-slice-verify.mjs");

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

test("parseSliceVerifyYaml reads task checker and verify list", () => {
  const fm = parseSliceVerifyYaml(extractYaml(loadFixture("compliant-task.md")));
  assert.equal(fm.program, "frontend-redo-2026-06-29");
  assert.equal(fm.slice, "S2");
  assert.equal(fm.checker.kind, "task");
  assert.equal(fm.checker.task_id, "task-abc123");
  assert.equal(fm.verify.length, 2);
  assert.equal(fm.verify[0].exit, 0);
});

test("compliant task fixture passes validation", () => {
  const errors = validateSliceVerifyContent(loadFixture("compliant-task.md"), "compliant-task.md");
  assert.deepEqual(errors, []);
});

test("compliant USER-SKIP-REVIEW fixture passes validation", () => {
  const errors = validateSliceVerifyContent(loadFixture("compliant-skip.md"), "compliant-skip.md");
  assert.deepEqual(errors, []);
});

test("task checker without task_id or artifact fails CHECKER-SAME-SESSION", () => {
  const errors = validateSliceVerifyContent(
    loadFixture("bad-task-no-evidence.md"),
    "bad-task-no-evidence.md"
  );
  assert.ok(errors.some((e) => e.includes("CHECKER-SAME-SESSION")));
});

test("non-zero verify exit fails validation", () => {
  const errors = validateSliceVerifyContent(
    loadFixture("bad-verify-exit.md"),
    "bad-verify-exit.md"
  );
  assert.ok(errors.some((e) => e.includes("exit=1")));
});

test("extractPlanSliceIds finds slice table ids", () => {
  const plan = `
| Slice | Scope |
|-------|-------|
| S1 | Home |
| S2 | Fight |
| Phase-3 | Chrome |
`;
  const ids = extractPlanSliceIds(plan);
  assert.deepEqual(ids, ["Phase-3", "S1", "S2"]);
});

test("CLI skips when no verify files in repo root", () => {
  const r = spawnSync(process.execPath, [cli, repoRoot], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skipping/i);
});

test("strict-plan flags missing slice verify when plan lists slices", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-slice-verify-"));
  try {
    mkdirSync(join(root, "docs", "plans"), { recursive: true });
    mkdirSync(join(root, "docs", "audits"), { recursive: true });
    writeFileSync(
      join(root, "docs", "plans", "frontend-redo-2026-06-29.md"),
      "| Slice | Scope |\n|-------|-------|\n| S1 | Home |\n| S2 | Fight |\n"
    );
    const s1Verify = loadFixture("compliant-task.md").replace("slice: S2", "slice: S1");
    writeFileSync(join(root, "docs", "audits", "frontend-redo-s1-verify-2026-06-29.md"), s1Verify);

    const partial = validateSliceVerifyProject(root, { strictPlan: true });
    assert.ok(partial.errors.some((e) => e.includes("missing slice verify for S2")));
    assert.ok(!partial.errors.some((e) => e.includes("missing slice verify for S1")));

    rmSync(join(root, "docs", "audits", "frontend-redo-s1-verify-2026-06-29.md"));
    const empty = validateSliceVerifyProject(root, { strictPlan: true });
    assert.ok(empty.errors.some((e) => e.includes("missing slice verify for S1")));
    assert.ok(empty.errors.some((e) => e.includes("missing slice verify for S2")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("strict-plan CLI exits non-zero when slices missing", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-slice-verify-cli-"));
  try {
    mkdirSync(join(root, "docs", "plans"), { recursive: true });
    mkdirSync(join(root, "docs", "audits"), { recursive: true });
    writeFileSync(
      join(root, "docs", "plans", "app-redo-2026-06-29.md"),
      "| Slice | Scope |\n|-------|-------|\n| S1 | Home |\n"
    );
    const r = spawnSync(process.execPath, [cli, root, "--strict-plan"], { encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(`${r.stdout}\n${r.stderr}`, /missing slice verify for S1/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extractPlanSliceIds ignores FR ids in criterion columns", () => {
  const plan = `
| Slice | Acceptance |
|-------|------------|
| S1 | FR-1 hero layout |
| S2 | FR-2 fight page |
`;
  const ids = extractPlanSliceIds(plan);
  assert.deepEqual(ids, ["S1", "S2"]);
});

/** @param {string} content */
function extractYaml(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, "fixture must have front matter");
  return m[1];
}
