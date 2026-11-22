import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  gateRecordProvenanceError,
  readGateVerdicts,
  readServedSteps,
  stepSequenceError,
  type ServedStep,
} from "./step-sequence.js";

const dirs: string[] = [];
function tmpFile(lines: unknown[]): string {
  const d = mkdtempSync(join(tmpdir(), "pn-seq-"));
  dirs.push(d);
  const p = join(d, "log.jsonl");
  writeFileSync(p, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n"));
  return p;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const served = (workflowType: string, step: number, nextStep: number | null, done = false) =>
  ({ workflowType, step, nextStep, done }) satisfies ServedStep;

describe("stepSequenceError", () => {
  const base = { workflowType: "design", state: {}, explicitRunId: "r1" };

  it("always allows step 0", () => {
    expect(stepSequenceError({ ...base, step: 0, explicitRunId: undefined, served: [] })).toBe(
      undefined
    );
  });

  it("requires the run_id after step 0", () => {
    expect(stepSequenceError({ ...base, step: 1, explicitRunId: undefined, served: [] })).toMatch(
      /needs state\.run_id/
    );
  });

  it("allows a step the engine served or pointed to, refuses a skip", () => {
    const s = [served("design", 0, 1), served("design", 1, 2)];
    expect(stepSequenceError({ ...base, step: 2, served: s })).toBeUndefined();
    expect(stepSequenceError({ ...base, step: 1, served: s })).toBeUndefined();
    expect(stepSequenceError({ ...base, step: 4, served: s })).toMatch(
      /not reachable.*\[0, 1, 2\]/
    );
  });

  it("refuses a run with nothing served for this workflow type", () => {
    expect(stepSequenceError({ ...base, step: 3, served: [served("full_dev", 0, 1)] })).toMatch(
      /has no served design step/
    );
  });

  it("allows the tournament handoff into full_dev step 5 only after the tournament finished", () => {
    const opts = {
      workflowType: "full_dev",
      step: 5,
      state: { tournamentHandoff: true },
      explicitRunId: "r1",
    };
    expect(
      stepSequenceError({ ...opts, served: [served("implementation_tournament", 6, null, true)] })
    ).toBeUndefined();
    expect(
      stepSequenceError({ ...opts, served: [served("implementation_tournament", 3, 4)] })
    ).toMatch(/not reachable|no served/);
    expect(
      stepSequenceError({
        ...opts,
        state: {},
        served: [served("implementation_tournament", 6, null, true)],
      })
    ).toMatch(/no served full_dev step/);
  });
});

describe("readServedSteps", () => {
  it("keeps this run's well-formed entries and skips the rest", () => {
    const p = tmpFile([
      { runId: "r1", workflowType: "design", step: 0, nextStep: 1, done: false },
      { runId: "r2", workflowType: "design", step: 0, nextStep: 1 },
      { runId: "r1", workflowType: "design", step: 4, done: true },
      { runId: "r1", step: 1 },
      "not json",
      "",
    ]);
    expect(readServedSteps(p, "r1")).toEqual([
      served("design", 0, 1),
      served("design", 4, null, true),
    ]);
    expect(readServedSteps(join(tmpdir(), "pn-seq-missing.jsonl"), "r1")).toEqual([]);
  });
});

describe("gate record provenance", () => {
  const record = { verdict: "pass", go_no_go: "go", gate_id: "g-1", confirmed_at: "t" };

  it("is not checked outside strict mode", () => {
    expect(gateRecordProvenanceError({ skepticPassed: record }, new Map())).toBeUndefined();
  });

  it("refuses a gate_id workflow_confirm never issued", () => {
    expect(
      gateRecordProvenanceError({ intent: "involved", skepticPassed: record }, new Map())
    ).toMatch(/not issued by workflow_confirm/);
  });

  it("refuses a verdict that differs from the logged one, accepts a match", () => {
    const strict = { intent: "involved", skepticPassed: record, reviewComplete: true };
    expect(gateRecordProvenanceError(strict, new Map([["g-1", "revise"]]))).toMatch(
      /does not match/
    );
    expect(gateRecordProvenanceError(strict, new Map([["g-1", "pass"]]))).toBeUndefined();
    expect(gateRecordProvenanceError(strict, new Map([["g-1", undefined]]))).toBeUndefined();
  });

  it("readGateVerdicts maps gate_id to the logged verdict", () => {
    const p = tmpFile([
      { gate_id: "g-1", verdict: "pass" },
      { gate_id: "g-2" },
      { outcome: "approved" },
      "{bad",
      "",
    ]);
    const m = readGateVerdicts(p);
    expect([...m]).toEqual([
      ["g-1", "pass"],
      ["g-2", undefined],
    ]);
    expect(readGateVerdicts(join(tmpdir(), "pn-seq-missing-gate.jsonl")).size).toBe(0);
  });
});
