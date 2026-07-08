/**
 * Dynamic orchestrator-lead mode for workflow_step parallel fan-out.
 * Tier-first (not vendor-locked): optimized for long_horizon, works with premium+intent.
 */
import { applyTierAlias, isModelTier, resolveRoleTier, TIER_META, } from "./model-tiers.js";
/** Normalize picker slug for comparison against TIER_META exemplars/alternates. */
export function normalizeSessionModelSlug(sessionModel) {
    return sessionModel
        .trim()
        .toLowerCase()
        .replace(/\s*\+\s*max\s*$/i, "")
        .replace(/[/\\]+/g, "/")
        .replace(/\s+/g, "-");
}
/** Reject common non-vendor prefix tokens (not-claude-opus-… false positives). */
const VENDOR_PREFIX_DENYLIST = new Set([
    "not",
    "no",
    "fake",
    "wrong",
    "my",
    "test",
    "old",
    "new",
    "backup",
    "copy",
    "evil",
    "bad",
    "alt",
    "custom",
    "other",
    "unknown",
]);
function slugSegments(slug) {
    return slug.split("-").filter(Boolean);
}
/** Display picker labels (e.g. claude-opus) — word-only, ≥2 segments, not bare vendor tokens. */
function isDisplayNamePrefix(normSlug, normCandidate) {
    if (!normCandidate.startsWith(`${normSlug}-`))
        return false;
    const segments = slugSegments(normSlug);
    if (segments.length < 2)
        return false;
    if (/\d/.test(normSlug))
        return false;
    return segments.every((s) => !VENDOR_PREFIX_DENYLIST.has(s));
}
function isPlausibleVendorPrefix(prefix) {
    if (!prefix || prefix.includes("/"))
        return false;
    const segments = slugSegments(prefix);
    if (segments.length === 0)
        return false;
    if (!segments.every((s) => /^[a-z0-9]+$/.test(s)))
        return false;
    return segments.every((s) => !VENDOR_PREFIX_DENYLIST.has(s));
}
function hasVendorPrefixedSlug(normSlug, normCandidate) {
    if (normSlug.endsWith(`/${normCandidate}`)) {
        const pathPrefix = normSlug.slice(0, normSlug.length - normCandidate.length - 1);
        return pathPrefix.length > 0 && isPlausibleVendorPrefix(pathPrefix.replace(/\//g, "-"));
    }
    if (!normSlug.endsWith(`-${normCandidate}`))
        return false;
    const prefix = normSlug.slice(0, normSlug.length - normCandidate.length - 1);
    return isPlausibleVendorPrefix(prefix);
}
/**
 * Match picker slug to a tier exemplar/alternate without substring false positives.
 * Allows: exact match, multi-segment display label prefix (claude-opus → claude-opus-4-8…),
 * version suffix (claude-fable-5-preview), and vendor prefix (bedrock-claude-fable-5).
 */
function slugMatchesTier(slug, candidate) {
    const normSlug = normalizeSessionModelSlug(slug);
    const normCandidate = normalizeSessionModelSlug(candidate);
    if (normSlug === normCandidate)
        return true;
    if (isDisplayNamePrefix(normSlug, normCandidate))
        return true;
    if (normSlug.startsWith(`${normCandidate}-`))
        return true;
    return hasVendorPrefixedSlug(normSlug, normCandidate);
}
/** Match sessionModel against all tier exemplars and alternates in TIER_META. */
export function resolveSessionModelTier(sessionModel) {
    const trimmed = sessionModel.trim();
    if (!trimmed)
        return null;
    let best = null;
    let bestRank = -1;
    const rank = {
        fast: 0,
        standard: 1,
        premium: 2,
        premium_thinking: 3,
        long_horizon: 4,
    };
    for (const tier of Object.keys(TIER_META)) {
        const meta = TIER_META[tier];
        const candidates = [meta.exemplar, ...meta.alternates];
        for (const c of candidates) {
            if (slugMatchesTier(trimmed, c)) {
                if (rank[tier] >= bestRank) {
                    best = tier;
                    bestRank = rank[tier];
                }
            }
        }
    }
    return best;
}
function resolveDeclaredLeadTier(state) {
    if (isModelTier(state.leadModelTier))
        return state.leadModelTier;
    if (typeof state.sessionModel === "string") {
        return resolveSessionModelTier(state.sessionModel);
    }
    return null;
}
function isPremiumTier(tier) {
    return tier === "premium" || tier === "premium_thinking";
}
function buildSubagentTierHints(tierAliases) {
    const roles = ["explorer", "builder", "checker"];
    const hints = {};
    for (const role of roles) {
        hints[role] = resolveRoleTier(role, tierAliases);
    }
    return hints;
}
function formatSubagentHintLine(hints) {
    const builder = hints.builder;
    const explorer = hints.explorer;
    const parts = [];
    if (builder) {
        parts.push(`builder → ${builder.tier} (e.g. ${builder.exemplar})`);
    }
    if (explorer) {
        parts.push(`explorer → ${explorer.tier} (e.g. ${explorer.exemplar})`);
    }
    return parts.length > 0 ? `Subagent tiers: ${parts.join("; ")}.` : "";
}
function buildLeadContract(mode, hints) {
    const subLine = formatSubagentHintLine(hints);
    if (mode === "lead") {
        return ("**Orchestrator lead mode (long_horizon):** Plan, coordinate, and verify only — do not bulk-edit files in the lead session. " +
            "For each task in `tasks[]`, spawn a Task subagent (e.g. `generalPurpose`, `best-of-n-runner`, `explore`, `shell`) with the model tier from `subagentTierHints`. " +
            "Re-call `workflow_step` only after all delegated work reports back. " +
            "After two verification failures on the same finding, record in loop STATE and escalate per `pn-core://reference/loop-catalog/escalation-queue.md`. " +
            subLine);
    }
    return ("**Light delegate mode:** Spawn Task subagents for each parallel task; lead verifies summaries before advancing. " +
        "Lead may apply small scoped fixes (≤1 file) when merge blockers are trivial. " +
        subLine);
}
/**
 * Resolve orchestrator-lead vs implementer mode from workflow state and step context.
 * Full lead/light contracts apply only on parallel fan-out (parallel || orchestrationIntent).
 * declaredLeadTier is preserved for tierAliases; long_horizon lead mode requires fan-out.
 */
export function resolveLeadOrchestrationMode(state, options = {}) {
    const { parallel = false, tierAliases } = options;
    const declared = resolveDeclaredLeadTier(state);
    const effective = declared !== null ? applyTierAlias(declared, tierAliases) : null;
    const orchestrationIntent = state.orchestrationIntent === true;
    const hints = buildSubagentTierHints(tierAliases);
    let mode = "implementer";
    const fanOut = parallel || orchestrationIntent;
    if (declared === "long_horizon" && fanOut) {
        mode = "lead";
    }
    else if (declared !== null && isPremiumTier(declared) && fanOut) {
        mode = "light_delegate";
    }
    else if (orchestrationIntent && parallel) {
        mode = "light_delegate";
    }
    const softHint = mode === "implementer" && parallel
        ? 'Tip: pass `leadModelTier: "long_horizon"` (or your active tier) on parallel fan-out steps for orchestrator-lead delegation.'
        : mode === "implementer" && declared === "long_horizon" && !fanOut
            ? "Tip: orchestrator-lead delegation activates on parallel fan-out steps when `leadModelTier` is long_horizon."
            : null;
    const contractBlock = mode === "lead" || mode === "light_delegate" ? buildLeadContract(mode, hints) : "";
    return {
        mode,
        declaredLeadTier: declared,
        effectiveLeadTier: effective,
        subagentTierHints: hints,
        contractBlock,
        softHint,
    };
}
/** Augment a workflow step result with orchestration mode and optional task hints. */
export function applyOrchestrationLead(result, state, options = {}) {
    const ctx = resolveLeadOrchestrationMode(state, {
        ...options,
        parallel: options.parallel ?? result.parallel === true,
    });
    let instruction = result.instruction;
    if (ctx.contractBlock) {
        instruction = `${ctx.contractBlock}\n\n${instruction}`;
    }
    else if (ctx.softHint) {
        instruction = `${ctx.softHint}\n\n${instruction}`;
    }
    const builderHint = ctx.subagentTierHints.builder;
    let tasks = result.tasks;
    if (tasks && tasks.length > 0 && ctx.mode !== "implementer" && builderHint) {
        const delegateLine = `Delegate implementation (${builderHint.tier}, e.g. ${builderHint.exemplar}); lead verifies only.`;
        tasks = tasks.map((t) => ({
            ...t,
            suggestedSubagentTier: builderHint,
            instruction: `${delegateLine} ${t.instruction}`,
        }));
    }
    return {
        ...result,
        instruction,
        tasks,
        orchestrationMode: ctx.mode,
        subagentTierHints: ctx.subagentTierHints,
    };
}
