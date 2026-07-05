/**
 * Per-tool integration tests via StdioClientTransport.
 * Covers all 24 tools: one happy-path + one negative case each.
 * Negatives assert the unified error envelope: { isError: true, content: [{ type: "text", text: JSON({ code, error }) }] }
 * Depends on: F1.1 (error envelope shape), F1.4 (list_agents cardinality)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "dist", "index.js");

/** Parse the text content of a tool result and return the first text item's JSON. */
function parseFirst(result: Awaited<ReturnType<Client["callTool"]>>) {
  const first = result.content?.find((c) => c.type === "text" && "text" in c);
  if (!first || first.type !== "text" || !("text" in first)) throw new Error("no text content");
  return JSON.parse(first.text as string) as Record<string, unknown>;
}

/** Assert that a result is a unified error envelope and return its code. */
function assertErrorEnvelope(result: Awaited<ReturnType<Client["callTool"]>>) {
  expect(result.isError).toBe(true);
  const first = result.content?.find((c) => c.type === "text" && "text" in c);
  expect(first).toBeDefined();
  const parsed = JSON.parse((first as { type: "text"; text: string }).text);
  expect(typeof parsed.code).toBe("string");
  expect(typeof parsed.error).toBe("string");
  return parsed as { code: string; error: string };
}

describe("MCP per-tool integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });
    client = new Client({ name: "pn-core-tools-test", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
  }, 20000);

  afterAll(async () => {
    await transport.close();
  });

  // ── health ──────────────────────────────────────────────────────────────
  it("health: returns ok status", async () => {
    const result = await client.callTool({ name: "health", arguments: {} });
    const parsed = parseFirst(result);
    expect(parsed.status).toBe("ok");
    expect(typeof parsed.version).toBe("string");
    expect(parsed.calendarDateUtc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // F1.2 follow-up: the audit roadmap asks for `z.object({}).strict()` so empty-arg
  // tools reject typos at the JSON-RPC layer. The SDK's `registerTool({ inputSchema:
  // ZodObject })` overload supports this but its generic
  // `<InputArgs extends … | AnySchema>` blows up tsc instantiation on this file
  // (TS2589 / OOM). Until resolved, empty-arg
  // tools follow zod's default strip-unknown-keys behavior.
  it("health: extra argument is silently accepted (SDK strips extras for empty raw-shape schemas)", async () => {
    const result = await client.callTool({
      name: "health",
      arguments: { typoArg: "isIgnored" },
    });
    expect(result.isError).toBeFalsy();
  });

  // ── list_workflow_types ──────────────────────────────────────────────────
  it("list_workflow_types: returns workflow type table", async () => {
    const result = await client.callTool({ name: "list_workflow_types", arguments: {} });
    const parsed = parseFirst(result);
    expect(parsed).toHaveProperty("design");
    expect(parsed).toHaveProperty("full_dev");
  });

  it("list_workflow_types: extra argument is silently accepted (see F1.2 note above)", async () => {
    const result = await client.callTool({
      name: "list_workflow_types",
      arguments: { unknown: true },
    });
    expect(result.isError).toBeFalsy();
  });

  // ── list_skills ──────────────────────────────────────────────────────────
  it("list_skills: returns category index without filters", async () => {
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    const parsed = parseFirst(result);
    expect(typeof parsed.total).toBe("number");
    expect(typeof parsed.categories).toBe("object");
  });

  it("list_skills: filter returns array", async () => {
    const result = await client.callTool({
      name: "list_skills",
      arguments: { filter: "nonexistentxyz999" },
    });
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  // ── get_skill ────────────────────────────────────────────────────────────
  it("get_skill: returns content for a known skill category prefix", async () => {
    // List skills first to get a real ID
    const list = await client.callTool({
      name: "list_skills",
      arguments: { limit: 1, filter: "" },
    });
    // list with limit=1 returns an array
    const arr = parseFirst(list);
    expect(Array.isArray(arr)).toBe(true);
    if (Array.isArray(arr) && arr.length > 0) {
      const id = (arr[0] as { id: string }).id;
      const result = await client.callTool({ name: "get_skill", arguments: { id } });
      expect(result.isError).toBeFalsy();
      expect(result.content?.length).toBeGreaterThan(0);
    }
  });

  it("get_skill: NOT_FOUND for unknown id", async () => {
    const result = await client.callTool({
      name: "get_skill",
      arguments: { id: "pn-nonexistent-skill-xyz-test-0001" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("NOT_FOUND");
  });

  // ── list_agents ──────────────────────────────────────────────────────────
  it("list_agents: external (default) returns external agents array", async () => {
    const result = await client.callTool({ name: "list_agents", arguments: {} });
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as unknown[]).length).toBeGreaterThan(0);
    // external agents should NOT have internal: true
    for (const a of parsed as { internal?: unknown }[]) {
      expect(a.internal).toBeUndefined();
    }
  });

  it("list_agents: include=all returns more agents than external only", async () => {
    const extResult = await client.callTool({
      name: "list_agents",
      arguments: { include: "external" },
    });
    const allResult = await client.callTool({ name: "list_agents", arguments: { include: "all" } });
    const ext = parseFirst(extResult) as unknown[];
    const all = parseFirst(allResult) as unknown[];
    expect(all.length).toBeGreaterThanOrEqual(ext.length);
  });

  // ── get_agent ────────────────────────────────────────────────────────────
  it("get_agent: returns content for a known agent", async () => {
    const agents = parseFirst(await client.callTool({ name: "list_agents", arguments: {} })) as {
      id: string;
    }[];
    if (agents.length > 0) {
      const result = await client.callTool({ name: "get_agent", arguments: { id: agents[0].id } });
      expect(result.isError).toBeFalsy();
    }
  });

  it("get_agent: NOT_FOUND for unknown id", async () => {
    const result = await client.callTool({
      name: "get_agent",
      arguments: { id: "pn-nonexistent-agent-xyz-test" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("NOT_FOUND");
  });

  // ── list_commands ────────────────────────────────────────────────────────
  it("list_commands: returns commands array", async () => {
    const result = await client.callTool({ name: "list_commands", arguments: {} });
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("list_commands: extra argument is silently accepted (see F1.2 note above)", async () => {
    const result = await client.callTool({
      name: "list_commands",
      arguments: { badArg: 1 },
    });
    expect(result.isError).toBeFalsy();
  });

  // ── get_command ──────────────────────────────────────────────────────────
  it("get_command: returns content for a known command", async () => {
    const cmds = parseFirst(await client.callTool({ name: "list_commands", arguments: {} })) as {
      id: string;
    }[];
    if (cmds.length > 0) {
      const result = await client.callTool({ name: "get_command", arguments: { id: cmds[0].id } });
      expect(result.isError).toBeFalsy();
    }
  });

  it("get_command: NOT_FOUND for unknown id", async () => {
    const result = await client.callTool({
      name: "get_command",
      arguments: { id: "pn-nonexistent-command-xyz-test" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("NOT_FOUND");
  });

  // ── list_rules ───────────────────────────────────────────────────────────
  it("list_rules: returns rules array", async () => {
    const result = await client.callTool({ name: "list_rules", arguments: {} });
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("list_rules: extra argument is silently accepted (see F1.2 note above)", async () => {
    const result = await client.callTool({
      name: "list_rules",
      arguments: { badArg: 1 },
    });
    expect(result.isError).toBeFalsy();
  });

  // ── get_rule ─────────────────────────────────────────────────────────────
  it("get_rule: returns content for a known rule", async () => {
    const rules = parseFirst(await client.callTool({ name: "list_rules", arguments: {} })) as {
      id: string;
    }[];
    if (rules.length > 0) {
      const result = await client.callTool({ name: "get_rule", arguments: { id: rules[0].id } });
      expect(result.isError).toBeFalsy();
    }
  });

  it("get_rule: NOT_FOUND for unknown id", async () => {
    const result = await client.callTool({
      name: "get_rule",
      arguments: { id: "pn-nonexistent-rule-xyz-test" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("NOT_FOUND");
  });

  // ── workflow_step ────────────────────────────────────────────────────────
  it("workflow_step: step 0 of design workflow returns instruction", async () => {
    const result = await client.callTool({
      name: "workflow_step",
      arguments: { workflowType: "design", step: 0, state: {} },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(typeof parsed.instruction).toBe("string");
    expect(typeof parsed.run_id).toBe("string");
  });

  it("workflow_step: omitted state defaults to {} (MCP Zod default parity)", async () => {
    const result = await client.callTool({
      name: "workflow_step",
      arguments: { workflowType: "design", step: 0 },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(typeof parsed.instruction).toBe("string");
    expect(typeof parsed.run_id).toBe("string");
  });

  it("workflow_step: out-of-range step returns INVALID_STATE error", async () => {
    const result = await client.callTool({
      name: "workflow_step",
      arguments: { workflowType: "design", step: 9999, state: {} },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  it("workflow_step: media_director step 0 returns a parsable instruction", async () => {
    const result = await client.callTool({
      name: "workflow_step",
      arguments: { workflowType: "media_director", step: 0, state: {} },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(typeof parsed.instruction).toBe("string");
    expect((parsed.instruction as string).length).toBeGreaterThan(0);
    expect(typeof parsed.run_id).toBe("string");
  });

  // ── report_usage ─────────────────────────────────────────────────────────
  it("report_usage: without path returns summary only", async () => {
    const result = await client.callTool({
      name: "report_usage",
      arguments: {
        workflowType: "design",
        step: 0,
        inputTokens: 100,
        outputTokens: 50,
        run_id: "test-run-001",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.summary).toBeDefined();
  });

  it("report_usage: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "report_usage",
      arguments: {
        workflowType: "design",
        step: 0,
        inputTokens: 1,
        outputTokens: 1,
        path: "../escape/test.jsonl",
      },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_usage_totals ────────────────────────────────────────────────
  it("workflow_usage_totals: nonexistent file returns zero totals", async () => {
    const result = await client.callTool({
      name: "workflow_usage_totals",
      arguments: {
        run_id: "test-nonexistent-run",
        path: ".pncore/usage-test-nonexistent.jsonl",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.linesMatched).toBe(0);
    expect(parsed.inputTokens).toBe(0);
  });

  it("workflow_usage_totals: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "workflow_usage_totals",
      arguments: { run_id: "test", path: "../escape.jsonl" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_handoff_append ───────────────────────────────────────────────
  it("workflow_handoff_append: writes entry successfully", async () => {
    const result = await client.callTool({
      name: "workflow_handoff_append",
      arguments: {
        run_id: "test-handoff-integration-001",
        step: 0,
        summary: "Test handoff summary for integration tests",
        path: ".pncore/handoff-test-integration.jsonl",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.ok).toBe(true);
  });

  it("workflow_handoff_append: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "workflow_handoff_append",
      arguments: { run_id: "x", step: 0, summary: "s", path: "../escape.jsonl" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_handoff_read ─────────────────────────────────────────────────
  it("workflow_handoff_read: nonexistent path returns empty lines", async () => {
    const result = await client.callTool({
      name: "workflow_handoff_read",
      arguments: {
        run_id: "nonexistent-run",
        path: ".pncore/handoff-test-nonexistent.jsonl",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed.lines)).toBe(true);
    expect((parsed.lines as unknown[]).length).toBe(0);
  });

  it("workflow_handoff_read: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "workflow_handoff_read",
      arguments: { run_id: "x", path: "../escape.jsonl" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_confirm ──────────────────────────────────────────────────────
  it("workflow_confirm: returns structured prompt with options", async () => {
    const result = await client.callTool({
      name: "workflow_confirm",
      arguments: { question: "Proceed?", options: ["yes", "no"] },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(Array.isArray(parsed.options)).toBe(true);
    expect(typeof parsed.prompt).toBe("string");
  });

  it("workflow_confirm: missing required args returns error", async () => {
    const result = await client.callTool({
      name: "workflow_confirm",
      arguments: { question: "Q?" },
    });
    expect(result.isError).toBe(true);
  });

  it("workflow_confirm: skeptic revise without context returns INVALID_GATE", async () => {
    const result = await client.callTool({
      name: "workflow_confirm",
      arguments: {
        question: "Apply revisions?",
        options: ["apply", "push_back"],
        gate_type: "skeptic",
        verdict: "revise",
        path: ".pncore/gate-log-test-invalid.jsonl",
      },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_GATE");
  });

  it("workflow_confirm: skeptic gate returns gate_id and writes log", async () => {
    const result = await client.callTool({
      name: "workflow_confirm",
      arguments: {
        question: "Skeptic pass: proceed?",
        options: ["proceed", "revise_plan"],
        gate_type: "skeptic",
        verdict: "proceed",
        context: "Plan is minimal and correct.",
        path: ".pncore/gate-log-test-valid.jsonl",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(typeof parsed.gate_id).toBe("string");
    expect(parsed.gate_type).toBe("skeptic");
  });

  // ── approval_checkpoint ───────────────────────────────────────────────────
  it("approval_checkpoint: no env var configured returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "approval_checkpoint",
      arguments: { approval_token: "wrong", action_label: "test" },
    });
    const err = assertErrorEnvelope(result);
    expect(["INVALID_STATE", "APPROVAL_REQUIRED"]).toContain(err.code);
  });

  it("approval_checkpoint: workflow_type without workflow_step returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "approval_checkpoint",
      arguments: {
        approval_token: "x",
        action_label: "test",
        workflow_type: "design",
      },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  // ── gate_log_append ───────────────────────────────────────────────────────
  it("gate_log_append: writes audit entry", async () => {
    const result = await client.callTool({
      name: "gate_log_append",
      arguments: {
        gate_type: "human",
        workflowType: "design",
        step: 0,
        outcome: "approved",
        path: ".pncore/gate-log-test.jsonl",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.ok).toBe(true);
  });

  it("gate_log_append: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "gate_log_append",
      arguments: {
        gate_type: "human",
        workflowType: "design",
        step: 0,
        outcome: "approved",
        path: "../escape-gate.jsonl",
      },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_state_save ───────────────────────────────────────────────────
  it("workflow_state_save: saves state successfully", async () => {
    const result = await client.callTool({
      name: "workflow_state_save",
      arguments: {
        state: { run_id: "test-state-save-001", step: 1 },
        path: ".pncore/state-test.json",
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.ok).toBe(true);
  });

  it("workflow_state_save: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "workflow_state_save",
      arguments: { state: {}, path: "../escape-state.json" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── workflow_state_load ───────────────────────────────────────────────────
  it("workflow_state_load: FILE_NOT_FOUND for nonexistent path", async () => {
    const result = await client.callTool({
      name: "workflow_state_load",
      arguments: { path: ".pncore/state-nonexistent-xyz.json" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("FILE_NOT_FOUND");
  });

  it("workflow_state_load: path traversal returns PATH_TRAVERSAL error", async () => {
    const result = await client.callTool({
      name: "workflow_state_load",
      arguments: { path: "../escape-load.json" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("PATH_TRAVERSAL");
  });

  // ── suggest_model_tier ────────────────────────────────────────────────────
  it("suggest_model_tier: role builder returns standard tier", async () => {
    const result = await client.callTool({
      name: "suggest_model_tier",
      arguments: { role: "builder" },
    });
    expect(result.isError).toBeFalsy();
    const parsed = parseFirst(result);
    expect(parsed.role).toBe("builder");
    expect(parsed.tier).toBe("standard");
    expect(typeof parsed.exemplar).toBe("string");
  });

  it("suggest_model_tier: missing role and workflowType returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "suggest_model_tier",
      arguments: {},
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  // ── paperclip_issue_checkout ──────────────────────────────────────────────
  it("paperclip_issue_checkout: unconfigured returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_checkout",
      arguments: { issueId: "TEST-001" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  it("paperclip_issue_checkout: missing issueId without env returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_checkout",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });

  // ── paperclip_issue_comment ───────────────────────────────────────────────
  it("paperclip_issue_comment: unconfigured returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_comment",
      arguments: { issueId: "TEST-001", body: "test comment" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  it("paperclip_issue_comment: missing body returns validation error", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_comment",
      arguments: { issueId: "TEST-001" },
    });
    expect(result.isError).toBe(true);
  });

  // ── paperclip_issue_update ────────────────────────────────────────────────
  it("paperclip_issue_update: unconfigured returns INVALID_STATE", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_update",
      arguments: { issueId: "TEST-001", status: "done" },
    });
    const err = assertErrorEnvelope(result);
    expect(err.code).toBe("INVALID_STATE");
  });

  it("paperclip_issue_update: invalid status returns validation error", async () => {
    const result = await client.callTool({
      name: "paperclip_issue_update",
      arguments: { issueId: "TEST-001", status: "invalid_status" },
    });
    expect(result.isError).toBe(true);
  });
});
