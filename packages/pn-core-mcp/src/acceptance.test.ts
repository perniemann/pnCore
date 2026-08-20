import { describe, expect, it } from "vitest";
import { computeAcceptance } from "./acceptance.js";

describe("computeAcceptance", () => {
  it("accepts only when all three legs are true", () => {
    const a = computeAcceptance({
      phasesPassed: true,
      verifyEarned: true,
      humanEarned: true,
    });
    expect(a.accepted).toBe(true);
    expect(a.reasons).toEqual([]);
  });

  it("keeps phasesPassed when every attested path is red", () => {
    const a = computeAcceptance({
      phasesPassed: true,
      verifyEarned: true,
      humanEarned: true,
      accepted: false,
      reasons: ["zero_survivors"],
    });
    expect(a.phasesPassed).toBe(true);
    expect(a.accepted).toBe(false);
    expect(a.reasons).toContain("zero_survivors");
    expect(a.reasons).toContain("not_accepted");
  });

  it("records missing legs", () => {
    const a = computeAcceptance({
      phasesPassed: true,
      verifyEarned: false,
      humanEarned: false,
    });
    expect(a.accepted).toBe(false);
    expect(a.reasons).toEqual(["verify_not_earned", "human_not_earned", "not_accepted"]);
  });

  it("marks phases incomplete", () => {
    const a = computeAcceptance({
      phasesPassed: false,
      verifyEarned: true,
      humanEarned: true,
    });
    expect(a.accepted).toBe(false);
    expect(a.reasons).toContain("phases_incomplete");
  });
});
