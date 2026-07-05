import type { TSchema } from "typebox";
import type { RawShape, ToolAnnotations, ToolContentResult } from "./tool-runtime.js";
import {
  approvalCheckpointSchema,
  gateLogAppendSchema,
  getAgentSchema,
  getCommandSchema,
  getRuleSchema,
  getSkillSchema,
  healthSchema,
  listAgentsSchema,
  listCommandsSchema,
  listRulesSchema,
  listSkillsSchema,
  listWorkflowTypesSchema,
  paperclipIssueCheckoutSchema,
  paperclipIssueCommentSchema,
  paperclipIssueUpdateSchema,
  reportUsageSchema,
  suggestModelTierSchema,
  workflowConfirmSchema,
  workflowHandoffAppendSchema,
  workflowHandoffReadSchema,
  workflowStateLoadSchema,
  workflowStateSaveSchema,
  workflowStepSchema,
  workflowUsageTotalsSchema,
} from "./schemas-zod.js";
import { typeboxSchemas, PN_CORE_TOOL_NAMES } from "./schemas-typebox.js";
import {
  handleApprovalCheckpoint,
  handleGateLogAppend,
  handleGetAgent,
  handleGetCommand,
  handleGetRule,
  handleGetSkill,
  handleHealth,
  handleListAgents,
  handleListCommands,
  handleListRules,
  handleListSkills,
  handleListWorkflowTypes,
  handlePaperclipIssueCheckout,
  handlePaperclipIssueComment,
  handlePaperclipIssueUpdate,
  handleReportUsage,
  handleSuggestModelTier,
  handleWorkflowConfirm,
  handleWorkflowHandoffAppend,
  handleWorkflowHandoffRead,
  handleWorkflowStateLoad,
  handleWorkflowStateSave,
  handleWorkflowStep,
  handleWorkflowUsageTotals,
} from "./handlers.js";

export interface ToolDefinition {
  name: string;
  label: string;
  description: string;
  zodSchema: RawShape;
  typeboxParameters: TSchema;
  annotations: ToolAnnotations;
  handler: (args: Record<string, unknown>) => Promise<ToolContentResult>;
}

function def(
  name: string,
  label: string,
  description: string,
  zodSchema: RawShape,
  annotations: ToolAnnotations,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<ToolContentResult>
): ToolDefinition {
  const typeboxParameters = typeboxSchemas[name];
  if (!typeboxParameters) {
    throw new Error(`pn-core-mcp: missing TypeBox schema for tool ${name}`);
  }
  return {
    name,
    label,
    description,
    zodSchema,
    typeboxParameters,
    annotations,
    handler: handler as ToolDefinition["handler"],
  };
}

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true } as const;
const write = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;
const destructive = { readOnlyHint: false, destructiveHint: true, idempotentHint: false } as const;

export const PN_CORE_TOOLS: ToolDefinition[] = [
  def(
    "health",
    "Health",
    "Lightweight health check. Returns status, version, server calendar date (UTC), ISO timestamp, and capability summary. Call before dating changelogs, copyright years, or 'as of' lines when you need the MCP host clock.",
    healthSchema,
    readOnly,
    handleHealth
  ),
  def(
    "list_workflow_types",
    "List Workflow Types",
    "List available workflow types and their step counts. Use for discoverability before calling workflow_step.",
    listWorkflowTypesSchema,
    readOnly,
    handleListWorkflowTypes
  ),
  def(
    "suggest_model_tier",
    "Suggest Model Tier",
    "Return the suggested LLM model tier for a workflow step or subagent role. Omit `step` to get the full per-step table for the workflow. When `role` is set (explorer | builder | judge | checker), returns the tier for that subagent kind and ignores step. Tiers: fast | standard | premium | premium_thinking. Suggestions reflect cognitive demand and incorporate modelTierOverrides / tierAliases from features.json or PNCORE_FEATURES.",
    suggestModelTierSchema,
    readOnly,
    handleSuggestModelTier
  ),
  def(
    "list_skills",
    "List Skills",
    "List pnCore skills. Without filters returns a category index with counts; use category or filter to drill in.",
    listSkillsSchema,
    readOnly,
    handleListSkills
  ),
  def(
    "get_skill",
    "Get Skill",
    "Return full markdown content of a skill by id (e.g. pn-discovery-questionnaire, pn-svg-creator).",
    getSkillSchema,
    readOnly,
    handleGetSkill
  ),
  def(
    "list_agents",
    "List Agents",
    "List pnCore agent ids and descriptions. Use include='all' to surface internal orchestration agents.",
    listAgentsSchema,
    readOnly,
    handleListAgents
  ),
  def(
    "get_agent",
    "Get Agent",
    "Return full markdown content of an agent by id (e.g. pn-project-builder, pn-skeptic).",
    getAgentSchema,
    readOnly,
    handleGetAgent
  ),
  def(
    "list_commands",
    "List Commands",
    "List all pnCore command ids and descriptions.",
    listCommandsSchema,
    readOnly,
    handleListCommands
  ),
  def(
    "get_command",
    "Get Command",
    "Return full markdown content of a command by id (e.g. pn-build, pn-new, pn-design, pn-svg-creator).",
    getCommandSchema,
    readOnly,
    handleGetCommand
  ),
  def(
    "list_rules",
    "List Rules",
    "List all pnCore rule ids and descriptions.",
    listRulesSchema,
    readOnly,
    handleListRules
  ),
  def(
    "get_rule",
    "Get Rule",
    "Return full markdown content of a rule by id.",
    getRuleSchema,
    readOnly,
    handleGetRule
  ),
  def(
    "workflow_step",
    "Workflow Step",
    "Get the next instruction for a workflow step. Call this at workflow start and after completing each step. The tool validates state and returns a single instruction. Control flow is deterministic; the model cannot advance without valid state. Stateless: you supply full state on each call. When PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS lists this workflowType and the step gate is human, state must include pncoreHumanGateTicket from approval_checkpoint (see MCP README).",
    workflowStepSchema,
    write,
    handleWorkflowStep
  ),
  def(
    "report_usage",
    "Report Usage",
    "Report token and cost usage for a workflow step. Call after workflow_step when the client has usage data. Optional path: append one JSON line to the file (e.g. .pncore/usage.jsonl in workspace). If path omitted, returns summary only.",
    reportUsageSchema,
    write,
    handleReportUsage
  ),
  def(
    "workflow_usage_totals",
    "Workflow Usage Totals",
    "Sum inputTokens, outputTokens, and optional costUsd for a workflow run_id from a usage JSONL file (same format as report_usage). Scans tail of file for safety.",
    workflowUsageTotalsSchema,
    readOnly,
    handleWorkflowUsageTotals
  ),
  def(
    "workflow_handoff_append",
    "Workflow Handoff Append",
    "Append a bounded workflow step summary to JSONL for cross-session handoff (same run_id as workflow_step).",
    workflowHandoffAppendSchema,
    write,
    handleWorkflowHandoffAppend
  ),
  def(
    "workflow_handoff_read",
    "Workflow Handoff Read",
    "Read recent handoff lines for a run_id (workflow_handoff_append). New chat: call with run_id to restore context.",
    workflowHandoffReadSchema,
    readOnly,
    handleWorkflowHandoffRead
  ),
  def(
    "workflow_confirm",
    "Workflow Confirm",
    "Present a structured confirmation gate to the user. Use when ask_question is unavailable (MCP-only), or after AskQuestion in Cursor to record gate_id in .pncore/gate-log.jsonl. Returns formatted prompt text, options, and gate_id. You MUST output the prompt to the user, list the options, and STOP. Do not proceed until the user replies. For skeptic gates: set gate_type=skeptic, verdict, and non-empty context when verdict=revise.",
    workflowConfirmSchema,
    write,
    handleWorkflowConfirm
  ),
  def(
    "approval_checkpoint",
    "Approval Checkpoint",
    "Hard approval gate: returns success only if approval_token equals PNCORE_APPROVAL_TOKEN on the MCP server process. Configure the env var in MCP server config (not in chat). Optional workflow_type + workflow_step: when both are set and the token matches, appends a one-time ticket and returns pncoreHumanGateTicket for the next workflow_step human gate (used with PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS). If the env var is unset, returns an error (fail closed).",
    approvalCheckpointSchema,
    write,
    handleApprovalCheckpoint
  ),
  def(
    "gate_log_append",
    "Gate Log Append",
    "Append-only audit line for human or workflow gates. Writes one JSON object per line (JSONL) under the workspace, same path rules as report_usage. Use after user outcomes at gates (complements approval_checkpoint).",
    gateLogAppendSchema,
    write,
    handleGateLogAppend
  ),
  def(
    "workflow_state_save",
    "Workflow State Save",
    "Save workflow state to a file so it can be restored later (resume after disconnect). Path defaults to .pncore/workflow-state.json relative to process cwd.",
    workflowStateSaveSchema,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    handleWorkflowStateSave
  ),
  def(
    "workflow_state_load",
    "Workflow State Load",
    "Load workflow state from a file (e.g. after reconnect). Path defaults to .pncore/workflow-state.json relative to process cwd.",
    workflowStateLoadSchema,
    readOnly,
    handleWorkflowStateLoad
  ),
  def(
    "paperclip_issue_checkout",
    "Paperclip Issue Checkout",
    "Check out a Paperclip issue (POST /api/issues/:id/checkout). Use before starting work per pn-paperclip governance. Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.",
    paperclipIssueCheckoutSchema,
    write,
    handlePaperclipIssueCheckout
  ),
  def(
    "paperclip_issue_comment",
    "Paperclip Issue Comment",
    "Add a markdown comment on a Paperclip issue (POST /api/issues/:id/comments with body). Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.",
    paperclipIssueCommentSchema,
    destructive,
    handlePaperclipIssueComment
  ),
  def(
    "paperclip_issue_update",
    "Paperclip Issue Update",
    "Update a Paperclip issue status (PATCH /api/issues/:id). Prefer paperclip_issue_checkout for in_progress per governance. Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.",
    paperclipIssueUpdateSchema,
    destructive,
    handlePaperclipIssueUpdate
  ),
];

if (PN_CORE_TOOLS.length !== PN_CORE_TOOL_NAMES.length) {
  throw new Error(
    `pn-core-mcp: tool registry count mismatch (${PN_CORE_TOOLS.length} vs ${PN_CORE_TOOL_NAMES.length})`
  );
}

export { PN_CORE_TOOL_NAMES };
