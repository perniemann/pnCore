import { type ModelTier } from "./model-tiers.js";
export type BestOfNFeatures = {
    /** Enable workflow_step('implementation_tournament', …). Default: false until P2 validated. */
    enabled?: boolean;
    /** Default fan-out count (2 or 3). */
    defaultN?: number;
    /** Auto-select winner when top-two LLM score delta >= this value. */
    autoSelectMinDelta?: number;
    /** Cap builder subagent tier during tournament fan-out. */
    maxCostTier?: ModelTier;
};
export type PnCoreFeatures = {
    strictPlanSummary?: boolean;
    mergePhaseFullDev?: boolean;
    truncateSkills?: boolean;
    /** Enable the feature_program workflow type (multi-slice hierarchical orchestration). Default: false (preview). */
    featureProgram?: boolean;
    /** Best-of-N tournament workflow (implementation_tournament). See ADR-0006. */
    bestOfN?: BestOfNFeatures;
    /**
     * Per-step model-tier override. Key format: `<workflowType>.<step>`
     * (e.g. `"full_dev.2": "premium_thinking"`). Wins over the StepDef default.
     */
    modelTierOverrides?: Record<string, ModelTier>;
    /**
     * Global tier remap. Applied after override resolution. Common use:
     * `{"premium_thinking": "premium"}` for accounts without MAX Mode access.
     */
    tierAliases?: Partial<Record<ModelTier, ModelTier>>;
    strictSkepticGates?: boolean;
};
export type ResolvedPnCoreFeatures = Omit<Required<PnCoreFeatures>, "bestOfN"> & {
    bestOfN: Required<BestOfNFeatures>;
};
export declare function loadFeatures(): ResolvedPnCoreFeatures;
/** Resolved best-of-N config (always populated after loadFeatures). */
export declare function loadBestOfNFeatures(): Required<BestOfNFeatures>;
/** Env override for strict skeptic gate checks (also features.json.strictSkepticGates). */
export declare function strictSkepticGatesEnabled(): boolean;
