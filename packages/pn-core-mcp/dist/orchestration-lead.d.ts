/**
 * Dynamic orchestrator-lead mode for workflow_step parallel fan-out.
 * Tier-first (not vendor-locked): optimized for long_horizon, works with premium+intent.
 */
import { type ModelTier, type SubagentRole, type SuggestedModelTier } from "./model-tiers.js";
export type OrchestrationMode = "lead" | "light_delegate" | "implementer";
export type LeadOrchestrationContext = {
    mode: OrchestrationMode;
    /** Declared lead tier before alias (null when unknown). */
    declaredLeadTier: ModelTier | null;
    /** Tier used for exemplar hints after tierAliases. */
    effectiveLeadTier: ModelTier | null;
    subagentTierHints: Partial<Record<SubagentRole, SuggestedModelTier>>;
    contractBlock: string;
    softHint: string | null;
};
export type LeadOrchestrationState = {
    leadModelTier?: unknown;
    sessionModel?: unknown;
    orchestrationIntent?: unknown;
};
export type ResolveLeadOrchestrationOptions = {
    parallel?: boolean;
    tierAliases?: Partial<Record<ModelTier, ModelTier>>;
};
/** Normalize picker slug for comparison against TIER_META exemplars/alternates. */
export declare function normalizeSessionModelSlug(sessionModel: string): string;
/** Match sessionModel against all tier exemplars and alternates in TIER_META. */
export declare function resolveSessionModelTier(sessionModel: string): ModelTier | null;
/**
 * Resolve orchestrator-lead vs implementer mode from workflow state and step context.
 * Full lead/light contracts apply only on parallel fan-out (parallel || orchestrationIntent).
 * declaredLeadTier is preserved for tierAliases; long_horizon lead mode requires fan-out.
 */
export declare function resolveLeadOrchestrationMode(state: LeadOrchestrationState, options?: ResolveLeadOrchestrationOptions): LeadOrchestrationContext;
/** Augment a workflow step result with orchestration mode and optional task hints. */
export declare function applyOrchestrationLead<T extends {
    instruction: string;
    parallel?: boolean;
    tasks?: Array<{
        instruction: string;
        suggestedSubagentTier?: SuggestedModelTier;
    }>;
}>(result: T, state: LeadOrchestrationState, options?: ResolveLeadOrchestrationOptions): T & {
    orchestrationMode: OrchestrationMode;
    subagentTierHints: Partial<Record<SubagentRole, SuggestedModelTier>>;
};
