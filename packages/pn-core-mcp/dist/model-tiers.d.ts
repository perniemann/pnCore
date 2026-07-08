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
export declare const MODEL_TIERS: readonly ["fast", "standard", "premium", "premium_thinking", "long_horizon"];
export type ModelTier = (typeof MODEL_TIERS)[number];
export declare function isModelTier(v: unknown): v is ModelTier;
export type TierMeta = {
    exemplar: string;
    alternates: string[];
    description: string;
};
export declare const TIER_META: Record<ModelTier, TierMeta>;
export type SuggestedModelTier = {
    tier: ModelTier;
    exemplar: string;
    rationale: string;
};
/** Subagent role → model tier (P2 best-of-N / routing). */
export type SubagentRole = "explorer" | "builder" | "judge" | "checker" | "orchestrator";
export declare const SUBAGENT_ROLE_TIERS: Record<SubagentRole, ModelTier>;
export declare function isSubagentRole(v: unknown): v is SubagentRole;
/** Tier suggestion for Task subagent_type routing (explorer/builder/judge/checker). */
export declare function resolveRoleTier(role: SubagentRole, tierAliases?: Partial<Record<ModelTier, ModelTier>>): SuggestedModelTier;
/** Build the structured suggestedModelTier field. Falls back to TIER_META.description when no rationale given. */
export declare function buildSuggestedTier(tier: ModelTier, rationale: string | undefined): SuggestedModelTier;
/** One-line inline hint suitable for prepending to an instruction. Kept terse. */
export declare function renderTierHint(suggested: SuggestedModelTier): string;
/**
 * Apply a global tier alias (e.g. downgrade `premium_thinking` -> `premium` for
 * users without MAX Mode access). Returns the input tier when no alias matches.
 */
export declare function applyTierAlias(tier: ModelTier, aliases?: Partial<Record<ModelTier, ModelTier>>): ModelTier;
/** Clamp `tier` to at most `maxTier` (for bestOfN.maxCostTier builder cap). */
export declare function capModelTier(tier: ModelTier, maxTier: ModelTier): ModelTier;
/**
 * Resolve the builder model exemplar for a tournament path, enforcing maxCostTier.
 * When capped, returns the max tier exemplar instead of the path's preferred model.
 */
export declare function resolveTournamentBuilderModel(preferredModel: string, builderTier: ModelTier, maxCostTier: ModelTier): {
    tier: ModelTier;
    model: string;
    capped: boolean;
};
