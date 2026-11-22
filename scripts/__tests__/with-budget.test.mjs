import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withBudget } from "../with-budget.mjs";

const helper = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "..", "with-budget.mjs")
).href;

test("returns the work's value and rejects past the budget", async () => {
  assert.equal(await withBudget(Promise.resolve(7), 1000, "x"), 7);
  await assert.rejects(withBudget(new Promise(() => {}), 10, "slow"), /slow exceeded 10ms/);
  await assert.rejects(withBudget(Promise.reject(new Error("boom")), 1000, "x"), /boom/);
});

test("a finished race does not keep Node alive for the rest of the budget", () => {
  const code = `const { withBudget } = await import(${JSON.stringify(helper)}); await withBudget(Promise.resolve(1), 60000, "x");`;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Date.now() - t0 < 10000, `exited after ${Date.now() - t0}ms`);
});
