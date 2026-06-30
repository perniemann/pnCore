/**
 * Per-step LLM model-tier suggestions.
 *
 * pnCore workflow steps have wildly different cognitive demand: a discovery
 * questionnaire is fine on an efficiency model, while pn-skeptic-challenge,
 * a security audit, or a strategic-frame step benefits from a premium model
 * (and sometimes MAX Mode / extended thinking).
 *
 * This module is the single source of truth for tier names, exemplar models,
 * and the inline hint format. Bump the exemplars here when Cursor's picker
 * rotates models — every workflow step's hint updates automatically.
 *
 * Disambiguation: pnCore already uses the word "tier" for *delivery* tiers
 * (MVP/Full, see `pn-core://reference/delivery-tier-criteria.md`) and
 * *context* tiers (1–4, see pn-context-engineering). This file deals only
 * with *model* tiers — the LLM-power axis surfaced in Cursor's model picker.
 */

export const MODEL_TIERS = ["fast", "standard", "premium", "premium_thinking"] as const;

export type ModelTier = (typeof MODEL_TIERS)[number];

export function isModelTier(v: unknown): v is ModelTier {
  return typeof v === "string" && (MODEL_TIERS as readonly string[]).includes(v);
}

export type TierMeta = {
  exemplar: string;
  alternates: string[];
  description: string;
};

// Centralized exemplars. Bump these (and only these) when Cursor's picker rotates.
export const TIER_META: Record<ModelTier, TierMeta> = {
  fast: {
    exemplar: "composer-2.5-fast",
    alternates: ["gemini-3-flash"],
    description:
      "Efficiency tier: mechanical formatting, summaries, asset hand-off, brief terminal output, explore subagents.",
  },
  standard: {
    exemplar: "claude-4.6-sonnet-medium-thinking",
    alternates: ["gpt-5.3-codex", "gpt-5.5-medium"],
    description:
      "Daily-driver tier: scoped reasoning, implementation, structured Q&A, checker subagents. Balanced cost.",
  },
  premium: {
    exemplar: "claude-opus-4-8-thinking-high",
    alternates: [],
    description:
      "Premium tier: plan writing, skeptic challenge, design philosophy, multi-criteria audit, security-review subagent.",
  },
  premium_thinking: {
    exemplar: "claude-opus-4-8-thinking-high + MAX",
    alternates: [],
    description:
      "Premium + MAX Mode (extended thinking): security audit, financial models, strategic frame, contract design, best-of-N judge.",
  },
};

export type SuggestedModelTier = {
  tier: ModelTier;
  exemplar: string;
  rationale: string;
};

/** Build the structured suggestedModelTier field. Falls back to TIER_META.description when no rationale given. */
export function buildSuggestedTier(
  tier: ModelTier,
  rationale: string | undefined
): SuggestedModelTier {
  const meta = TIER_META[tier];
  return {
    tier,
    exemplar: meta.exemplar,
    rationale: rationale && rationale.trim() !== "" ? rationale.trim() : meta.description,
  };
}

/** One-line inline hint suitable for prepending to an instruction. Kept terse. */
export function renderTierHint(suggested: SuggestedModelTier): string {
  return `**Suggested model tier:** ${suggested.tier} (e.g. ${suggested.exemplar}) — ${suggested.rationale}`;
}

/**
 * Apply a global tier alias (e.g. downgrade `premium_thinking` -> `premium` for
 * users without MAX Mode access). Returns the input tier when no alias matches.
 */
export function applyTierAlias(
  tier: ModelTier,
  aliases?: Partial<Record<ModelTier, ModelTier>>
): ModelTier {
  if (!aliases) return tier;
  const aliased = aliases[tier];
  return aliased && isModelTier(aliased) ? aliased : tier;
}
