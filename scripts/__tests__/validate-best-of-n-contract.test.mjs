/**
 * Tests for scripts/validate-best-of-n-contract.mjs
 * Run: npm run test:scripts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validate } from "../validate-best-of-n-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const fixturesDir = join(__dirname, "..", "__fixtures__", "best-of-n");
const cli = join(repoRoot, "scripts", "validate-best-of-n-contract.mjs");

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8"));
}

test("compliant example passes validate()", () => {
  const result = validate(loadFixture("compliant-example.json"));
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("missing winner_id fails validate()", () => {
  const result = validate(loadFixture("missing-winner-id.json"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(
    result.errors.some(
      (e) => e.message?.includes("winner_id") || e.params?.missingProperty === "winner_id"
    ),
    `expected winner_id error, got: ${JSON.stringify(result.errors)}`
  );
});

test("validate() rejects unknown top-level property", () => {
  const base = loadFixture("compliant-example.json");
  const result = validate({ ...base, unexpected_field: true });
  assert.equal(result.valid, false);
});

test("validate() rejects invalid go_no_go enum", () => {
  const base = loadFixture("compliant-example.json");
  const result = validate({ ...base, go_no_go: "maybe" });
  assert.equal(result.valid, false);
});

test("CLI exits 0 on compliant fixture", () => {
  const fixture = join(fixturesDir, "compliant-example.json");
  const r = spawnSync(process.execPath, [cli, fixture], { encoding: "utf-8" });
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stdout, /^ok:/);
});

test("CLI exits 1 on missing-winner-id fixture", () => {
  const fixture = join(fixturesDir, "missing-winner-id.json");
  const r = spawnSync(process.execPath, [cli, fixture], { encoding: "utf-8" });
  assert.equal(r.status, 1, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /invalid:/);
});

test("CLI exits 1 when no argument provided", () => {
  const r = spawnSync(process.execPath, [cli], { encoding: "utf-8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Usage:/);
});
