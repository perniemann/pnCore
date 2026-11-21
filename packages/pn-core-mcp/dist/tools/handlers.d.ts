import type { ShapeArgs } from "./tool-runtime.js";
import type { approvalCheckpointSchema, gateLogAppendSchema, getAgentSchema, getCommandSchema, getRuleSchema, getSkillSchema, harnessDetectSchema, harnessScaffoldSchema, listAgentsSchema, listSkillsSchema, paperclipIssueSchema, projectContextSchema, reportUsageSchema, suggestModelTierSchema, workflowConfirmSchema, workflowHandoffAppendSchema, workflowStateLoadSchema, workflowStateSaveSchema, workflowRunQuerySchema, workflowStepSchema, workflowVerifySchema } from "./schemas-zod.js";
export declare function handleHealth(): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleProjectContext(args: ShapeArgs<typeof projectContextSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleHarnessDetect(args: ShapeArgs<typeof harnessDetectSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleHarnessScaffold(args: ShapeArgs<typeof harnessScaffoldSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleListWorkflowTypes(): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleSuggestModelTier(args: ShapeArgs<typeof suggestModelTierSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleListSkills(args: ShapeArgs<typeof listSkillsSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleGetSkill(args: ShapeArgs<typeof getSkillSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleListAgents(args: ShapeArgs<typeof listAgentsSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleGetAgent(args: ShapeArgs<typeof getAgentSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleListCommands(): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleGetCommand(args: ShapeArgs<typeof getCommandSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleListRules(): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleGetRule(args: ShapeArgs<typeof getRuleSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowStep(args: ShapeArgs<typeof workflowStepSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleReportUsage(args: ShapeArgs<typeof reportUsageSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowHandoffAppend(args: ShapeArgs<typeof workflowHandoffAppendSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowConfirm(args: ShapeArgs<typeof workflowConfirmSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleApprovalCheckpoint(args: ShapeArgs<typeof approvalCheckpointSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleGateLogAppend(args: ShapeArgs<typeof gateLogAppendSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowStateSave(args: ShapeArgs<typeof workflowStateSaveSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowStateLoad(args: ShapeArgs<typeof workflowStateLoadSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
/** One Paperclip issue tool; `action` picks the endpoint (ADR-0024). */
export declare function handlePaperclipIssue(args: ShapeArgs<typeof paperclipIssueSchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
export declare function handleWorkflowVerify(args: ShapeArgs<typeof workflowVerifySchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
/**
 * Usage totals for one run (replaces workflow_usage_totals, ADR-0024): token and cost sums over
 * the usage trail, plus the PNCORE_USAGE_WARN_INPUT_TOKENS warning.
 */
export declare function summarizeUsage(records: Record<string, unknown>[]): {
    warnMessage?: string | undefined;
    lines: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    warn: boolean;
};
export declare function handleWorkflowRunQuery(args: ShapeArgs<typeof workflowRunQuerySchema>): Promise<import("./tool-runtime.js").ToolContentResult>;
