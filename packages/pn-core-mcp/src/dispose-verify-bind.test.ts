import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, unlinkSync } from "fs";
import {
  applyTournamentDisposeVerify,
  computedObjectiveGateResults,
} from "./dispose-verify-bind.js";
import { appendRunEvent, newAttestationId, type GateReport } from "./verify-attest.js";

const eventsPath = ".pncore/test-bind-events.jsonl";

function report(over: Partial<GateReport> = {}): GateReport {
  return {
    kind: "verify",
    run_id: "run-t",
    argv: ["npm", "test"],
    cwd: ".",
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
  vi.unstubAllEnvs();
  if (existsSync(eventsPath)) unlinkSync(eventsPath);
});

describe("applyTournamentDisposeVerify", () => {
  it("skips when the flag is off", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "0");
    expect(applyTournamentDisposeVerify({})).toEqual({ skipped: true });
  });

  it("requires attestation ids when the flag is on", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const r = applyTournamentDisposeVerify({
      objectiveGateResults: [{ candidate_id: "path-a", passed: true }],
    });
    expect(r).toHaveProperty("error");
  });

  it("computes survivors from attested exit codes and ignores agent passed", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", eventsPath);
    const green = report({ candidate_id: "path-a", exitCode: 0 });
    const red = report({ candidate_id: "path-b", exitCode: 1 });
    appendRunEvent(green, eventsPath);
    appendRunEvent(red, eventsPath);
    const r = applyTournamentDisposeVerify({
      candidates: [{ id: "path-a" }, { id: "path-b" }],
      verifyAttestationIds: [green.attestationId, red.attestationId],
      objectiveGateResults: [
        { candidate_id: "path-a", passed: false },
        { candidate_id: "path-b", passed: true, attestationId: red.attestationId },
      ],
    });
    expect(r).toMatchObject({ skipped: false, survivors: ["path-a"] });
    if ("survivors" in r) {
      expect(r.acceptance.phasesPassed).toBe(true);
      expect(r.acceptance.accepted).toBe(true);
      expect(computedObjectiveGateResults(r.reports)[0]?.passed).toBe(true);
      expect(computedObjectiveGateResults(r.reports)[1]?.passed).toBe(false);
    }
  });

  it("errors on unknown attestation and missing candidate report", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", eventsPath);
    expect(applyTournamentDisposeVerify({ verifyAttestationIds: ["missing"] })).toHaveProperty(
      "error"
    );
    const green = report({ candidate_id: "path-a" });
    appendRunEvent(green, eventsPath);
    const r = applyTournamentDisposeVerify({
      candidates: [{ id: "path-a" }, { id: "path-b" }],
      verifyAttestationIds: [green.attestationId],
    });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("path-b");
  });

  it("reads attestation ids from objectiveGateResults when the array is omitted", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", eventsPath);
    const green = report({ candidate_id: "path-a", exitCode: 0 });
    appendRunEvent(green, eventsPath);
    const r = applyTournamentDisposeVerify({
      objectiveGateResults: [
        { candidate_id: "path-a", passed: false, attestationId: green.attestationId },
      ],
    });
    expect(r).toMatchObject({ skipped: false, survivors: ["path-a"] });
  });

  it("returns accepted false with phasesPassed when all red", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", eventsPath);
    const red = report({ candidate_id: "path-a", exitCode: 1 });
    appendRunEvent(red, eventsPath);
    const r = applyTournamentDisposeVerify({
      verifyAttestationIds: [red.attestationId],
    });
    expect(r).toMatchObject({
      skipped: false,
      survivors: [],
      acceptance: { phasesPassed: true, accepted: false },
    });
  });
});
