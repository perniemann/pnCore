import { z } from "zod";
import { runIdOptArg } from "./tool-runtime.js";
/** Public workflow types exposed to workflow_step and related tools. */
export const workflowTypeEnum = z.enum([
    "design",
    "full_dev",
    "project_kickoff",
    "prompt_optimize",
    "frontend_audit",
    "backend_audit",
    "image_create",
    "visual_tweak",
    "game_feature",
    "svg_create",
    "engine_feature",
    "fsi_analyst_draft",
    "business_strategy",
    "media_director",
    "feature_program",
    "implementation_tournament",
]);
export const workflowGateTypeEnum = z
    .enum(["skeptic", "plan", "design", "discovery"])
    .optional()
    .describe("Gate kind for audit log (default plan). Use skeptic after pn-skeptic-challenge.");
export const workflowGateVerdictEnum = z
    .enum(["proceed", "revise", "conditional_go"])
    .optional()
    .describe("Skeptic or plan verdict; required context when gate_type=skeptic and verdict=revise.");
export const healthSchema = {};
export const listWorkflowTypesSchema = {};
export const suggestModelTierSchema = {
    workflowType: workflowTypeEnum
        .optional()
        .describe("Workflow type (same as workflow_step). Required unless role is set."),
    step: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Specific step index. Omit to get the full per-step table for this workflow."),
    role: z
        .enum(["explorer", "builder", "judge", "checker", "orchestrator"])
        .optional()
        .describe("Subagent role tier (explorer=fast, builder=standard, judge=premium_thinking, checker=standard, orchestrator=long_horizon). When set, workflowType/step are optional."),
};
export const listSkillsSchema = {
    category: z
        .string()
        .optional()
        .describe("Filter by category folder (e.g. frontend, backend, gamedev, media, orchestration, ci, discipline, integrations, learning, marketing, pm, review, support, plugin)"),
    filter: z
        .string()
        .optional()
        .describe("Keyword filter — matches against id, name, and description (case-insensitive)"),
    limit: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Max results to return. 0 = all skills (no limit). Omit for default behavior."),
};
export const getSkillSchema = {
    id: z
        .string()
        .describe("Skill id (e.g. pn-discovery-questionnaire, pn-writing-plans, pn-svg-creator, pn-frontend-design-philosophy)"),
    run_id: runIdOptArg,
};
export const listAgentsSchema = {
    include: z
        .enum(["external", "internal", "all"])
        .optional()
        .describe("Which agents to include: 'external' (default, public-facing), 'internal' (orchestration-only), or 'all'"),
};
export const getAgentSchema = {
    id: z
        .string()
        .describe("Agent id (e.g. pn-project-builder, pn-reviewer, pn-skeptic, pn-frontend-developer)"),
    run_id: runIdOptArg,
};
export const listCommandsSchema = {};
export const getCommandSchema = {
    id: z
        .string()
        .describe("Command id (e.g. pn-build, pn-new, pn-design, pn-setup, pn-backend-audit)"),
    run_id: runIdOptArg,
};
export const listRulesSchema = {};
export const getRuleSchema = {
    id: z
        .string()
        .describe("Rule id (e.g. pn-react, pn-nextjs, pn-build-gate, pn-mcp-proactive, pn-no-cursor-commit-trailers)"),
    run_id: runIdOptArg,
};
export const workflowStepSchema = {
    workflowType: workflowTypeEnum.describe("Workflow type: design (6), full_dev (7), project_kickoff (8), prompt_optimize (3), frontend_audit (3), backend_audit (7), image_create (4), visual_tweak (4), game_feature (5), svg_create (5), engine_feature (5; requires state.engine: 'unreal'|'godot'), fsi_analyst_draft (6), business_strategy (7), media_director (7), feature_program (6; requires featureProgram: true), implementation_tournament (6; requires bestOfN.enabled: true)"),
    step: z.number().int().min(0).describe("Current step number (0 = start)"),
    state: z
        .record(z.string(), z.unknown())
        .default({})
        .describe("State object: run_id? (UUID; echo on every call after first), request?, intent? (full_auto|design_focused|involved), discoverySpec?, priorArt?, plan?, skepticPassed?, specialistList?, routeConfirmed?, specialistSequentialComplete?, taskResults?, mergeComplete?, pncoreHumanGateTicket? (mandatory human gates when env PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS includes this workflow), etc."),
};
export const reportUsageSchema = {
    workflowType: workflowTypeEnum.describe("Workflow type (same as workflow_step)"),
    step: z.number().int().min(0).describe("Step number"),
    inputTokens: z.number().int().min(0).describe("Input token count"),
    outputTokens: z.number().int().min(0).describe("Output token count"),
    costUsd: z.number().min(0).optional().describe("Cost in USD (optional)"),
    latencyMs: z.number().min(0).optional().describe("Latency in milliseconds (optional)"),
    run_id: z.string().optional().describe("Workflow run_id from workflow_step; include for totals"),
    path: z
        .string()
        .optional()
        .describe("Optional file path to append to (e.g. .pncore/usage.jsonl); must be within process cwd"),
};
export const workflowUsageTotalsSchema = {
    run_id: z.string().min(1).describe("run_id from workflow_step responses"),
    path: z.string().optional().describe("Optional usage JSONL path (default .pncore/usage.jsonl)"),
};
export const workflowHandoffAppendSchema = {
    run_id: z.string().min(1).describe("Echo run_id from workflow_step"),
    step: z.number().int().min(0).describe("Workflow step index just completed"),
    summary: z.string().min(1).max(4000).describe("Short summary (max 4000 chars)"),
    path: z
        .string()
        .optional()
        .describe("Optional JSONL path (default .pncore/workflow-handoff.jsonl)"),
};
export const workflowHandoffReadSchema = {
    run_id: z.string().min(1).describe("Echo run_id from workflow_step / workflow_handoff_append"),
    path: z
        .string()
        .optional()
        .describe("Optional JSONL path (default .pncore/workflow-handoff.jsonl)"),
    max_lines: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Max matching lines (default 80)"),
};
export const workflowConfirmSchema = {
    question: z
        .string()
        .describe("The confirmation question to present (e.g. 'Skeptic pass: apply revisions and proceed?')"),
    options: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe("Option labels (e.g. ['proceed', 'revise_plan', 'add_correction']). Avoid yes/no-only when real choices exist."),
    context: z.string().optional().describe("Optional context or summary to include"),
    gate_type: workflowGateTypeEnum,
    verdict: workflowGateVerdictEnum,
    must_fix_summary: z
        .string()
        .optional()
        .describe("Short must-fix list for revise gates (satisfies context when gate_type=skeptic)"),
    path: z
        .string()
        .optional()
        .describe("Optional JSONL path for gate audit log (default .pncore/gate-log.jsonl)"),
};
export const approvalCheckpointSchema = {
    approval_token: z
        .string()
        .describe("Must match PNCORE_APPROVAL_TOKEN on the server (user provides this value)"),
    action_label: z
        .string()
        .describe("Short label for the gated action (e.g. delete_prod_data, publish_release)"),
    workflow_type: workflowTypeEnum
        .optional()
        .describe("Optional. When set with workflow_step, issues a human-gate ticket for workflow_step after token validates."),
    workflow_step: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Optional. Step index for the ticket (same as workflow_step tool argument)."),
    run_id: z
        .string()
        .optional()
        .describe("Required when issuing a human-gate ticket (workflow_type + workflow_step). Ties the ticket to this workflow run_id; workflow_step state must echo the same run_id when consuming."),
};
export const gateLogAppendSchema = {
    gate_type: z.string().min(1).describe("Gate kind (e.g. human, model, approval_checkpoint)"),
    workflowType: workflowTypeEnum.describe("Workflow type"),
    step: z.number().int().min(0).describe("Step index"),
    outcome: z.string().min(1).describe("Short outcome (e.g. approved, rejected, skipped)"),
    action_label: z.string().optional().describe("Optional label (e.g. from approval_checkpoint)"),
    run_id: z.string().optional().describe("Optional workflow run_id for correlation"),
    path: z
        .string()
        .optional()
        .describe("Optional JSONL path (default .pncore/gate-log.jsonl); must be within process cwd"),
};
export const workflowStateSaveSchema = {
    state: z
        .record(z.string(), z.unknown())
        .describe("State object (same shape passed to workflow_step)"),
    path: z
        .string()
        .optional()
        .describe("Optional file path; default .pncore/workflow-state.json; must be within process cwd"),
};
export const workflowStateLoadSchema = {
    path: z
        .string()
        .optional()
        .describe("Optional file path; default .pncore/workflow-state.json; must be within process cwd"),
};
export const paperclipIssueCheckoutSchema = {
    issueId: z
        .string()
        .optional()
        .describe("Issue ID (e.g. uuid or PAP-123); defaults to PAPERCLIP_ISSUE_ID when set"),
};
export const paperclipIssueCommentSchema = {
    issueId: z.string().optional().describe("Issue ID; defaults to PAPERCLIP_ISSUE_ID when set"),
    body: z.string().describe("Comment body (markdown); supports @mentions per Paperclip docs"),
};
export const paperclipIssueUpdateSchema = {
    issueId: z.string().optional().describe("Issue ID; defaults to PAPERCLIP_ISSUE_ID when set"),
    status: z
        .enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"])
        .describe("New status (done = workflow complete)"),
    comment: z.string().optional().describe("Optional comment with the update (summary of work)"),
};
export const contextArgSchema = {
    context: z.string().optional().describe("Additional context or user request to include"),
};
