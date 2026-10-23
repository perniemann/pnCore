import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rmSync } from "fs";
import { getWorkflowStep } from "./workflows.js";
import { fullDevAcceptance } from "./delivery-acceptance.js";
import {
  appendRunEvent,
  newAttestationId,
  readRunEvents,
  type GateReport,
} from "./verify-attest.js";
import { handleWorkflowStep } from "./tools/handlers.js";

const events = ".pncore/test-delivery-events.jsonl";
const gate = (go: "go" | "no_go" = "go") => ({
  verdict: go === "go" ? "pass" : "revise",
  go_no_go: go,
  gate_id: `g-${go}`,
  confirmed_at: "2026-10-22T10:00:00.000Z",
});

function attest(over: Partial<GateReport> = {}): string {
  const attestationId = newAttestationId();
  appendRunEvent({
    kind: "verify",
    run_id: "run-ledger",
    argv: ["npm", "test"],
    cwd: ".",
    exitCode: 0,
    timedOut: false,
    stdoutTail: "",
    stderrTail: "",
    startedAt: "2026-10-22T10:00:00.000Z",
    finishedAt: "2026-10-22T10:00:01.000Z",
    attestationId,
    sandbox: { backend: "unavailable", jailed: false },
    ...over,
  });
  return attestationId;
}

describe("full_dev step 6 delivery ledger and acceptance", () => {
  beforeEach(() => {
    rmSync(events, { force: true });
    vi.stubEnv("PNCORE_RUN_EVENTS_PATH", events);
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "0");
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(events, { force: true });
  });

  it("default features: acceptance is unearned and the instruction asks for a scoped ledger", () => {
    const r = getWorkflowStep("full_dev", 6, { reviewComplete: true, skepticOutputPassed: true });
    if ("error" in r) throw new Error(r.error);
    expect(r.acceptance).toBe("unearned");
    expect(r.done).toBe(true);
    for (const key of [
      "accepted[]",
      "implementedUnaccepted[]",
      "open[]",
      "remainingGates[]",
      "evidenceReuse[]",
      "nextAction",
      "'source'",
      "'static'",
      "'runtime'",
      "'product'",
    ]) {
      expect(r.instruction).toContain(key);
    }
  });

  it("default features: the handler writes no acceptance event", async () => {
    const res = await handleWorkflowStep({
      workflowType: "full_dev",
      step: 6,
      state: { run_id: "run-ledger", reviewComplete: true, skepticOutputPassed: true },
    });
    const body = JSON.parse(res.content[0].text) as { acceptance: unknown };
    expect(body.acceptance).toBe("unearned");
    const read = readRunEvents("run-ledger", { path: events, kinds: ["acceptance"] });
    expect("events" in read && read.events).toEqual([]);
  });

  it("strictSkepticGates only: computed, human earned from structured gates, verify unavailable, scope source", () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "1");
    const a = fullDevAcceptance({ reviewComplete: gate(), skepticOutputPassed: gate() });
    expect(a).toMatchObject({
      phasesPassed: true,
      humanEarned: true,
      verifyEarned: false,
      accepted: false,
      scope: "source",
    });
    expect(a !== "unearned" && a.reasons).toEqual(
      expect.arrayContaining(["verify_unavailable", "verify_not_earned"])
    );
  });

  it("disposeVerify on with a passing attestation for the run: accepted at static scope, event written", async () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const id = attest();
    const res = await handleWorkflowStep({
      workflowType: "full_dev",
      step: 6,
      state: {
        run_id: "run-ledger",
        reviewComplete: gate(),
        skepticOutputPassed: gate(),
        verifyAttestationIds: [id],
      },
    });
    const body = JSON.parse(res.content[0].text) as { acceptance: Record<string, unknown> };
    expect(body.acceptance).toMatchObject({ accepted: true, verifyEarned: true, scope: "static" });
    const read = readRunEvents("run-ledger", { path: events, kinds: ["acceptance"] });
    expect("events" in read && read.events).toEqual([
      expect.objectContaining({ kind: "acceptance", accepted: true, scope: "static", step: 6 }),
    ]);
  });

  it("disposeVerify on: failed, unknown, and foreign attestations keep scope at source with reasons", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const failed = attest({ exitCode: 1, failureClass: "missing_input" });
    const foreign = attest({ run_id: "run-other" });
    const a = fullDevAcceptance({
      run_id: "run-ledger",
      reviewComplete: gate(),
      skepticOutputPassed: gate(),
      verifyAttestationIds: [failed, "nope", foreign],
    });
    expect(a).toMatchObject({ accepted: false, verifyEarned: false, scope: "source" });
    expect(a !== "unearned" && a.reasons).toEqual(
      expect.arrayContaining([
        `verify_failed:${failed}:missing_input`,
        "unknown_attestation:nope",
        `attestation_run_mismatch:${foreign}`,
      ])
    );
  });

  it("disposeVerify on: a passing attestation without the run's own run_id earns nothing", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const other = attest({ run_id: "some-other-run" });
    const state = {
      reviewComplete: gate(),
      skepticOutputPassed: gate(),
      verifyAttestationIds: [other],
    };
    const missing = fullDevAcceptance(state);
    expect(missing).toMatchObject({ accepted: false, verifyEarned: false, scope: "source" });
    expect(missing !== "unearned" && missing.reasons).toContain("run_id_missing");
    const padded = fullDevAcceptance({ ...state, run_id: " some-other-run " });
    expect(padded).toMatchObject({ accepted: true, verifyEarned: true, scope: "static" });
  });

  it("disposeVerify on: no attestations, bare or missing gates, and no_go are not accepted", () => {
    vi.stubEnv("PNCORE_DISPOSE_VERIFY", "1");
    const a = fullDevAcceptance({ reviewComplete: true });
    expect(a).toMatchObject({ accepted: false, phasesPassed: false, humanEarned: false });
    expect(a !== "unearned" && a.reasons).toEqual(
      expect.arrayContaining([
        "reviewComplete_not_structured",
        "skepticOutputPassed_missing",
        "no_verify_attestations",
      ])
    );
    const noGo = fullDevAcceptance({ reviewComplete: gate("no_go"), skepticOutputPassed: gate() });
    expect(noGo !== "unearned" && noGo.reasons).toContain("reviewComplete_no_go");
  });

  it("step 0 and step 5 carry the relevance guidance; review stays a hard gate", () => {
    const s0 = getWorkflowStep("full_dev", 0, {});
    const s5 = getWorkflowStep("full_dev", 5, { specialistsComplete: true });
    if ("error" in s0 || "error" in s5) throw new Error("unexpected error");
    expect(s0.instruction).toContain("do not re-ask a decision already recorded");
    expect(s5.instruction).toContain("Independent review and integration remain hard gates");
    expect(s5.gate).toBe("human");
    const involved = getWorkflowStep("full_dev", 5, {
      specialistsComplete: true,
      intent: "involved",
    });
    if ("error" in involved) throw new Error(involved.error);
    expect(involved.instruction).toContain("relevance filtering never skips them");
  });
});
