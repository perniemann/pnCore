import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  checkTrajectoryContinuity,
  describeTrajectory,
  groupRunLogByRun,
  isErrorExpect,
  parseRunLog,
  parseTrajectory,
  replayTrajectory,
  runLogStateEnabled,
  snapshotStateForLog,
  trajectoryFromRunLog,
  UNKNOWN_RUN_ID,
  type RunLogEntry,
  type Trajectory,
} from "./trajectory.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures", "trajectories");
const fixtureFiles = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

function loadFixture(file: string): Trajectory {
  return parseTrajectory(JSON.parse(readFileSync(join(fixturesDir, file), "utf-8")), file);
}

describe("trajectory fixtures (ADR-0017)", () => {
  it("has at least one recorded and one authored fixture", () => {
    const sources = new Set(fixtureFiles.map((f) => loadFixture(f).source));
    expect(sources.has("recorded")).toBe(true);
    expect(sources.has("authored")).toBe(true);
  });

  for (const file of fixtureFiles) {
    const t = loadFixture(file);
    describe(describeTrajectory(t), () => {
      it("file name matches fixture name", () => {
        expect(file).toBe(`${t.name}.json`);
      });
      it("is a continuous trajectory", () => {
        expect(checkTrajectoryContinuity(t)).toEqual([]);
      });
      it("replays against the current engine with zero routing drift", () => {
        const r = replayTrajectory(t);
        expect(r.mismatches).toEqual([]);
        expect(r.ok).toBe(true);
        expect(r.stepsReplayed).toBe(t.steps.length);
      });
    });
  }
});

describe("replayTrajectory grading", () => {
  const base = loadFixture("full-dev-parallel-merge.json");

  it("reports every drifted field with expected vs actual", () => {
    const drifted: Trajectory = JSON.parse(JSON.stringify(base));
    const s4 = drifted.steps.find((s) => s.step === 4)!;
    if (!isErrorExpect(s4.expect)) {
      s4.expect.nextStep = 6;
      s4.expect.gate = "human";
      s4.expect.taskIds = ["pn-frontend-developer"];
      s4.expect.instructionContains = ["this text is not in the instruction"];
    }
    const last = drifted.steps[drifted.steps.length - 1];
    if (!isErrorExpect(last.expect)) last.expect.done = false;
    const merge = drifted.steps.find(
      (s) => !isErrorExpect(s.expect) && s.expect.workflowPhase === "merge"
    )!;
    if (!isErrorExpect(merge.expect)) {
      merge.expect.workflowPhase = "github_issues";
      merge.expect.parallel = true;
    }

    const r = replayTrajectory(drifted);
    expect(r.ok).toBe(false);
    const fields = r.mismatches.map((m) => m.field).sort();
    expect(fields).toEqual(
      [
        "done",
        "gate",
        "instructionContains",
        "nextStep",
        "parallel",
        "taskIds",
        "workflowPhase",
      ].sort()
    );
    const next = r.mismatches.find((m) => m.field === "nextStep")!;
    expect(next).toMatchObject({ step: 4, expected: 6, actual: 5 });
  });

  it("grades error expectations: missing error, wrong error, unexpected error", () => {
    const t: Trajectory = {
      name: "errors",
      workflowType: "full_dev",
      source: "authored",
      steps: [
        { step: 0, state: {}, expect: { error: "should have failed" } },
        { step: 5, state: {}, expect: { error: "not the real message" } },
        { step: 5, state: {}, expect: { nextStep: 6, gate: "human", done: false } },
        { step: 5, state: {}, expect: { error: "Step 5 requires state" } },
      ],
    };
    const r = replayTrajectory(t);
    expect(r.mismatches.map((m) => [m.index, m.field])).toEqual([
      [0, "error"],
      [1, "error"],
      [2, "error"],
    ]);
    expect(r.mismatches[0].actual).toBe("(no error; step succeeded)");
    expect(r.mismatches[2].expected).toBe("(no error)");
  });
});

describe("checkTrajectoryContinuity", () => {
  it("flags unknown workflow, out-of-range steps, broken chains, and steps after done", () => {
    expect(
      checkTrajectoryContinuity({
        name: "x",
        workflowType: "nope" as never,
        source: "authored",
        steps: [],
      })
    ).toEqual(["unknown workflowType nope"]);

    const problems = checkTrajectoryContinuity({
      name: "x",
      workflowType: "design",
      source: "authored",
      steps: [
        { step: 0, state: {}, expect: { nextStep: 1, gate: "human", done: false } },
        { step: 4, state: {}, expect: { nextStep: 5, gate: "human", done: true } },
        { step: 9, state: {}, expect: { nextStep: 5, gate: "model", done: true } },
      ],
    });
    expect(problems).toHaveLength(4);
    expect(problems[0]).toMatch(
      /#1: step 4 does not continue from #0 \(step 0 → expected 1 or 0\)/
    );
    expect(problems[1]).toMatch(/#2: step 9 out of range for design \(0\.\.5\)/);
    expect(problems[2]).toMatch(
      /#2: step 9 does not continue from #1 \(step 4 → expected 5 or 4\)/
    );
    expect(problems[3]).toMatch(/#2: step 9 follows a step marked done/);
    expect(
      checkTrajectoryContinuity({
        name: "e",
        workflowType: "design",
        source: "authored",
        steps: [],
      })
    ).toEqual(["trajectory has no steps"]);
  });

  it("allows a retry of the same step after an error and same-step phases", () => {
    const t: Trajectory = {
      name: "retry",
      workflowType: "full_dev",
      source: "authored",
      steps: [
        { step: 5, state: {}, expect: { error: "requires state" } },
        {
          step: 5,
          state: {},
          expect: { nextStep: 5, gate: "model", done: false, workflowPhase: "merge" },
        },
        { step: 5, state: {}, expect: { nextStep: 6, gate: "human", done: false } },
        { step: 6, state: {}, expect: { nextStep: 6, gate: "model", done: true } },
      ],
    };
    expect(checkTrajectoryContinuity(t)).toEqual([]);
  });
});

describe("parseTrajectory", () => {
  const good = {
    name: "ok",
    workflowType: "design",
    source: "authored",
    steps: [{ step: 0, state: {}, expect: { nextStep: 1, gate: "human", done: false } }],
  };
  it("accepts a valid fixture and rejects each shape error with a precise message", () => {
    expect(parseTrajectory(good).name).toBe("ok");
    expect(() => parseTrajectory(null)).toThrow(/must be an object/);
    expect(() => parseTrajectory([])).toThrow(/must be an object/);
    expect(() => parseTrajectory({ ...good, name: " " })).toThrow(/name required/);
    expect(() => parseTrajectory({ ...good, workflowType: "zzz" })).toThrow(
      /unknown workflowType zzz/
    );
    expect(() => parseTrajectory({ ...good, source: "guess" })).toThrow(/source must be/);
    expect(() => parseTrajectory({ ...good, steps: [] })).toThrow(/non-empty array/);
    expect(() =>
      parseTrajectory({ ...good, steps: [{ step: "0", state: {}, expect: {} }] })
    ).toThrow(/steps\[0\]\.step must be a number/);
    expect(() => parseTrajectory({ ...good, steps: [{ step: 0, state: [], expect: {} }] })).toThrow(
      /steps\[0\]\.state must be an object/
    );
    expect(() => parseTrajectory({ ...good, steps: [{ step: 0, state: {} }] })).toThrow(
      /steps\[0\]\.expect required/
    );
    expect(() =>
      parseTrajectory({ ...good, steps: [{ step: 0, state: {}, expect: { error: "" } }] })
    ).toThrow(/expect\.error must be a non-empty string/);
    expect(() =>
      parseTrajectory({
        ...good,
        steps: [{ step: 0, state: {}, expect: { nextStep: 1, gate: "maybe", done: false } }],
      })
    ).toThrow(/needs nextStep:number, gate:human\|model, done:boolean/);
    expect(
      parseTrajectory({ ...good, steps: [{ step: 0, state: {}, expect: { error: "x" } }] }).steps
    ).toHaveLength(1);
  });
});

describe("run log → trajectory", () => {
  const lines = [
    JSON.stringify({
      ts: "2026-09-14T10:00:02.000Z",
      runId: "r1",
      workflowType: "design",
      step: 1,
      nextStep: 2,
      gate: "human",
      done: false,
      stateKeys: ["discoverySpec"],
      state: { discoverySpec: "x" },
    }),
    JSON.stringify({
      ts: "2026-09-14T10:00:01.000Z",
      runId: "r1",
      workflowType: "design",
      step: 0,
      nextStep: 1,
      gate: "human",
      done: false,
      stateKeys: [],
      state: {},
    }),
    JSON.stringify({
      ts: "2026-09-14T10:00:03.000Z",
      workflowType: "full_dev",
      step: 0,
      nextStep: 1,
      gate: "human",
      done: false,
      stateKeys: [],
    }),
    JSON.stringify({
      ts: "2026-09-14T10:00:04.000Z",
      runId: "r2",
      workflowType: "full_dev",
      step: 4,
      nextStep: 5,
      gate: "model",
      done: false,
      parallel: true,
      taskIds: ["a", "b"],
      stateKeys: [],
      state: { specialistList: ["a", "b"] },
    }),
    JSON.stringify({
      ts: "2026-09-14T10:00:05.000Z",
      runId: "r2",
      workflowType: "full_dev",
      step: 5,
      nextStep: 5,
      gate: "model",
      done: false,
      workflowPhase: "merge",
      stateKeys: [],
      state: { taskResults: { a: "1" } },
    }),
    "not json at all",
    JSON.stringify({ ts: "x", workflowType: "design", step: "zero" }),
    "",
  ];

  it("parses valid lines, skips malformed ones, and groups by runId ordered by ts", () => {
    const { entries, skipped } = parseRunLog(lines.join("\n"));
    expect(entries).toHaveLength(5);
    expect(skipped).toBe(2);
    const groups = groupRunLogByRun(entries);
    expect([...groups.keys()].sort()).toEqual([UNKNOWN_RUN_ID, "r1", "r2"].sort());
    expect(groups.get("r1")!.map((e) => e.step)).toEqual([0, 1]);
    expect(groups.get("r2")![0]).toMatchObject({ parallel: true, taskIds: ["a", "b"] });
    expect(groups.get("r2")![1]).toMatchObject({ workflowPhase: "merge" });
    expect(groups.get(UNKNOWN_RUN_ID)![0].state).toBeUndefined();
  });

  it("keeps file order for identical timestamps", () => {
    const same = [
      {
        ts: "t",
        runId: "r",
        workflowType: "design",
        step: 2,
        nextStep: 3,
        gate: "model",
        done: false,
        stateKeys: [],
      },
      {
        ts: "t",
        runId: "r",
        workflowType: "design",
        step: 3,
        nextStep: 4,
        gate: "model",
        done: false,
        stateKeys: [],
      },
    ].map((e) => JSON.stringify(e));
    const g = groupRunLogByRun(parseRunLog(same.join("\n")).entries);
    expect(g.get("r")!.map((e) => e.step)).toEqual([2, 3]);
  });

  it("builds a replayable trajectory carrying phase / parallel / taskIds", () => {
    const groups = groupRunLogByRun(parseRunLog(lines.join("\n")).entries);
    const t = trajectoryFromRunLog(groups.get("r2")!, { name: "r2-fixture" });
    expect(t).toMatchObject({
      name: "r2-fixture",
      workflowType: "full_dev",
      source: "recorded",
      runId: "r2",
      recordedAt: "2026-09-14T10:00:04.000Z",
    });
    expect(t.steps[0].expect).toEqual({
      nextStep: 5,
      gate: "model",
      done: false,
      parallel: true,
      taskIds: ["a", "b"],
    });
    expect(t.steps[1].expect).toEqual({
      nextStep: 5,
      gate: "model",
      done: false,
      workflowPhase: "merge",
    });
    const t1 = trajectoryFromRunLog(groups.get("r1")!, { name: "r1", runId: "explicit" });
    expect(t1.runId).toBe("explicit");
    expect(t1.steps.map((s) => s.step)).toEqual([0, 1]);
  });

  it("refuses runs without state snapshots, empty runs, and mixed workflow types", () => {
    const groups = groupRunLogByRun(parseRunLog(lines.join("\n")).entries);
    expect(() => trajectoryFromRunLog(groups.get(UNKNOWN_RUN_ID)!, { name: "x" })).toThrow(
      /1 of 1 entries have no state snapshot. Record with PNCORE_RUN_LOG_STATE=1/
    );
    expect(() => trajectoryFromRunLog([], { name: "x" })).toThrow(/no entries/);
    const mixed: RunLogEntry[] = [...groups.get("r1")!, ...groups.get("r2")!];
    expect(() => trajectoryFromRunLog(mixed, { name: "x" })).toThrow(
      /span several workflow types \(design, full_dev\)/
    );
  });
});

describe("snapshotStateForLog", () => {
  it("caps long strings, redacts tickets, bounds depth, drops undefined, keeps routing values", () => {
    const long = "a".repeat(300);
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: "too deep" } } } } } } };
    const snap = snapshotStateForLog({
      intent: "involved",
      skepticPassed: true,
      specialistList: ["x", "y"],
      plan: long,
      pncoreHumanGateTicket: "secret-ticket",
      approval_token: "tok",
      nested: { approvalToken: "tok2", ok: 1, list: [long, null, 2] },
      gone: undefined,
      ...deep,
    });
    expect(snap.intent).toBe("involved");
    expect(snap.skepticPassed).toBe(true);
    expect(snap.specialistList).toEqual(["x", "y"]);
    expect(snap.plan).toBe(`${"a".repeat(240)}…[+60 chars]`);
    expect(snap.pncoreHumanGateTicket).toBe("[redacted]");
    expect(snap.approval_token).toBe("[redacted]");
    expect((snap.nested as Record<string, unknown>).approvalToken).toBe("[redacted]");
    expect((snap.nested as Record<string, unknown>).ok).toBe(1);
    expect(((snap.nested as Record<string, unknown>).list as unknown[])[1]).toBeNull();
    expect("gone" in snap).toBe(false);
    expect(JSON.stringify(snap.l1)).toBe(
      JSON.stringify({ l2: { l3: { l4: { l5: { l6: "[object]" } } } } })
    );
    const arrDeep = snapshotStateForLog({ a: [[[[[[["x"]]]]]]] }, { maxDepth: 3 });
    expect(JSON.stringify(arrDeep)).toContain("[array:1]");
    expect(snapshotStateForLog({ s: "short" }, { maxString: 3 }).s).toBe("sho…[+2 chars]");
  });

  it("runLogStateEnabled accepts 1/true/yes/on only", () => {
    for (const v of ["1", "true", "YES", " on "]) {
      expect(runLogStateEnabled({ PNCORE_RUN_LOG_STATE: v })).toBe(true);
    }
    for (const v of ["", "0", "false", "no", undefined]) {
      expect(runLogStateEnabled({ PNCORE_RUN_LOG_STATE: v })).toBe(false);
    }
  });
});

describe("describeTrajectory", () => {
  it("renders the route with ! for expected errors", () => {
    const t = loadFixture("design-iteration-cap-authored.json");
    expect(describeTrajectory(t)).toBe(
      "design-iteration-cap-authored [design, authored, 4 steps: 4!→4→3→4]"
    );
  });
});
