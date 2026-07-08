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
export const MODEL_TIERS = [
    "fast",
    "standard",
    "premium",
    "premium_thinking",
    "long_horizon",
];
export function isModelTier(v) {
    return typeof v === "string" && MODEL_TIERS.includes(v);
}
// Centralized exemplars. Bump these (and only these) when Cursor's picker rotates.
export const TIER_META = {
    fast: {
        exemplar: "composer-2.5-fast",
        alternates: ["gemini-3-flash"],
        description: "Efficiency tier: mechanical formatting, summaries, asset hand-off, brief terminal output, explore subagents.",
    },
    standard: {
        exemplar: "claude-4.6-sonnet-medium-thinking",
        alternates: ["gpt-5.3-codex", "gpt-5.5-medium"],
        description: "Daily-driver tier: scoped reasoning, implementation, structured Q&A, checker subagents. Balanced cost.",
    },
    premium: {
        exemplar: "claude-opus-4-8-thinking-high",
        alternates: [],
        description: "Premium tier: plan writing, skeptic challenge, design philosophy, multi-criteria audit, security-review subagent.",
    },
    premium_thinking: {
        exemplar: "claude-opus-4-8-thinking-high + MAX",
        alternates: [],
        description: "Premium + MAX Mode (extended thinking): security audit, financial models, strategic frame, contract design, best-of-N judge.",
    },
    long_horizon: {
        exemplar: "claude-fable-5",
        alternates: ["claude-opus-4-8-thinking-high"],
        description: "Long-horizon tier: multi-hour loop orchestration, sustained planning, escalation after cheap-tier verify failures (Anthropic Fable 5).",
    },
};
export const SUBAGENT_ROLE_TIERS = {
    explorer: "fast",
    builder: "standard",
    judge: "premium_thinking",
    checker: "standard",
    orchestrator: "long_horizon",
};
export function isSubagentRole(v) {
    return typeof v === "string" && v in SUBAGENT_ROLE_TIERS;
}
/** Tier suggestion for Task subagent_type routing (explorer/builder/judge/checker). */
export function resolveRoleTier(role, tierAliases) {
    const tier = applyTierAlias(SUBAGENT_ROLE_TIERS[role], tierAliases);
    const roleRationale = {
        explorer: "Explore/orient subagents: repo search, layout, quick scans.",
        builder: "Builder subagents: scoped implementation in worktrees (best-of-n-runner, generalPurpose).",
        judge: "Judge pass: separate premium tier after objective gates (maker ≠ checker).",
        checker: "Checker/reviewer subagents: readonly review, bugbot, same-session verify.",
        orchestrator: "Long-horizon loop lead: sustained orchestration, escalation queue, multi-hour scheduled runs (Fable 5).",
    };
    return buildSuggestedTier(tier, roleRationale[role] ?? TIER_META[tier].description);
}
/** Build the structured suggestedModelTier field. Falls back to TIER_META.description when no rationale given. */
export function buildSuggestedTier(tier, rationale) {
    const meta = TIER_META[tier];
    return {
        tier,
        exemplar: meta.exemplar,
        rationale: rationale && rationale.trim() !== "" ? rationale.trim() : meta.description,
    };
}
/** One-line inline hint suitable for prepending to an instruction. Kept terse. */
export function renderTierHint(suggested) {
    return `**Suggested model tier:** ${suggested.tier} (e.g. ${suggested.exemplar}) — ${suggested.rationale}`;
}
/**
 * Apply a global tier alias (e.g. downgrade `premium_thinking` -> `premium` for
 * users without MAX Mode access). Returns the input tier when no alias matches.
 */
export function applyTierAlias(tier, aliases) {
    if (!aliases)
        return tier;
    const aliased = aliases[tier];
    return aliased && isModelTier(aliased) ? aliased : tier;
}
const TIER_RANK = {
    fast: 0,
    standard: 1,
    premium: 2,
    premium_thinking: 3,
    long_horizon: 4,
};
/** Clamp `tier` to at most `maxTier` (for bestOfN.maxCostTier builder cap). */
export function capModelTier(tier, maxTier) {
    return TIER_RANK[tier] <= TIER_RANK[maxTier] ? tier : maxTier;
}
/**
 * Resolve the builder model exemplar for a tournament path, enforcing maxCostTier.
 * When capped, returns the max tier exemplar instead of the path's preferred model.
 */
export function resolveTournamentBuilderModel(preferredModel, builderTier, maxCostTier) {
    const tier = capModelTier(builderTier, maxCostTier);
    const capped = tier !== builderTier;
    const model = capped ? TIER_META[tier].exemplar : preferredModel;
    return { tier, model, capped };
}
