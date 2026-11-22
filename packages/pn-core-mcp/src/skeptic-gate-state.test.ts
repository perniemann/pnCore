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

  it("errors on invalid gate record shape when strict mode enabled", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(6, { reviewComplete: { verdict: "proceed" } }, [
      "reviewComplete",
    ]);
    expect(r?.error).toContain("structured gate record");
  });

  it("passes with valid gate record when intent is involved", async () => {
    const { applySkepticGateStateChecks } = await import("./skeptic-gate-state.js");
    const r = applySkepticGateStateChecks(
      3,
      {
        intent: "involved",
        skepticPassed: {
          verdict: "proceed",
          go_no_go: "go",
          gate_id: "g-1",
          confirmed_at: "2026-06-29T00:00:00.000Z",
        },
      },
      ["skepticPassed"]
    );
    expect(r).toBeUndefined();
  });

  it("state check defers a no_go with a ticket string to handler ticket validation", async () => {
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

describe("strictGateRecordsRequired", () => {
  it("true when intent is involved", async () => {
    const { strictGateRecordsRequired } = await import("./skeptic-gate-state.js");
    expect(strictGateRecordsRequired({ intent: "involved" })).toBe(true);
  });

  it("true when PNCORE_STRICT_SKEPTIC_GATES is set", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { strictGateRecordsRequired } = await import("./skeptic-gate-state.js");
    expect(strictGateRecordsRequired({ intent: "full_auto" })).toBe(true);
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
  });});

describe("noGoTicketRequired", () => {
  const noGo = {
    verdict: "revise",
    go_no_go: "no_go",
    gate_id: "g-1",
    confirmed_at: "2026-11-22T00:00:00.000Z",
  };

  it("is false outside strict mode", async () => {
    const { noGoTicketRequired } = await import("./skeptic-gate-state.js");
    expect(noGoTicketRequired({ skepticPassed: noGo })).toBe(false);
  });

  it("is true for a strict no_go record, even when a ticket string is present", async () => {
    const { noGoTicketRequired } = await import("./skeptic-gate-state.js");
    expect(
      noGoTicketRequired({ intent: "involved", skepticPassed: noGo, pncoreHumanGateTicket: "x" })
    ).toBe(true);
  });

  it("is false when the iteration cap was approved or the verdict is go", async () => {
    const { noGoTicketRequired } = await import("./skeptic-gate-state.js");
    expect(
      noGoTicketRequired({ intent: "involved", skepticPassed: noGo, iterationCapApproved: true })
    ).toBe(false);
    expect(
      noGoTicketRequired({ intent: "involved", skepticPassed: { ...noGo, go_no_go: "go" } })
    ).toBe(false);
  });
});
