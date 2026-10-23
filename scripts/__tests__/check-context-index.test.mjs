/**
 * Unit tests for scripts/check-context-index.mjs lifecycle rules.
 * Invoke with: node --test scripts/__tests__/check-context-index.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { lifecycleErrors } from "../check-context-index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

const art = (id, over = {}) => ({ id, type: "plan", path: `docs/plans/${id}.md`, ...over });

test("a valid lifecycle passes", () => {
  const index = {
    pointers: { workspace: "AGENTS.md", current_checkpoint: "plan-v2" },
    artifacts: [
      art("plan-v1", { lifecycle: "superseded", superseded_by: "plan-v2" }),
      art("plan-v2", { lifecycle: "current" }),
      art("plan-old", { lifecycle: "historical" }),
      { id: "conv", type: "convention", path: "docs/c.md", lifecycle: "current" },
    ],
  };
  assert.deepEqual(lifecycleErrors(index), []);
});

test("current_checkpoint must name an existing current artifact", () => {
  assert.deepEqual(lifecycleErrors({ pointers: { current_checkpoint: "nope" }, artifacts: [] }), [
    'pointers.current_checkpoint "nope" is not an artifact id',
  ]);
  assert.deepEqual(
    lifecycleErrors({
      pointers: { current_checkpoint: "plan-v1" },
      artifacts: [art("plan-v1", { lifecycle: "historical" })],
    }),
    ['pointers.current_checkpoint "plan-v1" has lifecycle historical, expected "current"']
  );
});

test("more than one current artifact of a type fails", () => {
  const errors = lifecycleErrors({
    pointers: {},
    artifacts: [art("a", { lifecycle: "current" }), art("b", { lifecycle: "current" })],
  });
  assert.deepEqual(errors, ['more than one "current" plan artifact: a, b']);
});

test("superseded_by must exist and superseded requires it", () => {
  const errors = lifecycleErrors({
    pointers: {},
    artifacts: [
      art("a", { lifecycle: "superseded", superseded_by: "ghost" }),
      art("b", { lifecycle: "superseded" }),
    ],
  });
  assert.deepEqual(errors, [
    'artifact "a" superseded_by "ghost" does not exist',
    'artifact "b" is superseded but has no superseded_by',
  ]);
});

test("duplicate ids, stray superseded_by, self-reference, and cycles fail", () => {
  const errors = lifecycleErrors({
    pointers: {},
    artifacts: [
      art("dup", { lifecycle: "historical" }),
      art("dup", { lifecycle: "historical" }),
      art("live", { lifecycle: "current", superseded_by: "dup" }),
      art("self", { lifecycle: "superseded", superseded_by: "self" }),
      art("a", { lifecycle: "superseded", superseded_by: "b" }),
      art("b", { lifecycle: "superseded", superseded_by: "a" }),
    ],
  });
  assert.deepEqual(errors, [
    'duplicate artifact id "dup"',
    'artifact "live" has superseded_by but lifecycle current, expected "superseded"',
    'artifact "self" supersedes itself',
    "superseded_by cycle: a -> b -> a",
  ]);
});

test("the repository index passes the CLI", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "check-context-index.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /context-index OK/);
});
