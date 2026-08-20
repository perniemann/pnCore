import { Type, type TSchema } from "typebox";

const WORKFLOW_TYPES = [
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
] as const;

const workflowTypeSchema = Type.Union(WORKFLOW_TYPES.map((v) => Type.Literal(v)));

const runIdOpt = Type.Optional(
  Type.String({ description: "Workflow run_id from workflow_step; include for correlation" })
);

export const typeboxSchemas: Record<string, TSchema> = {
  health: Type.Object({}),
  list_workflow_types: Type.Object({}),
  suggest_model_tier: Type.Object({
    workflowType: Type.Optional(workflowTypeSchema),
    step: Type.Optional(Type.Integer({ minimum: 0 })),
    role: Type.Optional(
      Type.Union([
        Type.Literal("explorer"),
        Type.Literal("builder"),
        Type.Literal("judge"),
        Type.Literal("checker"),
      ])
    ),
  }),
  list_skills: Type.Object({
    category: Type.Optional(Type.String()),
    filter: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  get_skill: Type.Object({
    id: Type.String(),
    run_id: runIdOpt,
  }),
  list_agents: Type.Object({
    include: Type.Optional(
      Type.Union([Type.Literal("external"), Type.Literal("internal"), Type.Literal("all")])
    ),
  }),
  get_agent: Type.Object({
    id: Type.String(),
    run_id: runIdOpt,
  }),
  list_commands: Type.Object({}),
  get_command: Type.Object({
    id: Type.String(),
    run_id: runIdOpt,
  }),
  list_rules: Type.Object({}),
  get_rule: Type.Object({
    id: Type.String(),
    run_id: runIdOpt,
  }),
  workflow_step: Type.Object({
    workflowType: workflowTypeSchema,
    step: Type.Integer({ minimum: 0 }),
    state: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
  report_usage: Type.Object({
    workflowType: workflowTypeSchema,
    step: Type.Integer({ minimum: 0 }),
    inputTokens: Type.Integer({ minimum: 0 }),
    outputTokens: Type.Integer({ minimum: 0 }),
    costUsd: Type.Optional(Type.Number({ minimum: 0 })),
    latencyMs: Type.Optional(Type.Number({ minimum: 0 })),
    run_id: Type.Optional(Type.String()),
    path: Type.Optional(Type.String()),
  }),
  workflow_usage_totals: Type.Object({
    run_id: Type.String({ minLength: 1 }),
    path: Type.Optional(Type.String()),
  }),
  workflow_handoff_append: Type.Object({
    run_id: Type.String({ minLength: 1 }),
    step: Type.Integer({ minimum: 0 }),
    summary: Type.String({ minLength: 1, maxLength: 4000 }),
    path: Type.Optional(Type.String()),
  }),
  workflow_handoff_read: Type.Object({
    run_id: Type.String({ minLength: 1 }),
    path: Type.Optional(Type.String()),
    max_lines: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
  }),
  workflow_confirm: Type.Object({
    question: Type.String(),
    options: Type.Array(Type.String(), { minItems: 1, maxItems: 10 }),
    context: Type.Optional(Type.String()),
    gate_type: Type.Optional(
      Type.Union([
        Type.Literal("skeptic"),
        Type.Literal("plan"),
        Type.Literal("design"),
        Type.Literal("discovery"),
      ])
    ),
    verdict: Type.Optional(
      Type.Union([Type.Literal("proceed"), Type.Literal("revise"), Type.Literal("conditional_go")])
    ),
    must_fix_summary: Type.Optional(Type.String()),
    path: Type.Optional(Type.String()),
  }),
  approval_checkpoint: Type.Object({
    approval_token: Type.String(),
    action_label: Type.String(),
    workflow_type: Type.Optional(workflowTypeSchema),
    workflow_step: Type.Optional(Type.Integer({ minimum: 0 })),
    run_id: Type.Optional(Type.String()),
  }),
  gate_log_append: Type.Object({
    gate_type: Type.String({ minLength: 1 }),
    workflowType: workflowTypeSchema,
    step: Type.Integer({ minimum: 0 }),
    outcome: Type.String({ minLength: 1 }),
    action_label: Type.Optional(Type.String()),
    run_id: Type.Optional(Type.String()),
    path: Type.Optional(Type.String()),
  }),
  workflow_state_save: Type.Object({
    state: Type.Record(Type.String(), Type.Unknown()),
    path: Type.Optional(Type.String()),
  }),
  workflow_state_load: Type.Object({
    path: Type.Optional(Type.String()),
  }),
  paperclip_issue_checkout: Type.Object({
    issueId: Type.Optional(Type.String()),
  }),
  paperclip_issue_comment: Type.Object({
    issueId: Type.Optional(Type.String()),
    body: Type.String(),
  }),
  workflow_verify: Type.Object({
    run_id: Type.String({ minLength: 1 }),
    commandId: Type.Optional(Type.String({ minLength: 1 })),
    argv: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
    cwd: Type.Optional(Type.String()),
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1000, maximum: 300000 })),
    candidate_id: Type.Optional(Type.String()),
    workflowType: Type.Optional(workflowTypeSchema),
    step: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  workflow_run_query: Type.Object({
    run_id: Type.String({ minLength: 1 }),
    kinds: Type.Optional(
      Type.Array(
        Type.Union([
          Type.Literal("verify"),
          Type.Literal("acceptance"),
          Type.Literal("handoff"),
          Type.Literal("gate"),
          Type.Literal("usage"),
          Type.Literal("step"),
        ])
      )
    ),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
    path: Type.Optional(Type.String()),
  }),
  paperclip_issue_update: Type.Object({
    issueId: Type.Optional(Type.String()),
    status: Type.Union([
      Type.Literal("backlog"),
      Type.Literal("todo"),
      Type.Literal("in_progress"),
      Type.Literal("in_review"),
      Type.Literal("done"),
      Type.Literal("blocked"),
      Type.Literal("cancelled"),
    ]),
    comment: Type.Optional(Type.String()),
  }),
};

export const PN_CORE_TOOL_NAMES = Object.keys(typeboxSchemas);
