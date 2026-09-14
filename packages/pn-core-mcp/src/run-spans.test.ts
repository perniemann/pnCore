import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, relative } from "path";
import {
  beginStepSpan,
  buildRunTimeline,
  currentStepIndex,
  readTrail,
  recoverCursorFromLog,
  resetStepSpans,
  roundMs,
  trailPaths,
  type TrailRecord,
} from "./run-spans.js";
import { parseRunLog, type RunLogEntry } from "./trajectory.js";

const T0 = Date.parse("2026-09-14T10:00:00.000Z");
const iso = (offsetMs: number) => new Date(T0 + offsetMs).toISOString();

function stepEntry(over: Partial<RunLogEntry> & { ts: string; step: number }): RunLogEntry {
  return {
    runId: "r1",
    workflowType: "full_dev",
    nextStep: over.step + 1,
    gate: "human",
    done: false,
    stateKeys: [],
    ...over,
  };
}

describe("trailPaths", () => {
  it("uses defaults and honours the writers' env overrides", () => {
    const d = trailPaths({});
    expect(d).toEqual({
      steps: ".pncore/workflow-runs.jsonl",
      loads: ".pncore/skill-load-log.jsonl",
      usage: ".pncore/usage.jsonl",
      handoff: ".pncore/workflow-handoff.jsonl",
      gate: ".pncore/gate-log.jsonl",
      events: ".pncore/run-events.jsonl",
    });
    const o = trailPaths({
      PNCORE_RUN_LOG: "x/runs.jsonl",
      PNCORE_HANDOFF_LOG: "x/h.jsonl",
      PNCORE_RUN_EVENTS_PATH: "x/e.jsonl",
    });
    expect(o.steps).toBe("x/runs.jsonl");
    expect(o.handoff).toBe("x/h.jsonl");
    expect(o.events).toBe("x/e.jsonl");
    // Empty PNCORE_RUN_LOG disables logging for the writer; the reader falls back to the default.
    expect(trailPaths({ PNCORE_RUN_LOG: "" }).steps).toBe(".pncore/workflow-runs.jsonl");
  });
});

describe("readTrail", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(process.cwd(), "tmp-run-spans-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns records matching run_id or runId, skips others and malformed lines", () => {
    const p = join(dir, "t.jsonl");
    writeFileSync(
      p,
      [
        JSON.stringify({ ts: iso(0), run_id: "a", tool: "get_skill", id: "x" }),
        JSON.stringify({ ts: iso(1), runId: "a", step: 0 }),
        JSON.stringify({ ts: iso(2), run_id: "b" }),
        JSON.stringify({ run_id: "a", noTs: true }),
        "garbage",
        "",
      ].join("\n")
    );
    const r = readTrail(relative(process.cwd(), p), "a");
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.records).toHaveLength(3);
    expect(r.records[0]).toMatchObject({ tool: "get_skill" });
    expect(r.records[1]).toMatchObject({ runId: "a", step: 0 });
    expect(r.records[2].ts).toBe("");
  });

  it("returns empty for a missing file and an error for paths outside cwd", () => {
    const missing = readTrail(relative(process.cwd(), join(dir, "nope.jsonl")), "a");
    expect(missing).toMatchObject({ records: [] });
    const bad = readTrail(join(tmpdir(), "outside.jsonl"), "a");
    expect("error" in bad).toBe(true);
  });

  it("drops the partial first line of a bounded tail read", () => {
    const p = join(dir, "big.jsonl");
    const lines = Array.from({ length: 50 }, (_, i) =>
      JSON.stringify({ ts: iso(i), run_id: "a", i, pad: "p".repeat(40) })
    );
    writeFileSync(p, lines.join("\n") + "\n");
    const r = readTrail(relative(process.cwd(), p), "a", { scanMax: 600 });
    if ("error" in r) throw new Error(r.error);
    expect(r.records.length).toBeGreaterThan(3);
    expect(r.records.length).toBeLessThan(50);
    expect(r.records[r.records.length - 1].i).toBe(49);
  });
});

describe("step span cursor", () => {
  beforeEach(() => resetStepSpans());

  it("numbers steps per run and measures wall time since the previous step", () => {
    const a0 = beginStepSpan("a", { nowMs: T0 });
    expect(a0).toEqual({ stepIndex: 0, sinceLastStepMs: null });
    const b0 = beginStepSpan("b", { nowMs: T0 + 10 });
    expect(b0).toEqual({ stepIndex: 0, sinceLastStepMs: null });
    const a1 = beginStepSpan("a", { nowMs: T0 + 1500 });
    expect(a1).toEqual({ stepIndex: 1, sinceLastStepMs: 1500 });
    const a2 = beginStepSpan("a", { nowMs: T0 + 1400 });
    expect(a2).toEqual({ stepIndex: 2, sinceLastStepMs: 0 });
    expect(currentStepIndex("a")).toBe(2);
    expect(currentStepIndex("b")).toBe(0);
    expect(currentStepIndex("zzz")).toBeUndefined();
    expect(currentStepIndex(undefined)).toBeUndefined();
  });

  it("recovers the cursor from the run-log tail after a restart", () => {
    const dir = mkdtempSync(join(process.cwd(), "tmp-run-spans-"));
    try {
      const rel = relative(process.cwd(), join(dir, "runs.jsonl"));
      writeFileSync(
        join(dir, "runs.jsonl"),
        [
          JSON.stringify(stepEntry({ ts: iso(0), step: 0, stepIndex: 0 })),
          JSON.stringify(stepEntry({ ts: iso(5000), step: 1, stepIndex: 1 })),
          JSON.stringify(stepEntry({ ts: iso(2000), step: 0, runId: "other", stepIndex: 7 })),
        ].join("\n") + "\n"
      );
      expect(recoverCursorFromLog("r1", rel)).toEqual({ stepIndex: 1, lastTsMs: T0 + 5000 });
      expect(recoverCursorFromLog("nobody", rel)).toBeNull();
      // Unknown run with a log path: recovery finds nothing, span starts at 0 with the real clock.
      const fresh = beginStepSpan("nobody", { logPath: rel });
      expect(fresh).toEqual({ stepIndex: 0, sinceLastStepMs: null });
      const next = beginStepSpan("r1", { nowMs: T0 + 8000, logPath: rel });
      expect(next).toEqual({ stepIndex: 2, sinceLastStepMs: 3000 });
      // Recovery happens once; the in-memory cursor is authoritative afterwards.
      rmSync(join(dir, "runs.jsonl"));
      expect(beginStepSpan("r1", { nowMs: T0 + 9000, logPath: rel })).toEqual({
        stepIndex: 3,
        sinceLastStepMs: 1000,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to file order for pre-span log entries without stepIndex", () => {
    const dir = mkdtempSync(join(process.cwd(), "tmp-run-spans-"));
    try {
      const rel = relative(process.cwd(), join(dir, "runs.jsonl"));
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "runs.jsonl"),
        [
          JSON.stringify(stepEntry({ ts: iso(0), step: 0 })),
          JSON.stringify(stepEntry({ ts: iso(100), step: 1 })),
          JSON.stringify(stepEntry({ ts: iso(200), step: 2 })),
        ].join("\n")
      );
      expect(recoverCursorFromLog("r1", rel)).toEqual({ stepIndex: 2, lastTsMs: T0 + 200 });
      expect(recoverCursorFromLog("r1", join(tmpdir(), "outside.jsonl"))).toBeNull();
      expect(
        recoverCursorFromLog("r1", relative(process.cwd(), join(dir, "missing.jsonl")))
      ).toBeNull();
      // Records that match the run but are not valid step entries recover nothing.
      writeFileSync(
        join(dir, "junk.jsonl"),
        JSON.stringify({ ts: iso(0), runId: "r1", note: "not a step entry" }) + "\n"
      );
      expect(
        recoverCursorFromLog("r1", relative(process.cwd(), join(dir, "junk.jsonl")))
      ).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("roundMs keeps two decimals", () => {
    expect(roundMs(0.123456)).toBe(0.12);
    expect(roundMs(12)).toBe(12);
    expect(roundMs(3.999)).toBe(4);
  });
});

describe("buildRunTimeline", () => {
  const steps: RunLogEntry[] = [
    stepEntry({
      ts: iso(0),
      step: 0,
      stepIndex: 0,
      sinceLastStepMs: null,
      engineMs: 0.5,
      stateKeys: ["request"],
    }),
    stepEntry({
      ts: iso(60_000),
      step: 1,
      stepIndex: 1,
      sinceLastStepMs: 60_000,
      engineMs: 0.25,
      workflowPhase: "plan",
    }),
    stepEntry({
      ts: iso(90_000),
      step: 4,
      stepIndex: 2,
      sinceLastStepMs: 30_000,
      engineMs: 1.2,
      parallel: true,
      taskIds: ["pn-frontend-developer", "pn-backend-developer"],
    }),
    stepEntry({
      ts: iso(300_000),
      step: 6,
      nextStep: 6,
      stepIndex: 3,
      sinceLastStepMs: 210_000,
      engineMs: 0.3,
      gate: "model",
      done: true,
    }),
  ];
  const rec = (o: Record<string, unknown>): TrailRecord => ({ ...o, ts: String(o.ts ?? "") });

  it("joins loads by stepIndex, other trails by time window, and computes totals + slowest", () => {
    const t = buildRunTimeline("r1", {
      steps: [steps[2], steps[0], steps[3], steps[1]], // unsorted on purpose
      loads: [
        rec({ ts: iso(10), tool: "get_skill", id: "pn-planning", run_id: "r1", stepIndex: 0 }),
        rec({ ts: iso(65_000), tool: "get_rule", id: "pn-build-gate", run_id: "r1" }), // by ts → step 1
        rec({
          ts: iso(95_000),
          tool: "get_agent",
          id: "pn-frontend-developer",
          run_id: "r1",
          stepIndex: 2,
        }),
        rec({ ts: "", tool: "get_skill", id: "no-ts", run_id: "r1" }), // no ts → last step
        rec({ ts: iso(-5000), tool: "get_skill", id: "before-first", run_id: "r1" }), // before first → step 0
      ],
      usage: [
        rec({ ts: iso(100_000), run_id: "r1", inputTokens: 1000, outputTokens: 200 }),
        rec({ ts: iso(200_000), run_id: "r1", inputTokens: 500, outputTokens: "n/a" }),
      ],
      handoff: [rec({ ts: iso(299_000), run_id: "r1", step: 4, summary: "s".repeat(500) })],
      gate: [rec({ ts: iso(70_000), run_id: "r1", gate_type: "plan" })],
      events: [
        rec({ ts: iso(250_000), kind: "verify", run_id: "r1", exitCode: 0 }),
        rec({ ts: iso(299_500), kind: "acceptance", run_id: "r1", accepted: true }),
      ],
    });

    expect(t.workflowType).toBe("full_dev");
    expect(t.startedAt).toBe(iso(0));
    expect(t.endedAt).toBe(iso(300_000));
    expect(t.wallMs).toBe(300_000);
    expect(t.done).toBe(true);
    expect(t.accepted).toBe(true);
    expect(t.steps.map((s) => s.stepIndex)).toEqual([0, 1, 2, 3]);
    expect(t.steps[0].loads.map((l) => l.id)).toEqual(["pn-planning", "before-first"]);
    expect(t.steps[1].loads.map((l) => l.id)).toEqual(["pn-build-gate"]);
    expect(t.steps[2].loads.map((l) => l.id)).toEqual(["pn-frontend-developer"]);
    expect(t.steps[2]).toMatchObject({
      parallel: true,
      taskIds: ["pn-frontend-developer", "pn-backend-developer"],
    });
    expect(t.steps[3].loads.map((l) => l.id)).toEqual(["no-ts"]);
    expect(t.steps[2].usage).toEqual({ inputTokens: 1500, outputTokens: 200 });
    expect(t.steps[2].handoff).toHaveLength(200);
    expect(t.steps[2].verify).toBe(1);
    expect(t.steps[1].gates).toBe(1);
    expect(t.steps[1].workflowPhase).toBe("plan");
    expect(t.totals).toEqual({
      steps: 4,
      engineMs: 2.25,
      loads: 5,
      verify: 1,
      gates: 1,
      inputTokens: 1500,
      outputTokens: 200,
    });
    expect(t.slowest).toEqual({ stepIndex: 3, step: 6, sinceLastStepMs: 210_000 });
  });

  it("handles an empty run and pre-span entries", () => {
    const empty = buildRunTimeline("none", {
      steps: [],
      loads: [rec({ ts: iso(0) })],
      usage: [rec({ ts: iso(0), inputTokens: "?", outputTokens: 3 })],
      handoff: [rec({ ts: iso(0), summary: "s" })],
      gate: [rec({ ts: iso(0) })],
      events: [rec({ ts: iso(0), kind: "verify" }), rec({ ts: iso(1), kind: "acceptance" })],
    });
    expect(empty).toMatchObject({
      workflowType: null,
      startedAt: null,
      endedAt: null,
      wallMs: null,
      done: false,
      steps: [],
      slowest: null,
      accepted: null,
    });
    expect(empty.totals.loads).toBe(0);

    const legacy = buildRunTimeline("r1", {
      steps: [stepEntry({ ts: iso(0), step: 0 }), stepEntry({ ts: iso(1000), step: 1 })],
      events: [rec({ ts: iso(500), kind: "acceptance", run_id: "r1", accepted: false })],
    });
    expect(legacy.steps.map((s) => [s.stepIndex, s.sinceLastStepMs, s.engineMs])).toEqual([
      [0, null, null],
      [1, null, null],
    ]);
    expect(legacy.slowest).toBeNull();
    expect(legacy.accepted).toBe(false);
    expect(legacy.wallMs).toBe(1000);
  });

  it("round-trips through parseRunLog (what the query handler feeds it)", () => {
    const text = steps.map((s) => JSON.stringify(s)).join("\n");
    const { entries } = parseRunLog(text);
    expect(entries.map((e) => [e.stepIndex, e.sinceLastStepMs, e.engineMs])).toEqual([
      [0, null, 0.5],
      [1, 60_000, 0.25],
      [2, 30_000, 1.2],
      [3, 210_000, 0.3],
    ]);
    const t = buildRunTimeline("r1", { steps: entries });
    expect(t.totals.engineMs).toBe(2.25);
    expect(t.slowest?.stepIndex).toBe(3);
  });
});
