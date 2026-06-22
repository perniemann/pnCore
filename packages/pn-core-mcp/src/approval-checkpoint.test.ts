import { describe, it, expect, afterEach, vi } from "vitest";
import { evaluateApprovalCheckpoint } from "./approval-checkpoint.js";

describe("evaluateApprovalCheckpoint", () => {
  it("fails when env token is unset", () => {
    const r = evaluateApprovalCheckpoint("x", "deploy", {});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.data.ok).toBe(false);
      expect(r.data.error).toMatch(/PNCORE_APPROVAL_TOKEN/);
    }
  });

  it("fails when env token is the empty string", () => {
    const r = evaluateApprovalCheckpoint("x", "deploy", { PNCORE_APPROVAL_TOKEN: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.data.code).toBe("INVALID_STATE");
      expect(r.data.error).toMatch(/PNCORE_APPROVAL_TOKEN/);
    }
  });

  it("fails when token mismatch", () => {
    const r = evaluateApprovalCheckpoint("wrong", "deploy", {
      PNCORE_APPROVAL_TOKEN: "secret",
    });
    expect(r.success).toBe(false);
  });

  it("fails (without throwing) when token length differs from env", () => {
    const call = () => evaluateApprovalCheckpoint("aa", "deploy", { PNCORE_APPROVAL_TOKEN: "aaa" });
    expect(call).not.toThrow();
    const r = call();
    expect(r.success).toBe(false);
  });

  it("error response carries INVALID_STATE code and the action_label", () => {
    const r = evaluateApprovalCheckpoint("x", "ship-prod", {});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.data.code).toBe("INVALID_STATE");
      expect(r.data.action_label).toBe("ship-prod");
    }
  });

  it("succeeds when token matches", () => {
    const r = evaluateApprovalCheckpoint("secret", "deploy", {
      PNCORE_APPROVAL_TOKEN: "secret",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.approved).toBe("deploy");
    }
  });

  it("success response carries the hard-checkpoint note", () => {
    const r = evaluateApprovalCheckpoint("secret", "deploy", {
      PNCORE_APPROVAL_TOKEN: "secret",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.note).toMatch(/Hard checkpoint passed/);
    }
  });
});

describe("evaluateApprovalCheckpoint default env (process.env)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads PNCORE_APPROVAL_TOKEN from process.env when no env arg is passed", () => {
    vi.stubEnv("PNCORE_APPROVAL_TOKEN", "secret");
    const r = evaluateApprovalCheckpoint("secret", "deploy");
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.approved).toBe("deploy");
    }
  });
});
