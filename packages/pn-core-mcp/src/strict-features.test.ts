import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("PNCORE_STRICT_SKEPTIC_GATES", () => {
  it("full_dev step 3 prepends warning when skepticPassed is bare true", async () => {
    vi.stubEnv("PNCORE_STRICT_SKEPTIC_GATES", "true");
    const { getWorkflowStep } = await import("./workflows.js");
    const r = getWorkflowStep("full_dev", 3, {
      plan: "p",
      skepticPassed: true,
      priorArt: "a",
    });
    expect(r).not.toHaveProperty("error");
    expect(String((r as { instruction: string }).instruction)).toContain("strictSkepticGates");
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
      skepticPassed: true,
      priorArt: "y",
      planArtifactPath: "docs/plans/p.md",
      planSummary: "exec summary",
    });
    expect(r).not.toHaveProperty("error");
  });
});
