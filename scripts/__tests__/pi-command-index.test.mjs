import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { partitionCommands } from "../command-slash-filter.mjs";
import { buildPiCommandIndex, categoryFromCommandRel } from "../pi-command-index.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const commandsSrc = join(repoRoot, "packages", "pn-core-mcp", "content", "commands");

test("categoryFromCommandRel maps pn folders to menu labels", () => {
  assert.equal(categoryFromCommandRel("pn/build/pn-build.md"), "Build");
  assert.equal(categoryFromCommandRel("pn/pm/pn-strategy.md"), "Product");
});

test("buildPiCommandIndex skips pn router stub and includes leaves", () => {
  const { visible } = partitionCommands(commandsSrc);
  const index = buildPiCommandIndex(commandsSrc, visible);
  assert.ok(index.length >= 20);
  assert.ok(!index.some((e) => e.id === "pn"));
  assert.ok(index.some((e) => e.id === "pn-build" && e.category === "Build"));
});
