/**
 * Tests for scripts/record-trajectory.mjs (ADR-0017 trajectory fixtures).
 * Covers: --list, export by --run-id / --latest, refusal without state snapshots,
 * missing run, exists-without-force, kebab-case name check, and replay summary.
 *
 * Runs via node:test. Invoke with: npm run test:scripts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "record-trajectory.mjs");

const entry = (o) => JSON.stringify(o);
const LOG = [
  entry({
    ts: "2026-09-14T10:00:00.000Z",
    runId: "run-a",
    workflowType: "design",
    step: 0,
    nextStep: 1,
    gate: "human",
    done: false,
    stateKeys: [],
    state: {},
  }),
  entry({
    ts: "2026-09-14T10:00:01.000Z",
    runId: "run-a",
    workflowType: "design",
    step: 1,
    nextStep: 2,
    gate: "human",
    done: false,
    stateKeys: ["discoverySpec"],
    state: { discoverySpec: "x" },
  }),
  entry({
    ts: "2026-09-14T10:00:02.000Z",
    runId: "run-b",
    workflowType: "project_kickoff",
    step: 0,
    nextStep: 1,
    gate: "human",
    done: false,
    stateKeys: [],
  }),
  entry({
    ts: "2026-09-14T10:00:03.000Z",
    runId: "run-c",
    workflowType: "full_dev",
    step: 4,
    nextStep: 5,
    gate: "model",
    done: false,
    parallel: true,
    taskIds: ["pn-frontend-developer", "pn-backend-developer"],
    stateKeys: ["specialistList", "routeConfirmed", "plan", "skepticPassed"],
    state: {
      specialistList: ["pn-frontend-developer", "pn-backend-developer"],
      routeConfirmed: true,
      plan: "p",
      skepticPassed: true,
    },
  }),
  "garbage line",
].join("\n");

function run(args, cwd) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, PNCORE_RUN_LOG: "" },
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "pn-traj-"));
  const log = join(dir, "runs.jsonl");
  writeFileSync(log, LOG + "\n");
  return { dir, log };
}

test("--list shows runs, step counts, and whether state was recorded", () => {
  const { dir, log } = setup();
  try {
    const r = run(["--list", "--log", log], dir);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /run-a\s+design\s+2 steps.*state ✓/);
    assert.match(r.out, /run-b\s+project_kickoff\s+1 steps.*state ✗/);
    assert.match(r.out, /run-c\s+full_dev\s+1 steps/);
    assert.match(r.err, /skipped 1 malformed line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--run-id exports a replayable fixture and reports replay OK", () => {
  const { dir, log } = setup();
  try {
    const out = join(dir, "fx", "design-two-steps.json");
    const r = run(
      ["--run-id", "run-a", "--name", "design-two-steps", "--log", log, "--out", out],
      dir
    );
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /Wrote .*design-two-steps\.json/);
    assert.match(r.out, /\[design, recorded, 2 steps: 0→1\]/);
    assert.match(r.out, /replay against current engine: OK \(2 steps\)/);
    const fx = JSON.parse(readFileSync(out, "utf-8"));
    assert.equal(fx.source, "recorded");
    assert.equal(fx.runId, "run-a");
    assert.deepEqual(fx.steps[1].expect, { nextStep: 2, gate: "human", done: false });
    assert.deepEqual(fx.steps[1].state, { discoverySpec: "x" });

    const again = run(
      ["--run-id", "run-a", "--name", "design-two-steps", "--log", log, "--out", out],
      dir
    );
    assert.equal(again.code, 2);
    assert.match(again.err, /exists \(pass --force to overwrite\)/);
    const forced = run(
      ["--run-id", "run-a", "--name", "design-two-steps", "--log", log, "--out", out, "--force"],
      dir
    );
    assert.equal(forced.code, 0, forced.err);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--latest picks the most recent run and carries parallel task ids", () => {
  const { dir, log } = setup();
  try {
    const out = join(dir, "latest.json");
    const r = run(["--latest", "--name", "latest-run", "--log", log, "--out", out], dir);
    assert.equal(r.code, 0, r.err);
    const fx = JSON.parse(readFileSync(out, "utf-8"));
    assert.equal(fx.runId, "run-c");
    assert.deepEqual(fx.steps[0].expect, {
      nextStep: 5,
      gate: "model",
      done: false,
      parallel: true,
      taskIds: ["pn-frontend-developer", "pn-backend-developer"],
    });
    assert.match(r.out, /replay against current engine: OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refuses runs recorded without state snapshots", () => {
  const { dir, log } = setup();
  try {
    const out = join(dir, "b.json");
    const r = run(["--run-id", "run-b", "--name", "no-state", "--log", log, "--out", out], dir);
    assert.equal(r.code, 1);
    assert.match(
      r.err,
      /1 of 1 entries have no state snapshot. Record with PNCORE_RUN_LOG_STATE=1/
    );
    assert.equal(existsSync(out), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage errors: unknown run, bad name, missing log, missing args", () => {
  const { dir, log } = setup();
  try {
    let r = run(
      ["--run-id", "nope", "--name", "x", "--log", log, "--out", join(dir, "x.json")],
      dir
    );
    assert.equal(r.code, 1);
    assert.match(r.err, /run nope not found .*\(use --list\)/);

    r = run(
      ["--run-id", "run-a", "--name", "Bad_Name", "--log", log, "--out", join(dir, "x.json")],
      dir
    );
    assert.equal(r.code, 1);
    assert.match(r.err, /--name must be kebab-case/);

    r = run(["--list", "--log", join(dir, "missing.jsonl")], dir);
    assert.equal(r.code, 1);
    assert.match(r.err, /run log not found/);

    r = run(["--run-id", "run-a", "--log", log], dir);
    assert.equal(r.code, 1);
    assert.match(r.err, /record-trajectory: build a replay fixture/);

    r = run(["--bogus"], dir);
    assert.equal(r.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
