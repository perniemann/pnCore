import { test } from "node:test";
import assert from "node:assert/strict";
import { hasBareTodo } from "../pn-pr-review-lib.mjs";

test("flags an uppercase TODO marker without an issue reference", () => {
  assert.equal(hasBareTodo("// TODO: handle retries"), true);
  assert.equal(hasBareTodo("/* TODO */"), true);
});

test("accepts a TODO that cites an issue", () => {
  assert.equal(hasBareTodo("// TODO (#42): handle retries"), false);
  assert.equal(hasBareTodo("// TODO(#42) handle retries"), false);
});

test("ignores lowercase todo used as data", () => {
  assert.equal(hasBareTodo('Type.Literal("todo"),'), false);
  assert.equal(hasBareTodo('.enum(["backlog", "todo", "in_progress"])'), false);
});
