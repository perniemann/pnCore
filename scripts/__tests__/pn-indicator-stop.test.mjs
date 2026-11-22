import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkLastTurn,
  evaluateHook,
  parseTranscript,
} from "../../plugins/pnCore/scripts/pn-indicator-stop.mjs";

const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../plugins/pnCore/scripts/pn-indicator-stop.mjs"
);
const user = (text) => ({ type: "user", message: { role: "user", content: text } });
const said = (text) => ({ type: "assistant", message: { content: [{ type: "text", text }] } });
const call = (name, input = {}) => ({
  type: "assistant",
  message: { content: [{ type: "tool_use", id: "t1", name, input }] },
});
const result = (text) => ({
  type: "user",
  message: {
    content: [{ type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text }] }],
  },
});
const jsonl = (...e) => e.map((x) => JSON.stringify(x)).join("\n") + "\n";

test("a turn without pnCore needs no tag", () => {
  const r = checkLastTurn([user("hi"), call("Bash"), result("ok"), said("Done.")]);
  assert.deepEqual([r.touched, r.compliant], [false, true]);
});

test("pn-core tool, pn skill and pn-indicator results count as touched", () => {
  for (const turn of [
    [call("mcp__pn-core__workflow_step")],
    [call("Skill", { skill: "pn-tdd" })],
    [call("Bash"), result("x\npn-indicator: [pn-plan] 🔺")],
  ]) {
    const r = checkLastTurn([user("go"), ...turn, said("Plain reply.")]);
    assert.equal(r.touched, true);
    assert.equal(r.compliant, false);
  }
});

test("any reply opening with a context tag complies; only the last turn counts", () => {
  const ok = checkLastTurn([
    user("go"),
    call("mcp__pn-core__get_skill"),
    result("body"),
    said("[pn-skill] 🔺 Loaded."),
  ]);
  assert.equal(ok.compliant, true);
  const earlier = checkLastTurn([
    user("a"),
    call("mcp__pn-core__health"),
    said("x"),
    user("b"),
    said("y"),
  ]);
  assert.equal(earlier.touched, false);
});

test("block mode asks once; log-only by default; torn lines are skipped", () => {
  const t = jsonl(user("go"), call("mcp__pn-core__health"), said("No tag.")) + "{torn";
  assert.equal(parseTranscript(t).length, 3);
  assert.equal(evaluateHook({}, t).output, undefined);
  const blocked = JSON.parse(evaluateHook({}, t, { PNCORE_INDICATOR_STOP: "block" }).output);
  assert.equal(blocked.decision, "block");
  assert.equal(
    evaluateHook({ stop_hook_active: true }, t, { PNCORE_INDICATOR_STOP: "block" }).output,
    undefined
  );
});

test("the hook appends a miss to .pncore/indicator-misses.jsonl and exits 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "pn-indicator-"));
  try {
    const tp = join(dir, "t.jsonl");
    writeFileSync(tp, jsonl(user("go"), call("mcp__pn-core__health"), said("No tag.")));
    const input = JSON.stringify({ session_id: "s1", transcript_path: tp, cwd: dir });
    const r = spawnSync(process.execPath, [script], { input, encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    const line = JSON.parse(readFileSync(join(dir, ".pncore", "indicator-misses.jsonl"), "utf8"));
    assert.equal(line.session_id, "s1");
    assert.deepEqual(line.sources, ["tool:mcp__pn-core__health"]);
    const bad = spawnSync(process.execPath, [script], { input: "not json", encoding: "utf8" });
    assert.equal(bad.status, 0);
    assert.ok(existsSync(join(dir, ".pncore")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
