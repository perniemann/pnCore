import { type ModelTier } from "./model-tiers.js";
export type PnCoreFeatures = {
    strictPlanSummary?: boolean;
    mergePhaseFullDev?: boolean;
    truncateSkills?: boolean;
    /** Enable the feature_program workflow type (multi-slice hierarchical orchestration). Default: false (preview). */
    featureProgram?: boolean;
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
export declare function loadFeatures(): Required<PnCoreFeatures>;
/** Env override for strict skeptic gate checks (also features.json.strictSkepticGates). */
export declare function strictSkepticGatesEnabled(): boolean;
