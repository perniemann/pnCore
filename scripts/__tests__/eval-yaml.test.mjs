/**
 * Unit tests for scripts/eval-yaml-lib.mjs and validate-eval-yaml warning-only exit.
 * Invoke with: node --test scripts/__tests__/eval-yaml.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseEvalYaml, validateEvalContent } from "../eval-yaml-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "__fixtures__", "eval-yaml");
const repoRoot = join(__dirname, "..", "..");

function load(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

test("parseEvalYaml reads compliant fixture", () => {
  const obj = parseEvalYaml(load("compliant.yaml"));
  assert.equal(obj.skill, "pn-example");
  assert.equal(obj.owner, "maintainer");
  assert.equal(obj.scenarios.length, 2);
  assert.equal(obj.scenarios[0].without_skill, true);
  assert.equal(obj.scenarios[1].with_skill, true);
  assert.equal(obj.scenarios[1].quadrant, "accurate_efficient");
});

test("validateEvalContent accepts compliant fixture", () => {
  const errors = validateEvalContent(load("compliant.yaml"), "compliant.yaml", {
    expectedSkillId: "pn-example",
  });
  assert.deepEqual(errors, []);
});

test("validateEvalContent flags missing scenarios", () => {
  const errors = validateEvalContent(load("bad-missing-scenarios.yaml"), "bad.yaml");
  assert.ok(errors.some((e) => e.includes("scenarios")));
});

test("validateEvalContent flags skill mismatch", () => {
  const errors = validateEvalContent(load("bad-skill-mismatch.yaml"), "bad.yaml", {
    expectedSkillId: "pn-correct",
  });
  assert.ok(errors.some((e) => e.includes("does not match folder id")));
});

test("validate-eval-yaml CLI exits 0 when repo EVAL.yaml files are valid", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "validate-eval-yaml.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /validate-eval-yaml: OK/);
});

test("validate-eval-yaml soft mode exits 0 (PNCORE_STRICT_EVALS=0)", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "validate-eval-yaml.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PNCORE_STRICT_EVALS: "0" },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("validateEvalContent rejects invalid quadrant", () => {
  const text = [
    "skill: pn-x",
    "scenarios:",
    "  - id: a",
    "    prompt: p",
    "    expectation: e",
    "    quadrant: not_a_quadrant",
  ].join("\n");
  const errors = validateEvalContent(text);
  assert.ok(errors.some((e) => e.includes("quadrant")));
});

test("scaffold writes EVAL.yaml once and refuses overwrite", () => {
  const dir = mkdtempSync(join(tmpdir(), "scaffold-eval-"));
  const skillDir = join(dir, "pn-temp-skill");
  mkdirSync(skillDir);
  writeFileSync(join(skillDir, "SKILL.md"), "---\nname: pn-temp-skill\ndescription: x\n---\n");
  const scaffold = join(repoRoot, "scripts", "scaffold-eval.mjs");
  const first = spawnSync(process.execPath, [scaffold, skillDir], { encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.ok(existsEval(skillDir));
  const second = spawnSync(process.execPath, [scaffold, skillDir], { encoding: "utf8" });
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /REFUSE overwrite/);
});

function existsEval(skillDir) {
  try {
    readFileSync(join(skillDir, "EVAL.yaml"), "utf8");
    return true;
  } catch {
    return false;
  }
}
