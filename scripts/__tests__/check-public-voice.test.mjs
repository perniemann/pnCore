import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceFindings } from "../check-public-voice.mjs";

test("flags em dashes, spaced hyphens and banned words in prose", () => {
  assert.equal(voiceFindings("One engine — four harnesses.").length, 1);
  assert.equal(voiceFindings("One engine - four harnesses.").length, 1);
  assert.match(voiceFindings("We leverage the engine.")[0], /banned word "leverage"/);
  assert.match(voiceFindings("A robust gate.")[0], /robust/);
});

test("exempts code, list markers, ranges and CHANGELOG headings", () => {
  assert.deepEqual(voiceFindings("Run `a — b` now."), []);
  assert.deepEqual(voiceFindings("```\nx — y - z\n```"), []);
  assert.deepEqual(voiceFindings("- item one\n- item two"), []);
  assert.deepEqual(voiceFindings("Steps 0-4 and 3a–3g."), []);
  assert.deepEqual(voiceFindings("## [0.24.0] - 2026-11-22"), []);
});

test("html mode checks visible text, not scripts", () => {
  assert.equal(voiceFindings("<p>a — b</p>", { html: true }).length, 1);
  assert.deepEqual(voiceFindings("<script>const s = 'a — b';", { html: true }), []);
});
