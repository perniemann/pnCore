import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("PNCORE_STRICT_SKEPTIC_GATES", () => {
  it("full_dev step 3 errors when skepticPassed is bare true under strict gates", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { getWorkflowStep } = await import("./workflows.js");
    const r = getWorkflowStep("full_dev", 3, {
      plan: "p",
      skepticPassed: true,
      priorArt: "a",
    });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("bare true");
  });

  it("full_dev step 3 errors when intent is involved and skepticPassed is bare true", async () => {
    const { getWorkflowStep } = await import("./workflows.js");
    const r = getWorkflowStep("full_dev", 3, {
      plan: "p",
      skepticPassed: true,
      priorArt: "a",
      intent: "involved",
    });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("bare true");
  });
});

describe("PNCORE_FEATURES strictPlanSummary", () => {
  it("full_dev step 3 errors without planArtifactPath and planSummary", async () => {
    vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ strictPlanSummary: true }));
    const { getWorkflowStep } = await import("./workflows.js");
    const r = getWorkflowStep("full_dev", 3, {
      plan: "x",
      skepticPassed: true,
      priorArt: "y",
    });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("planArtifactPath");
  });

  it("full_dev step 3 passes when strict fields present", async () => {
    vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ strictPlanSummary: true }));
    const { getWorkflowStep } = await import("./workflows.js");
    const r = getWorkflowStep("full_dev", 3, {
      plan: "x",
      skepticPassed: {
        verdict: "proceed",
        go_no_go: "go",
        gate_id: "g-1",
        confirmed_at: "2026-06-29T00:00:00.000Z",
      },
      priorArt: "y",
      planArtifactPath: "docs/plans/p.md",
      planSummary: "exec summary",
    });
    expect(r).not.toHaveProperty("error");
  });
});
