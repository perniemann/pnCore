/**
 * Deterministic workflow definitions.
 * Control flow lives here; the LLM assists each step but does not decide sequence.
 * 2026 best practice: "Gating LLM invocation behind deterministic routing decisions."
 */
import { type ModelTier, type SuggestedModelTier } from "./model-tiers.js";
export type WorkflowType = "design" | "full_dev" | "project_kickoff" | "prompt_optimize" | "frontend_audit" | "backend_audit" | "image_create" | "visual_tweak" | "game_feature" | "svg_create" | "engine_feature" | "unreal_feature" | "godot_feature" | "fsi_analyst_draft" | "business_strategy" | "media_director" | "feature_program" | "implementation_tournament";
export type GateType = "human" | "model";
/** Intent from pn-new: full_auto (few gates), design_focused (design workflow), involved (strict gates at every step). */
export type WorkflowIntent = "full_auto" | "design_focused" | "involved";
export interface StepDef {
    instruction: string;
    gate: GateType;
    nextStep: number;
    requiredFromState: string[];
    /**
     * Suggested LLM model tier for the work this step asks of the model.
     * Defaults to "standard" when omitted. See model-tiers.ts.
     */
    modelTier?: ModelTier;
    /** Short, step-specific rationale shown in the inline hint. Falls back to TIER_META.description. */
    tierRationale?: string;
}
export interface WorkflowTask {
    id: string;
    instruction: string;
    agentId: string;
}
export interface WorkflowStepResult {
    instruction: string;
    nextStep: number;
    requiredInputs: string[];
    gate: GateType;
    done?: boolean;
    parallel?: boolean;
    tasks?: WorkflowTask[];
    /** Present when full_dev step 5 requires merge reconciliation before review, step 3 GitHub Issues phase, or tournament phases. */
    workflowPhase?: "merge" | "github_issues" | "tournament_fanout" | "tournament_gate" | "tournament_judge" | "tournament_handoff";
    /**
     * Suggested LLM model tier for the work this step asks of the model.
     * Always populated; mirrors the inline hint that is prepended to
     * `instruction` when tier !== "standard".
     */
    suggestedModelTier?: SuggestedModelTier;
}
/** Internal engine step keys — not exposed on workflowTypeEnum. */
export declare const INTERNAL_ENGINE_WORKFLOW_TYPES: readonly ["unreal_feature", "godot_feature"];
export declare const workflowSteps: Record<WorkflowType, StepDef[]>;
/** Workflow types exposed via MCP tools (workflowTypeEnum). */
export declare const PUBLIC_WORKFLOW_TYPES: WorkflowType[];
/**
 * Resolve the model tier for a (workflowType, step) pair, applying per-step
 * overrides and global tier aliases from features.json / PNCORE_FEATURES.
 * Used by the suggest_model_tier MCP tool and by withTierHint() below.
 */
export declare function resolveStepTier(workflowType: WorkflowType, step: number): SuggestedModelTier | null;
export declare function getWorkflowStep(workflowType: WorkflowType, step: number, state: Record<string, unknown>): WorkflowStepResult | {
    error: string;
};
