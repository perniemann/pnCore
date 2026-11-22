import { test } from "node:test";
import assert from "node:assert/strict";
import { selectPrunable } from "../github-actions-prune-runs.mjs";

const now = Date.parse("2026-11-22T00:00:00Z");
const old = "2026-09-01T00:00:00Z";
const recent = "2026-11-20T00:00:00Z";
const run = (id, workflow_id, run_number, created_at, head_sha = `sha-${id}`) => ({
  id,
  workflow_id,
  run_number,
  created_at,
  head_sha,
});

test("keeps the latest run per workflow, recent runs and open-PR heads", () => {
  const runs = [
    run(1, "w", 1, old),
    run(2, "w", 2, old, "pr-head"),
    run(3, "w", 3, recent),
    run(4, "w", 4, old),
    run(5, "v", 1, old),
  ];
  const pruned = selectPrunable(runs, { now, protectedShas: new Set(["pr-head"]) }).map((r) => r.id);
  assert.deepEqual(pruned, [1]);
});
