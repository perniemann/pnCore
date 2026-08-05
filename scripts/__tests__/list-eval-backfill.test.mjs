/**
 * Smoke tests for scripts/list-eval-backfill.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "list-eval-backfill.mjs");

test("list-eval-backfill --json returns missing skills and batches", () => {
  const r = spawnSync(process.execPath, [script, "--json", "--batches", "2", "--batch-size", "5"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.ok(data.totalMissing >= 0);
  assert.ok(Array.isArray(data.batches));
  assert.ok(data.batches.length <= 2);
  if (data.batches[0]) assert.ok(data.batches[0].length <= 5);
});

test("list-eval-backfill text mode mentions contract URI", () => {
  const r = spawnSync(process.execPath, [script, "--limit", "3"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /eval-backfill\.md/);
});
