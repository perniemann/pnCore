import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("applySkepticGateStateChecks", () => {
  it("no-op when strict mode disabled", async () => {
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    expect(
      applySkepticGateStateChecks(3, { skepticPassed: true }, ["skepticPassed"])
    ).toBeUndefined();
  });

  it("errors on bare true when strict mode enabled globally", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(3, { skepticPassed: true }, ["skepticPassed"]);
    expect(r?.error).toContain("bare true");
  });

  it("errors on bare true when intent is involved", async () => {
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(5, { intent: "involved", reviewComplete: true }, [
      "reviewComplete",
    ]);
    expect(r?.error).toContain("bare true");
  });

  it("no-op on bare true when intent is not involved and strict disabled", async () => {
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    expect(
      applySkepticGateStateChecks(3, { intent: "full_auto", skepticPassed: true }, [
        "skepticPassed",
      ])
    ).toBeUndefined();
  });

  it("blocks no_go without iterationCapApproved", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(
      5,
      {
        skepticOutputPassed: {
          verdict: "revise",
          go_no_go: "no_go",
          gate_id: "g-1",
          confirmed_at: new Date().toISOString(),
        },
      },
      ["skepticOutputPassed"]
    );
    expect(r?.error).toContain("no_go");
  });

  it("allows no_go when human gate ticket is present", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(
      3,
      {
        skepticPassed: {
          verdict: "revise",
          go_no_go: "no_go",
          gate_id: "g-1",
          confirmed_at: new Date().toISOString(),
        },
        pncoreHumanGateTicket: "ticket-abc",
      },
      ["skepticPassed"]
    );
    expect(r).toBeUndefined();
  });
});

describe("isSkepticGateRecord", () => {
  it("rejects non-objects and incomplete records", async () => {
    const { isSkepticGateRecord } = await import("./skeptic-gate-state.js");
    expect(isSkepticGateRecord(null)).toBe(false);
    expect(isSkepticGateRecord([])).toBe(false);
    expect(isSkepticGateRecord({ verdict: "proceed" })).toBe(false);
    expect(
      isSkepticGateRecord({
        verdict: "proceed",
        gate_id: "g",
        confirmed_at: "2026-05-19T00:00:00.000Z",
      })
    ).toBe(true);
  });
});
