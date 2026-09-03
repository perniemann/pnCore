import { describe, expect, it } from "vitest";
import {
  applyOrchestrationLead,
  normalizeSessionModelSlug,
  resolveLeadOrchestrationMode,
  resolveSessionModelTier,
} from "./orchestration-lead.js";

describe("normalizeSessionModelSlug", () => {
  it("strips + MAX suffix and lowercases", () => {
    expect(normalizeSessionModelSlug("Claude Opus + MAX")).toBe("claude-opus");
  });
});

describe("resolveSessionModelTier", () => {
  it("maps fable exemplar to long_horizon", () => {
    expect(resolveSessionModelTier("claude-fable-5")).toBe("long_horizon");
  });

  it("maps Fable 5.1 exemplar and provider-prefixed slug to long_horizon", () => {
    expect(resolveSessionModelTier("claude-fable-5-1")).toBe("long_horizon");
    expect(resolveSessionModelTier("anthropic/claude-fable-5-1")).toBe("long_horizon");
  });

  it("maps codex to standard", () => {
    expect(resolveSessionModelTier("gpt-5.3-codex")).toBe("standard");
  });

  it("maps long_horizon alternate opus slug", () => {
    expect(resolveSessionModelTier("claude-opus-4-8-thinking-high")).toBe("long_horizon");
  });

  it("returns null for unknown slug", () => {
    expect(resolveSessionModelTier("unknown-model-xyz")).toBeNull();
  });

  it("does not match bare codex substring inside gpt-5.3-codex", () => {
    expect(resolveSessionModelTier("codex")).toBeNull();
  });

  it("does not match exemplar embedded as non-terminal segment", () => {
    expect(resolveSessionModelTier("not-claude-opus-4-8-thinking-high")).toBeNull();
  });

  it("maps provider-prefixed picker slug", () => {
    expect(resolveSessionModelTier("anthropic/claude-fable-5")).toBe("long_horizon");
    expect(resolveSessionModelTier("anthropic-claude-fable-5")).toBe("long_horizon");
    expect(resolveSessionModelTier("bedrock-claude-fable-5")).toBe("long_horizon");
    expect(resolveSessionModelTier("aws-bedrock-claude-fable-5")).toBe("long_horizon");
  });

  it("maps version-suffixed exemplar slug", () => {
    expect(resolveSessionModelTier("claude-fable-5-preview")).toBe("long_horizon");
  });

  it("maps multi-segment display name to highest matching tier", () => {
    expect(resolveSessionModelTier("Claude Opus + MAX")).toBe("long_horizon");
  });

  it("does not match single-segment display token", () => {
    expect(resolveSessionModelTier("claude")).toBeNull();
    expect(resolveSessionModelTier("composer")).toBeNull();
  });
});

describe("resolveLeadOrchestrationMode", () => {
  it("lead mode when leadModelTier is long_horizon", () => {
    const r = resolveLeadOrchestrationMode({ leadModelTier: "long_horizon" }, { parallel: true });
    expect(r.mode).toBe("lead");
    expect(r.contractBlock).toContain("Orchestrator lead mode");
  });

  it("light_delegate when premium + parallel", () => {
    const r = resolveLeadOrchestrationMode({ leadModelTier: "premium" }, { parallel: true });
    expect(r.mode).toBe("light_delegate");
    expect(r.contractBlock).toContain("Light delegate mode");
  });

  it("light_delegate when orchestrationIntent + parallel on standard lead", () => {
    const r = resolveLeadOrchestrationMode(
      { leadModelTier: "standard", orchestrationIntent: true },
      { parallel: true }
    );
    expect(r.mode).toBe("light_delegate");
  });

  it("implementer without lead signals", () => {
    const r = resolveLeadOrchestrationMode({}, { parallel: false });
    expect(r.mode).toBe("implementer");
    expect(r.contractBlock).toBe("");
  });

  it("soft hint on parallel implementer", () => {
    const r = resolveLeadOrchestrationMode({}, { parallel: true });
    expect(r.mode).toBe("implementer");
    expect(r.softHint).toContain("leadModelTier");
  });

  it("preserves long_horizon lead mode when tierAliases downgrade exemplar", () => {
    const r = resolveLeadOrchestrationMode(
      { leadModelTier: "long_horizon" },
      { parallel: true, tierAliases: { long_horizon: "premium" } }
    );
    expect(r.mode).toBe("lead");
    expect(r.declaredLeadTier).toBe("long_horizon");
    expect(r.effectiveLeadTier).toBe("premium");
  });

  it("infers tier from sessionModel but stays implementer until parallel fan-out", () => {
    const r = resolveLeadOrchestrationMode({ sessionModel: "claude-fable-5" });
    expect(r.declaredLeadTier).toBe("long_horizon");
    expect(r.mode).toBe("implementer");
    expect(r.contractBlock).toBe("");
  });

  it("sessionModel long_horizon + parallel enables lead mode", () => {
    const r = resolveLeadOrchestrationMode({ sessionModel: "claude-fable-5" }, { parallel: true });
    expect(r.mode).toBe("lead");
    expect(r.contractBlock).toContain("Orchestrator lead mode");
  });

  it("long_horizon without parallel stays implementer with soft hint", () => {
    const r = resolveLeadOrchestrationMode({ leadModelTier: "long_horizon" }, { parallel: false });
    expect(r.mode).toBe("implementer");
    expect(r.contractBlock).toBe("");
    expect(r.softHint).toContain("parallel fan-out");
  });

  it("long_horizon + orchestrationIntent on non-parallel step enables lead mode", () => {
    const r = resolveLeadOrchestrationMode(
      { leadModelTier: "long_horizon", orchestrationIntent: true },
      { parallel: false }
    );
    expect(r.mode).toBe("lead");
    expect(r.contractBlock).toContain("Orchestrator lead mode");
  });

  it("premium + orchestrationIntent without parallel enables light_delegate", () => {
    const r = resolveLeadOrchestrationMode(
      { leadModelTier: "premium", orchestrationIntent: true },
      { parallel: false }
    );
    expect(r.mode).toBe("light_delegate");
    expect(r.contractBlock).toContain("Light delegate mode");
  });
});

describe("applyOrchestrationLead", () => {
  it("augments parallel tasks with delegate line in lead mode", () => {
    const out = applyOrchestrationLead(
      {
        instruction: "Run parallel work.",
        parallel: true,
        tasks: [{ instruction: "Do slice A.", id: "a" }],
      },
      { leadModelTier: "long_horizon" }
    );
    expect(out.orchestrationMode).toBe("lead");
    expect(out.instruction).toContain("Orchestrator lead mode");
    expect(out.tasks![0].instruction).toContain("Delegate implementation");
    expect(out.tasks![0].suggestedSubagentTier?.tier).toBe("standard");
  });
});
