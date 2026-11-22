/** Public workflow types exposed to workflow_step and related tools. */
export declare const workflowTypeEnum: any;
export declare const workflowGateTypeEnum: any;
export declare const workflowGateVerdictEnum: any;
export declare const healthSchema: {};
export declare const projectContextSchema: {
    readonly mode: any;
    readonly run_id: any;
    readonly state_path: any;
    readonly max_trail: any;
    readonly max_tokens: any;
};
export declare const listWorkflowTypesSchema: {};
export declare const harnessIdEnum: any;
export declare const harnessDetectSchema: {
    readonly harness: any;
};
export declare const harnessScaffoldSchema: {
    readonly harnesses: any;
    readonly project: any;
    readonly include: any;
    readonly dryRun: any;
    readonly overwrite: any;
};
export declare const suggestModelTierSchema: {
    readonly workflowType: any;
    readonly step: any;
    readonly role: any;
};
export declare const listSkillsSchema: {
    readonly category: any;
    readonly filter: any;
    readonly limit: any;
};
export declare const getSkillSchema: {
    readonly id: any;
    readonly run_id: any;
};
export declare const listAgentsSchema: {
    readonly include: any;
};
export declare const getAgentSchema: {
    readonly id: any;
    readonly run_id: any;
};
export declare const listCommandsSchema: {};
export declare const getCommandSchema: {
    readonly id: any;
    readonly run_id: any;
};
export declare const listRulesSchema: {};
export declare const getRuleSchema: {
    readonly id: any;
    readonly run_id: any;
};
export declare const workflowStepSchema: {
    readonly workflowType: any;
    readonly step: any;
    readonly state: any;
};
export declare const reportUsageSchema: {
    readonly workflowType: any;
    readonly step: any;
    readonly inputTokens: any;
    readonly outputTokens: any;
    readonly costUsd: any;
    readonly latencyMs: any;
    readonly run_id: any;
    readonly path: any;
    readonly requestModel: any;
    readonly responseModel: any;
    readonly reasoningEffort: any;
    readonly workerId: any;
    readonly observedBy: any;
};
export declare const workflowHandoffAppendSchema: {
    readonly run_id: any;
    readonly step: any;
    readonly summary: any;
    readonly path: any;
};
export declare const workflowConfirmSchema: {
    readonly question: any;
    readonly options: any;
    readonly context: any;
    readonly gate_type: any;
    readonly verdict: any;
    readonly must_fix_summary: any;
    readonly path: any;
};
export declare const approvalCheckpointSchema: {
    readonly approval_token: any;
    readonly action_label: any;
    readonly workflow_type: any;
    readonly workflow_step: any;
    readonly run_id: any;
};
export declare const gateLogAppendSchema: {
    readonly gate_type: any;
    readonly workflowType: any;
    readonly step: any;
    readonly outcome: any;
    readonly action_label: any;
    readonly run_id: any;
    readonly path: any;
};
export declare const workflowStateSaveSchema: {
    readonly state: any;
    readonly path: any;
    readonly run_id: any;
    readonly step: any;
    readonly summary: any;
    readonly expected_revision: any;
    readonly handoff_path: any;
    readonly history: any;
    readonly overwrite_run: any;
};
export declare const workflowStateLoadSchema: {
    readonly path: any;
};
export declare const paperclipIssueSchema: {
    readonly action: any;
    readonly issueId: any;
    readonly body: any;
    readonly status: any;
    readonly comment: any;
};
export declare const workflowVerifySchema: {
    readonly run_id: any;
    readonly commandId: any;
    readonly argv: any;
    readonly cwd: any;
    readonly timeoutMs: any;
    readonly candidate_id: any;
    readonly workflowType: any;
    readonly step: any;
    readonly inputs: any;
    readonly env_required: any;
    readonly preflight_only: any;
    readonly owner: any;
};
export declare const workflowRunQuerySchema: {
    readonly run_id: any;
    readonly kinds: any;
    readonly limit: any;
    readonly path: any;
    readonly timeline: any;
};
export declare const contextArgSchema: {
    readonly context: any;
};
