/**
 * Unit tests for scripts/slice-verify-yaml.mjs
 * Invoke with: node --test scripts/__tests__/slice-verify-yaml.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFrontMatter, parseSliceVerifyYaml } from "../slice-verify-yaml.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "__fixtures__", "slice-verify");

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

function extractYaml(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, "fixture must have front matter");
  return m[1];
}

test("extractFrontMatter returns null when no front matter present", () => {
  assert.equal(extractFrontMatter("no front matter here"), null);
  assert.equal(extractFrontMatter(""), null);
});

test("extractFrontMatter extracts yaml block from compliant fixture", () => {
  const content = loadFixture("compliant-task.md");
  const yaml = extractFrontMatter(content);
  assert.ok(yaml !== null, "should find front matter");
  assert.ok(yaml.includes("program:"), "yaml block should contain program key");
  assert.ok(yaml.includes("slice:"), "yaml block should contain slice key");
});

test("extractFrontMatter handles empty key block", () => {
  const content = "---\nprogram:\nslice: S1\n---\nBody";
  const yaml = extractFrontMatter(content);
  assert.ok(yaml !== null);
  assert.ok(yaml.includes("program:"));
});

test("parseSliceVerifyYaml reads review_panel subagents", () => {
  const yaml = [
    "program: auth-refactor-2026-06-30",
    "slice: S1",
    "date: 2026-06-30",
    "checker:",
    "  kind: task",
    "  task_id: checker-task-1",
    "review_panel:",
    "  risk: auth",
    "  synthesized_artifact: docs/audits/review-panel-2026-06-30-s1.md",
    "  bugbot:",
    "    task_id: bugbot-task-1",
    "    artifact: docs/audits/bugbot-2026-06-30-s1.md",
    "  security_review:",
    "    task_id: sec-task-1",
    "    artifact: docs/audits/security-review-2026-06-30-s1.md",
    "verify:",
    "  - cmd: npm test",
    "    exit: 0",
    "user_continue:",
    "  at: 2026-06-30T10:00:00Z",
  ].join("\n");
  const fm = parseSliceVerifyYaml(yaml);
  assert.equal(fm.review_panel.risk, "auth");
  assert.equal(fm.review_panel.bugbot.task_id, "bugbot-task-1");
  assert.equal(
    fm.review_panel.security_review.artifact,
    "docs/audits/security-review-2026-06-30-s1.md"
  );
});

test("parseSliceVerifyYaml reads task checker and verify list", () => {
  const fm = parseSliceVerifyYaml(extractYaml(loadFixture("compliant-task.md")));
  assert.equal(fm.program, "frontend-redo-2026-06-29");
  assert.equal(fm.slice, "S2");
  assert.equal(fm.checker.kind, "task");
  assert.equal(fm.checker.task_id, "task-abc123");
  assert.equal(fm.verify.length, 2);
  assert.equal(fm.verify[0].exit, 0);
});

test("parseSliceVerifyYaml returns undefined for missing optional keys", () => {
  const yaml =
    "program: test-prog\nslice: S1\nchecker:\n  kind: task\n  task_id: t1\nverify:\n  - cmd: npm test\n    exit: 0\nuser_continue:\n  at: 2026-01-01T00:00:00Z";
  const fm = parseSliceVerifyYaml(yaml);
  assert.equal(fm.date, undefined);
  assert.equal(fm.checker.artifact, undefined);
  assert.equal(fm.review_panel.risk, undefined);
});
