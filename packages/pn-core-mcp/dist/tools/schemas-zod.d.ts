import { z } from "zod";
/** Public workflow types exposed to workflow_step and related tools. */
export declare const workflowTypeEnum: z.ZodEnum<{
    design: "design";
    full_dev: "full_dev";
    project_kickoff: "project_kickoff";
    prompt_optimize: "prompt_optimize";
    frontend_audit: "frontend_audit";
    backend_audit: "backend_audit";
    image_create: "image_create";
    visual_tweak: "visual_tweak";
    game_feature: "game_feature";
    svg_create: "svg_create";
    engine_feature: "engine_feature";
    fsi_analyst_draft: "fsi_analyst_draft";
    business_strategy: "business_strategy";
    media_director: "media_director";
    feature_program: "feature_program";
    implementation_tournament: "implementation_tournament";
}>;
export declare const workflowGateTypeEnum: z.ZodOptional<z.ZodEnum<{
    design: "design";
    skeptic: "skeptic";
    plan: "plan";
    discovery: "discovery";
}>>;
export declare const workflowGateVerdictEnum: z.ZodOptional<z.ZodEnum<{
    proceed: "proceed";
    revise: "revise";
    conditional_go: "conditional_go";
}>>;
export declare const healthSchema: {};
export declare const projectContextSchema: {
    readonly mode: z.ZodOptional<z.ZodEnum<{
        operator: "operator";
        agent: "agent";
    }>>;
    readonly run_id: z.ZodOptional<z.ZodString>;
    readonly max_trail: z.ZodOptional<z.ZodNumber>;
};
export declare const listWorkflowTypesSchema: {};
export declare const suggestModelTierSchema: {
    readonly workflowType: z.ZodOptional<z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>>;
    readonly step: z.ZodOptional<z.ZodNumber>;
    readonly role: z.ZodOptional<z.ZodEnum<{
        explorer: "explorer";
        builder: "builder";
        judge: "judge";
        checker: "checker";
        orchestrator: "orchestrator";
    }>>;
};
export declare const listSkillsSchema: {
    readonly category: z.ZodOptional<z.ZodString>;
    readonly filter: z.ZodOptional<z.ZodString>;
    readonly limit: z.ZodOptional<z.ZodNumber>;
};
export declare const getSkillSchema: {
    readonly id: z.ZodString;
    readonly run_id: z.ZodOptional<z.ZodString>;
};
export declare const listAgentsSchema: {
    readonly include: z.ZodOptional<z.ZodEnum<{
        external: "external";
        internal: "internal";
        all: "all";
    }>>;
};
export declare const getAgentSchema: {
    readonly id: z.ZodString;
    readonly run_id: z.ZodOptional<z.ZodString>;
};
export declare const listCommandsSchema: {};
export declare const getCommandSchema: {
    readonly id: z.ZodString;
    readonly run_id: z.ZodOptional<z.ZodString>;
};
export declare const listRulesSchema: {};
export declare const getRuleSchema: {
    readonly id: z.ZodString;
    readonly run_id: z.ZodOptional<z.ZodString>;
};
export declare const workflowStepSchema: {
    readonly workflowType: z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>;
    readonly step: z.ZodNumber;
    readonly state: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
};
export declare const reportUsageSchema: {
    readonly workflowType: z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>;
    readonly step: z.ZodNumber;
    readonly inputTokens: z.ZodNumber;
    readonly outputTokens: z.ZodNumber;
    readonly costUsd: z.ZodOptional<z.ZodNumber>;
    readonly latencyMs: z.ZodOptional<z.ZodNumber>;
    readonly run_id: z.ZodOptional<z.ZodString>;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const workflowUsageTotalsSchema: {
    readonly run_id: z.ZodString;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const workflowHandoffAppendSchema: {
    readonly run_id: z.ZodString;
    readonly step: z.ZodNumber;
    readonly summary: z.ZodString;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const workflowHandoffReadSchema: {
    readonly run_id: z.ZodString;
    readonly path: z.ZodOptional<z.ZodString>;
    readonly max_lines: z.ZodOptional<z.ZodNumber>;
};
export declare const workflowConfirmSchema: {
    readonly question: z.ZodString;
    readonly options: z.ZodArray<z.ZodString>;
    readonly context: z.ZodOptional<z.ZodString>;
    readonly gate_type: z.ZodOptional<z.ZodEnum<{
        design: "design";
        skeptic: "skeptic";
        plan: "plan";
        discovery: "discovery";
    }>>;
    readonly verdict: z.ZodOptional<z.ZodEnum<{
        proceed: "proceed";
        revise: "revise";
        conditional_go: "conditional_go";
    }>>;
    readonly must_fix_summary: z.ZodOptional<z.ZodString>;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const approvalCheckpointSchema: {
    readonly approval_token: z.ZodString;
    readonly action_label: z.ZodString;
    readonly workflow_type: z.ZodOptional<z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>>;
    readonly workflow_step: z.ZodOptional<z.ZodNumber>;
    readonly run_id: z.ZodOptional<z.ZodString>;
};
export declare const gateLogAppendSchema: {
    readonly gate_type: z.ZodString;
    readonly workflowType: z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>;
    readonly step: z.ZodNumber;
    readonly outcome: z.ZodString;
    readonly action_label: z.ZodOptional<z.ZodString>;
    readonly run_id: z.ZodOptional<z.ZodString>;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const workflowStateSaveSchema: {
    readonly state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const workflowStateLoadSchema: {
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const paperclipIssueCheckoutSchema: {
    readonly issueId: z.ZodOptional<z.ZodString>;
};
export declare const paperclipIssueCommentSchema: {
    readonly issueId: z.ZodOptional<z.ZodString>;
    readonly body: z.ZodString;
};
export declare const paperclipIssueUpdateSchema: {
    readonly issueId: z.ZodOptional<z.ZodString>;
    readonly status: z.ZodEnum<{
        backlog: "backlog";
        todo: "todo";
        in_progress: "in_progress";
        in_review: "in_review";
        done: "done";
        blocked: "blocked";
        cancelled: "cancelled";
    }>;
    readonly comment: z.ZodOptional<z.ZodString>;
};
export declare const workflowVerifySchema: {
    readonly run_id: z.ZodString;
    readonly commandId: z.ZodOptional<z.ZodString>;
    readonly argv: z.ZodOptional<z.ZodArray<z.ZodString>>;
    readonly cwd: z.ZodOptional<z.ZodString>;
    readonly timeoutMs: z.ZodOptional<z.ZodNumber>;
    readonly candidate_id: z.ZodOptional<z.ZodString>;
    readonly workflowType: z.ZodOptional<z.ZodEnum<{
        design: "design";
        full_dev: "full_dev";
        project_kickoff: "project_kickoff";
        prompt_optimize: "prompt_optimize";
        frontend_audit: "frontend_audit";
        backend_audit: "backend_audit";
        image_create: "image_create";
        visual_tweak: "visual_tweak";
        game_feature: "game_feature";
        svg_create: "svg_create";
        engine_feature: "engine_feature";
        fsi_analyst_draft: "fsi_analyst_draft";
        business_strategy: "business_strategy";
        media_director: "media_director";
        feature_program: "feature_program";
        implementation_tournament: "implementation_tournament";
    }>>;
    readonly step: z.ZodOptional<z.ZodNumber>;
};
export declare const workflowRunQuerySchema: {
    readonly run_id: z.ZodString;
    readonly kinds: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        verify: "verify";
        acceptance: "acceptance";
        handoff: "handoff";
        gate: "gate";
        usage: "usage";
        step: "step";
    }>>>;
    readonly limit: z.ZodOptional<z.ZodNumber>;
    readonly path: z.ZodOptional<z.ZodString>;
};
export declare const contextArgSchema: {
    readonly context: z.ZodOptional<z.ZodString>;
};
