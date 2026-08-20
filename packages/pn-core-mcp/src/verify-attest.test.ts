import { afterEach, describe, expect, it } from "vitest";
import { unlinkSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import {
  appendRunEvent,
  defaultRunEventsPath,
  gatePassed,
  loadGateReport,
  newAttestationId,
  readRunEvents,
  type GateReport,
} from "./verify-attest.js";

const path = ".pncore/test-attest-events.jsonl";

function report(over: Partial<GateReport> = {}): GateReport {
  return {
    kind: "verify",
    run_id: "run-a",
    argv: ["npm", "test"],
    cwd: "/tmp",
    exitCode: 0,
    timedOut: false,
    stdoutTail: "",
    stderrTail: "",
    startedAt: "2026-08-20T00:00:00.000Z",
    finishedAt: "2026-08-20T00:00:01.000Z",
    attestationId: newAttestationId(),
    sandbox: { backend: "unavailable", jailed: false },
    ...over,
  };
}

afterEach(() => {
  if (existsSync(path)) unlinkSync(path);
});

describe("verify-attest", () => {
  it("defaults the run-events path", () => {
    const prev = process.env.PNCORE_RUN_EVENTS_PATH;
    delete process.env.PNCORE_RUN_EVENTS_PATH;
    expect(defaultRunEventsPath()).toBe(".pncore/run-events.jsonl");
    process.env.PNCORE_RUN_EVENTS_PATH = ".pncore/custom-events.jsonl";
    expect(defaultRunEventsPath()).toBe(".pncore/custom-events.jsonl");
    if (prev === undefined) delete process.env.PNCORE_RUN_EVENTS_PATH;
    else process.env.PNCORE_RUN_EVENTS_PATH = prev;
  });

  it("writes and reads verify + acceptance events", () => {
    const g = report({ run_id: "r1" });
    expect(appendRunEvent(g, path)).toEqual({ path: expect.any(String) });
    appendRunEvent(
      {
        kind: "acceptance",
        run_id: "r1",
        ts: "2026-08-20T00:00:02.000Z",
        workflowType: "implementation_tournament",
        step: 2,
        phasesPassed: true,
        verifyEarned: true,
        humanEarned: true,
        accepted: true,
        reasons: [],
      },
      path
    );
    const all = readRunEvents("r1", { path });
    expect("events" in all && all.events).toHaveLength(2);
    const onlyVerify = readRunEvents("r1", { path, kinds: ["verify"], limit: 1 });
    expect("events" in onlyVerify && onlyVerify.events).toHaveLength(1);
    expect(loadGateReport(g.attestationId, path)?.run_id).toBe("r1");
    expect(loadGateReport("missing", path)).toBeUndefined();
    expect(gatePassed(g)).toBe(true);
    expect(gatePassed({ ...g, exitCode: 1 })).toBe(false);
    expect(gatePassed({ ...g, timedOut: true })).toBe(false);
  });

  it("rejects path traversal and skips junk lines", () => {
    expect(appendRunEvent(report(), "../outside.jsonl")).toHaveProperty("error");
    expect(readRunEvents("x", { path: "../outside.jsonl" })).toHaveProperty("error");
    expect(loadGateReport("x", "../outside.jsonl")).toBeUndefined();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'not-json\n{"kind":"nope"}\n', "utf-8");
    const r = readRunEvents("r1", { path });
    expect("events" in r && r.events).toEqual([]);
  });

  it("returns empty events when the file is missing", () => {
    const r = readRunEvents("r1", { path: ".pncore/does-not-exist-attest.jsonl" });
    expect("events" in r && r.events).toEqual([]);
  });
});
