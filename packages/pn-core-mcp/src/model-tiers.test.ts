import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("model-tiers helpers (pure)", () => {
  it("isModelTier accepts the four canonical values", async () => {
    const { isModelTier } = await import("./model-tiers.js");
    expect(isModelTier("fast")).toBe(true);
    expect(isModelTier("standard")).toBe(true);
    expect(isModelTier("premium")).toBe(true);
    expect(isModelTier("premium_thinking")).toBe(true);
  });

  it("isModelTier rejects junk values", async () => {
    const { isModelTier } = await import("./model-tiers.js");
    expect(isModelTier("medium")).toBe(false);
    expect(isModelTier("")).toBe(false);
    expect(isModelTier(undefined)).toBe(false);
    expect(isModelTier(42)).toBe(false);
  });

  it("buildSuggestedTier uses the centralized exemplar and falls back to TIER_META.description", async () => {
    const { buildSuggestedTier, TIER_META } = await import("./model-tiers.js");
    const s = buildSuggestedTier("premium", undefined);
    expect(s.tier).toBe("premium");
    expect(s.exemplar).toBe(TIER_META.premium.exemplar);
    expect(s.rationale).toBe(TIER_META.premium.description);
  });

  it("buildSuggestedTier prefers the supplied rationale when present", async () => {
    const { buildSuggestedTier } = await import("./model-tiers.js");
    const s = buildSuggestedTier("premium", "custom rationale");
    expect(s.rationale).toBe("custom rationale");
  });

  it("renderTierHint produces a one-line markdown hint", async () => {
    const { renderTierHint, buildSuggestedTier } = await import("./model-tiers.js");
    const hint = renderTierHint(buildSuggestedTier("premium", "deep critique"));
    expect(hint).toMatch(/^\*\*Suggested model tier:\*\* premium \(e\.g\. .+\) — deep critique$/);
    expect(hint.includes("\n")).toBe(false);
  });

  it("applyTierAlias is identity when no alias matches", async () => {
    const { applyTierAlias } = await import("./model-tiers.js");
    expect(applyTierAlias("premium_thinking")).toBe("premium_thinking");
    expect(applyTierAlias("premium_thinking", { fast: "standard" })).toBe("premium_thinking");
  });

  it("applyTierAlias remaps when an alias matches", async () => {
    const { applyTierAlias } = await import("./model-tiers.js");
    expect(applyTierAlias("premium_thinking", { premium_thinking: "premium" })).toBe("premium");
    expect(applyTierAlias("premium", { premium: "standard" })).toBe("standard");
  });
});

describe("PNCORE_FEATURES modelTierOverrides", () => {
  it("overrides the suggested tier for a specific (workflowType, step)", async () => {
    vi.stubEnv(
      "PNCORE_FEATURES",
      JSON.stringify({ modelTierOverrides: { "design.0": "premium_thinking" } })
    );
    const { resolveStepTier } = await import("./workflows.js");
    const r = resolveStepTier("design", 0);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe("premium_thinking");
  });

  it("override affects the inline hint emitted by workflow_step", async () => {
    vi.stubEnv(
      "PNCORE_FEATURES",
      JSON.stringify({ modelTierOverrides: { "design.0": "premium" } })
    );
    const { getWorkflowStep } = await import("./workflows.js");
    const result = getWorkflowStep("design", 0, {});
    expect(result).not.toHaveProperty("error");
    const r = result as { instruction: string; suggestedModelTier: { tier: string } };
    expect(r.suggestedModelTier.tier).toBe("premium");
    expect(r.instruction.startsWith("**Suggested model tier:**")).toBe(true);
  });

  it("rejects invalid tier values in overrides (sanitized away)", async () => {
    vi.stubEnv(
      "PNCORE_FEATURES",
      JSON.stringify({ modelTierOverrides: { "design.1": "ultra-mega" } })
    );
    const { resolveStepTier } = await import("./workflows.js");
    // design step 1 default is "premium"; bad override is dropped, default wins
    const r = resolveStepTier("design", 1);
    expect(r!.tier).toBe("premium");
  });
});

describe("PNCORE_FEATURES tierAliases", () => {
  it("globally remaps premium_thinking -> premium for users without MAX access", async () => {
    vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ tierAliases: { premium_thinking: "premium" } }));
    const { resolveStepTier } = await import("./workflows.js");
    // backend_audit.2 (security) is premium_thinking by default
    const r = resolveStepTier("backend_audit", 2);
    expect(r!.tier).toBe("premium");
  });

  it("alias applies after per-step override", async () => {
    vi.stubEnv(
      "PNCORE_FEATURES",
      JSON.stringify({
        modelTierOverrides: { "design.0": "premium_thinking" },
        tierAliases: { premium_thinking: "premium" },
      })
    );
    const { resolveStepTier } = await import("./workflows.js");
    const r = resolveStepTier("design", 0);
    expect(r!.tier).toBe("premium");
  });

  it("rejects invalid alias values (sanitized away)", async () => {
    vi.stubEnv(
      "PNCORE_FEATURES",
      JSON.stringify({ tierAliases: { premium_thinking: "nonsense" } })
    );
    const { resolveStepTier } = await import("./workflows.js");
    const r = resolveStepTier("backend_audit", 2);
    expect(r!.tier).toBe("premium_thinking");
  });
});

describe("resolveRoleTier", () => {
  it("maps judge to premium_thinking", async () => {
    const { resolveRoleTier } = await import("./model-tiers.js");
    const r = resolveRoleTier("judge");
    expect(r.tier).toBe("premium_thinking");
    expect(r.rationale).toMatch(/judge/i);
  });

  it("maps explorer to fast", async () => {
    const { resolveRoleTier } = await import("./model-tiers.js");
    expect(resolveRoleTier("explorer").tier).toBe("fast");
  });
});
