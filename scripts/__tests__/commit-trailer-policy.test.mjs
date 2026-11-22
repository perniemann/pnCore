import { test } from "node:test";
import assert from "node:assert/strict";
import { forbiddenTrailer, stripTrailers } from "../commit-trailer-policy.mjs";

test("flags every IDE and agent trailer", () => {
  for (const line of [
    "Co-authored-by: Cursor Agent <cursoragent@cursor.com>",
    "Co-Authored-By: Claude <noreply@anthropic.com>",
    "Made-with: Cursor",
    "Claude-Session: https://claude.ai/code/session_x",
    "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
    "Generated-by: some-agent",
  ]) {
    assert.notEqual(forbiddenTrailer(line), null, line);
  }
});

test("leaves ordinary body lines alone", () => {
  for (const line of ["feat: add x", "Refs #12", "Signed-off-by: dependabot[bot]", "co-authoring a doc"]) {
    assert.equal(forbiddenTrailer(line), null, line);
  }
});

test("stripTrailers removes trailers and collapses blank runs", () => {
  const msg = "feat: x\n\nWhy.\n\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: s\n";
  assert.equal(stripTrailers(msg), "feat: x\n\nWhy.\n");
});
