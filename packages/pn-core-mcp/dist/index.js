#!/usr/bin/env node
/** Before loading @modelcontextprotocol/sdk: fix incomplete nested zod (npm layout quirk). */
import "./fix-sdk-zod-runtime.js";
import { appendFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { dirname, resolve, join, sep } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { listSkills, getSkill, listAgents, listInternalAgents, getAgent, listCommands, getCommand, listRules, getRule, resourceDefs, getResource, } from "./content.js";
import { getWorkflowStep, resolveStepTier, workflowSteps } from "./workflows.js";
import { resolveRoleTier } from "./model-tiers.js";
import { loadPaperclipConfig, resolvePaperclipIssueId, parsePaperclipResponse, } from "./paperclip.js";
import { evaluateApprovalCheckpoint } from "./approval-checkpoint.js";
import { issueHumanGateTicket, parseRequiredApprovalWorkflows, validateAndConsumeHumanGateTicket, workflowRequiresHumanGateApproval, } from "./human-gate-tickets.js";
import { resolveWorkflowRunId } from "./run-id.js";
import { maxResourceCharsFromEnv, truncateResourceBody } from "./resource-truncate.js";
import { loadFeatures } from "./features.js";
import { readFileTail, tailScanBytesFromEnv } from "./file-tail.js";
import { debug } from "./debug.js";
import { appendWorkflowGateLog, createWorkflowGateLogEntry, defaultGateLogPath, validateWorkflowConfirmGate, } from "./workflow-gate-log.js";
/**
 * Resolve the maximum character cap for a resource body. Returns
 * Number.MAX_SAFE_INTEGER when truncation is disabled by feature flag,
 * so callers can treat the value as a uniform numeric ceiling.
 */
function getContentMaxChars() {
    const feats = loadFeatures();
    return feats.truncateSkills ? maxResourceCharsFromEnv() : Number.MAX_SAFE_INTEGER;
}
function getMcpVersion() {
    // No silent fallback: a missing/invalid package.json indicates a broken package and must fail loudly
    // at startup rather than report a stale hardcoded version (prior fallback drifted across releases).
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    let raw;
    try {
        raw = readFileSync(pkgPath, "utf-8");
    }
    catch (err) {
        throw new Error(`pn-core-mcp: cannot read package.json (${String(err)})`);
    }
    let pkg;
    try {
        pkg = JSON.parse(raw);
    }
    catch (err) {
        throw new Error(`pn-core-mcp: cannot parse package.json (${String(err)})`);
    }
    if (typeof pkg.version !== "string" || pkg.version.length === 0) {
        throw new Error(`pn-core-mcp: package.json missing valid 'version' field`);
    }
    return pkg.version;
}
const _mcpVersion = getMcpVersion();
const server = new McpServer({ name: "pn-core-mcp", version: _mcpVersion }, { capabilities: { prompts: {}, resources: {} } });
function regTool(name, description, schema, annotations, handler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.tool(name, description, schema, annotations, handler);
}
// Same TS2589 escape hatch for server.prompt (PromptArgsRawShape == ZodRawShapeCompat).
function regPrompt(name, description, schema, handler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.prompt(name, description, schema, handler);
}
const contextArgSchema = {
    context: z.string().optional().describe("Additional context or user request to include"),
};
function textContent(text) {
    return { content: [{ type: "text", text }] };
}
function errorContent(text) {
    return { content: [{ type: "text", text }], isError: true };
}
/** Shared schema factory: optional run_id correlation arg. */
const runIdOptArg = z
    .string()
    .optional()
    .describe("Workflow run_id from workflow_step; include for correlation");
// Structured error codes for client handling (MCP best practice: error taxonomy)
// Used for keyof typeof in mcpError / throwMcpError signatures
const ErrorCode = {
    NOT_FOUND: "NOT_FOUND",
    INVALID_STATE: "INVALID_STATE",
    APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    FILE_NOT_FOUND: "FILE_NOT_FOUND",
    IO_ERROR: "IO_ERROR",
    PARSE_ERROR: "PARSE_ERROR",
    PATH_TRAVERSAL: "PATH_TRAVERSAL",
    INVALID_GATE: "INVALID_GATE",
};
/**
 * JSON-RPC numeric codes for each ErrorCode.
 * JSON-RPC 2.0 reserves -32768 to -32000; server-defined errors live below -32099.
 * These values are stable: clients may key on them across releases.
 *
 *   NOT_FOUND       → -32004  (resource not found)
 *   INVALID_STATE   → -32600  (invalid request)
 *   APPROVAL_REQUIRED→-32003  (custom: approval gate required)
 *   FILE_NOT_FOUND  → -32004  (same bucket as NOT_FOUND)
 *   IO_ERROR        → -32603  (internal error)
 *   PARSE_ERROR     → -32700  (parse error)
 *   PATH_TRAVERSAL  → -32602  (invalid params)
 */
const ERROR_CODE_TO_JSON_RPC = {
    NOT_FOUND: -32004,
    INVALID_STATE: -32600,
    APPROVAL_REQUIRED: -32003,
    FILE_NOT_FOUND: -32004,
    IO_ERROR: -32603,
    PARSE_ERROR: -32700,
    PATH_TRAVERSAL: -32602,
    INVALID_GATE: -32602,
};
const safeBase = process.cwd();
const workflowTypeEnum = z.enum([
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
    "unreal_feature",
    "godot_feature",
    "fsi_analyst_draft",
    "business_strategy",
    "media_director",
    "feature_program",
    "implementation_tournament",
]);
const requiredHumanGateWorkflows = parseRequiredApprovalWorkflows(process.env.PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS);
const defaultHumanGateTicketsPath = process.env.PNCORE_HUMAN_GATE_TICKETS_PATH ?? ".pncore/human-gate-tickets.jsonl";
/** Rejects paths that escape safeBase (path traversal). Returns resolved path or error. */
function resolveSafePath(filePath) {
    const normalizedBase = resolve(safeBase);
    const normalizedResolved = resolve(normalizedBase, filePath);
    const isInside = normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + sep);
    if (!isInside) {
        return { error: "Path must be within process cwd" };
    }
    return { resolved: normalizedResolved };
}
function errJson(code, message, extra) {
    return JSON.stringify({ error: message, code, ...extra });
}
/**
 * Return a tool-error envelope. All tool handler error paths go through here.
 * Shape: { isError: true, content: [{ type: "text", text: JSON({ error, code, ...extra }) }] }
 */
function mcpError(code, message, extra) {
    return errorContent(errJson(code, message, extra));
}
/**
 * Throw a McpError for resource and prompt handlers (never inside a tool handler).
 * Uses the same ErrorCode vocabulary as mcpError so errors share taxonomy across handler types.
 */
function throwMcpError(code, message, data) {
    throw new McpError(ERROR_CODE_TO_JSON_RPC[code], message, data);
}
function paperclipNotConfigured() {
    return mcpError("INVALID_STATE", "Paperclip not configured. Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY.", { hint: "Get API key from Paperclip agent settings" });
}
function paperclipMissingIssueId() {
    return mcpError("INVALID_STATE", "Missing issue id. Pass issueId or set PAPERCLIP_ISSUE_ID.", {
        hint: "Paperclip runs often set PAPERCLIP_ISSUE_ID; otherwise pass issueId on each tool call.",
    });
}
function paperclipResultToContent(result, issueId) {
    if (result.kind === "http_error") {
        return mcpError("IO_ERROR", `Paperclip API ${result.status}: ${result.body}`, {
            status: result.status,
            issueId,
        });
    }
    if (result.kind === "parse_error") {
        return mcpError("PARSE_ERROR", "Paperclip API returned non-JSON response", { issueId });
    }
    return textContent(JSON.stringify({ ok: true, ...result.data }));
}
function promptMessages(content, context) {
    const text = context ? `${content}\n\n---\n\n**User context:**\n${context}` : content;
    return {
        messages: [{ role: "user", content: { type: "text", text } }],
    };
}
regTool("health", "Lightweight health check. Returns status, version, server calendar date (UTC), ISO timestamp, and capability summary. Call before dating changelogs, copyright years, or 'as of' lines when you need the MCP host clock.", {}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async () => {
    const now = new Date();
    const status = {
        status: "ok",
        version: _mcpVersion,
        calendarDateUtc: now.toISOString().slice(0, 10),
        timestampUtc: now.toISOString(),
        capabilities: [
            "skills",
            "agents",
            "commands",
            "rules",
            "workflow_step",
            "workflow_confirm",
            "workflow_usage_totals",
            "workflow_handoff_append",
            "workflow_handoff_read",
            "approval_checkpoint",
            "gate_log_append",
            "paperclip_issue_checkout",
            "paperclip_issue_comment",
            "paperclip_issue_update",
            "suggest_model_tier",
            "resources",
            "prompts",
        ],
    };
    return textContent(JSON.stringify(status));
});
regTool("list_workflow_types", "List available workflow types and their step counts. Use for discoverability before calling workflow_step.", {}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async () => {
    // Derive from workflowSteps (single source of truth) so new workflows can't drift out of sync.
    const table = Object.fromEntries(Object.entries(workflowSteps).map(([k, v]) => [k, { steps: v.length }]));
    return textContent(JSON.stringify(table));
});
regTool("suggest_model_tier", "Return the suggested LLM model tier for a workflow step or subagent role. Omit `step` to get the full per-step table for the workflow. When `role` is set (explorer | builder | judge | checker), returns the tier for that subagent kind and ignores step. Tiers: fast | standard | premium | premium_thinking. Suggestions reflect cognitive demand and incorporate modelTierOverrides / tierAliases from features.json or PNCORE_FEATURES.", {
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
        .enum(["explorer", "builder", "judge", "checker"])
        .optional()
        .describe("Subagent role tier (explorer=fast, builder=standard, judge=premium_thinking, checker=standard). When set, workflowType/step are optional."),
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ workflowType, step, role }) => {
    if (role !== undefined) {
        const base = resolveRoleTier(role, loadFeatures().tierAliases);
        return textContent(JSON.stringify({ role, ...base }));
    }
    if (workflowType === undefined) {
        return mcpError("INVALID_STATE", "Provide workflowType and optional step, or role", {});
    }
    if (step !== undefined) {
        const suggested = resolveStepTier(workflowType, step);
        if (suggested === null) {
            return mcpError("NOT_FOUND", `No step ${step} for workflow ${workflowType}`, {
                workflowType,
                step,
            });
        }
        return textContent(JSON.stringify({ workflowType, step, ...suggested }));
    }
    const stepCount = workflowSteps[workflowType]?.length ?? 0;
    const table = [];
    for (let i = 0; i < stepCount; i++) {
        const s = resolveStepTier(workflowType, i);
        if (s)
            table.push({ step: i, ...s });
    }
    return textContent(JSON.stringify({ workflowType, stepCount, steps: table }));
});
regTool("list_skills", "List pnCore skills. Without filters returns a category index with counts; use category or filter to drill in.", {
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
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ category, filter, limit }) => {
    const hasFilter = (category != null && category !== "") || (filter != null && filter !== "");
    const skills = listSkills({
        category: category ?? undefined,
        filter: filter ?? undefined,
    });
    if (!hasFilter && limit === undefined) {
        const byCategory = {};
        for (const s of skills) {
            const cat = s.category;
            if (!byCategory[cat])
                byCategory[cat] = { count: 0, skills: [] };
            byCategory[cat].count += 1;
            if (byCategory[cat].skills.length < 3)
                byCategory[cat].skills.push(s.id);
        }
        return textContent(JSON.stringify({
            total: skills.length,
            categories: byCategory,
            hint: "Use category or filter param to list skills in a specific category.",
        }));
    }
    const cap = limit === 0 ? skills.length : (limit ?? skills.length);
    return textContent(JSON.stringify(skills.slice(0, cap)));
});
regTool("get_skill", "Return full markdown content of a skill by id (e.g. pn-discovery-questionnaire, pn-svg-creator).", {
    id: z
        .string()
        .describe("Skill id (e.g. pn-discovery-questionnaire, pn-writing-plans, pn-svg-creator, pn-frontend-design-philosophy)"),
    run_id: runIdOptArg,
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ id, run_id }) => {
    let content = getSkill(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Skill not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_skill", id, max);
    }
    // M3: lightweight skill-load counter — append to .pncore/skill-load-log.jsonl (non-fatal)
    // PNCORE_SKILL_LOG_SAMPLE_RATE=N writes 1-in-N entries to reduce I/O on hot paths.
    const sampleRate = parseInt(process.env.PNCORE_SKILL_LOG_SAMPLE_RATE ?? "1", 10);
    const shouldLog = !Number.isFinite(sampleRate) || sampleRate <= 1 || Math.random() < 1 / sampleRate;
    if (shouldLog) {
        try {
            const logPath = resolve(safeBase, ".pncore", "skill-load-log.jsonl");
            const logDir = dirname(logPath);
            if (!existsSync(logDir))
                mkdirSync(logDir, { recursive: true });
            appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), id, ...(run_id ? { run_id } : {}) }) +
                "\n", "utf-8");
        }
        catch (err) {
            debug("trace", "skill-load-log append failed", { id, err: String(err) });
        }
    }
    return textContent(content);
});
const listGetTools = [
    {
        listName: "list_commands",
        getName: "get_command",
        listDesc: "List all pnCore command ids and descriptions.",
        getDesc: "Return full markdown content of a command by id (e.g. pn-build, pn-new, pn-design, pn-svg-creator).",
        idDesc: "Command id (e.g. pn-build, pn-new, pn-design, pn-setup, pn-backend-audit)",
        notFoundLabel: "Command",
        list: listCommands,
        get: getCommand,
    },
    {
        listName: "list_rules",
        getName: "get_rule",
        listDesc: "List all pnCore rule ids and descriptions.",
        getDesc: "Return full markdown content of a rule by id.",
        idDesc: "Rule id (e.g. pn-react, pn-nextjs, pn-build-gate, pn-mcp-proactive, pn-no-cursor-commit-trailers)",
        notFoundLabel: "Rule",
        list: listRules,
        get: getRule,
    },
];
// list_agents registered separately to support the `include` filter
regTool("list_agents", "List pnCore agent ids and descriptions. Use include='all' to surface internal orchestration agents.", {
    include: z
        .enum(["external", "internal", "all"])
        .optional()
        .describe("Which agents to include: 'external' (default, public-facing), 'internal' (orchestration-only), or 'all'"),
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ include }) => {
    const mode = include ?? "external";
    if (mode === "external")
        return textContent(JSON.stringify(listAgents()));
    if (mode === "internal")
        return textContent(JSON.stringify(listInternalAgents()));
    const ext = listAgents();
    const int_ = listInternalAgents();
    return textContent(JSON.stringify([...ext, ...int_]));
});
regTool("get_agent", "Return full markdown content of an agent by id (e.g. pn-project-builder, pn-skeptic).", {
    id: z
        .string()
        .describe("Agent id (e.g. pn-project-builder, pn-reviewer, pn-skeptic, pn-frontend-developer)"),
    run_id: runIdOptArg,
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ id, run_id }) => {
    let content = getAgent(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Agent not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_agent", id, max);
    }
    try {
        const logPath = resolve(safeBase, ".pncore", "skill-load-log.jsonl");
        const logDir = dirname(logPath);
        if (!existsSync(logDir))
            mkdirSync(logDir, { recursive: true });
        appendFileSync(logPath, JSON.stringify({
            ts: new Date().toISOString(),
            tool: "get_agent",
            id,
            ...(run_id ? { run_id } : {}),
        }) + "\n", "utf-8");
    }
    catch (err) {
        debug("trace", "skill-load-log append failed (get_agent)", { id, err: String(err) });
    }
    return textContent(content);
});
for (const { listName, getName, listDesc, getDesc, idDesc, notFoundLabel, list, get, } of listGetTools) {
    regTool(listName, listDesc, {}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async () => textContent(JSON.stringify(list())));
    regTool(getName, getDesc, { id: z.string().describe(idDesc), run_id: runIdOptArg }, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ id, run_id }) => {
        let content = get(id);
        if (content == null)
            return mcpError("NOT_FOUND", `${notFoundLabel} not found: ${id}`, { id });
        const max = getContentMaxChars();
        if (max < Number.MAX_SAFE_INTEGER) {
            content = truncateResourceBody(content, getName, id, max);
        }
        try {
            const logPath = resolve(safeBase, ".pncore", "skill-load-log.jsonl");
            const logDir = dirname(logPath);
            if (!existsSync(logDir))
                mkdirSync(logDir, { recursive: true });
            appendFileSync(logPath, JSON.stringify({
                ts: new Date().toISOString(),
                tool: getName,
                id,
                ...(run_id ? { run_id } : {}),
            }) + "\n", "utf-8");
        }
        catch (err) {
            debug("trace", `skill-load-log append failed (${getName})`, { id, err: String(err) });
        }
        return textContent(content);
    });
}
// Deterministic workflow engine: control flow in tool, not prompts. Model assists each step.
regTool("workflow_step", "Get the next instruction for a workflow step. Call this at workflow start and after completing each step. The tool validates state and returns a single instruction. Control flow is deterministic; the model cannot advance without valid state. Stateless: you supply full state on each call. When PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS lists this workflowType and the step gate is human, state must include pncoreHumanGateTicket from approval_checkpoint (see MCP README).", {
    workflowType: workflowTypeEnum.describe("Workflow type: design (6), full_dev (7), project_kickoff (8), prompt_optimize (3), frontend_audit (3), backend_audit (7), image_create (4), visual_tweak (4), game_feature (5), svg_create (5), engine_feature (5; requires state.engine: 'unreal'|'godot'), unreal_feature (5; deprecated alias for engine_feature), godot_feature (5; deprecated alias for engine_feature), fsi_analyst_draft (6), media_director (7), feature_program (6; requires featureProgram: true), implementation_tournament (6; requires bestOfN.enabled: true)"),
    step: z.number().int().min(0).describe("Current step number (0 = start)"),
    state: z
        .record(z.string(), z.unknown())
        .default({})
        .describe("State object: run_id? (UUID; echo on every call after first), request?, intent? (full_auto|design_focused|involved), discoverySpec?, priorArt?, plan?, skepticPassed?, specialistList?, routeConfirmed?, specialistSequentialComplete?, taskResults?, mergeComplete?, pncoreHumanGateTicket? (mandatory human gates when env PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS includes this workflow), etc."),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ workflowType, step, state }) => {
    const st = state;
    const runId = resolveWorkflowRunId(st);
    const result = getWorkflowStep(workflowType, step, st);
    if ("error" in result)
        return mcpError("INVALID_STATE", result.error, { workflowType, step });
    if (result.gate === "human" &&
        workflowRequiresHumanGateApproval(requiredHumanGateWorkflows, workflowType)) {
        const ticketsSafe = resolveSafePath(defaultHumanGateTicketsPath);
        if ("error" in ticketsSafe) {
            return mcpError("PATH_TRAVERSAL", ticketsSafe.error, { path: defaultHumanGateTicketsPath });
        }
        const ticketsPath = ticketsSafe.resolved;
        const dir = dirname(ticketsPath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        const ticket = typeof st.pncoreHumanGateTicket === "string" ? st.pncoreHumanGateTicket : undefined;
        const consume = validateAndConsumeHumanGateTicket(ticketsPath, workflowType, step, ticket, runId);
        if (!consume.ok) {
            return mcpError(consume.code, consume.reason, {
                workflowType,
                step,
                hint: "Call approval_checkpoint with approval_token, action_label, workflow_type, and workflow_step matching this call; pass pncoreHumanGateTicket in state on the next workflow_step.",
            });
        }
    }
    const logPath = process.env.PNCORE_RUN_LOG ?? ".pncore/workflow-runs.jsonl";
    if (logPath) {
        try {
            const safe = resolveSafePath(logPath);
            if (!("error" in safe)) {
                const dir = dirname(safe.resolved);
                if (!existsSync(dir))
                    mkdirSync(dir, { recursive: true });
                const entry = {
                    ts: new Date().toISOString(),
                    runId,
                    workflowType,
                    step,
                    nextStep: result.nextStep,
                    gate: result.gate,
                    done: result.done ?? false,
                    stateKeys: Object.keys(st).filter((k) => st[k] != null),
                };
                appendFileSync(safe.resolved, JSON.stringify(entry) + "\n", "utf-8");
            }
        }
        catch (err) {
            debug("workflows", "workflow-run-log append failed", {
                workflowType,
                step,
                err: String(err),
            });
        }
    }
    return textContent(JSON.stringify({ ...result, run_id: runId }));
});
// Optional: report token/cost usage for a workflow step (client is source of truth; persist to path when provided)
regTool("report_usage", "Report token and cost usage for a workflow step. Call after workflow_step when the client has usage data. Optional path: append one JSON line to the file (e.g. .pncore/usage.jsonl in workspace). If path omitted, returns summary only.", {
    workflowType: workflowTypeEnum.describe("Workflow type (same as workflow_step)"),
    step: z.number().int().min(0).describe("Step number"),
    inputTokens: z.number().int().min(0).describe("Input token count"),
    outputTokens: z.number().int().min(0).describe("Output token count"),
    costUsd: z.number().min(0).optional().describe("Cost in USD (optional)"),
    latencyMs: z.number().min(0).optional().describe("Latency in milliseconds (optional)"),
    run_id: z
        .string()
        .optional()
        .describe("Workflow run_id from workflow_step; include for totals"),
    path: z
        .string()
        .optional()
        .describe("Optional file path to append to (e.g. .pncore/usage.jsonl); must be within process cwd"),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ workflowType, step, inputTokens, outputTokens, costUsd, latencyMs, run_id, path: filePath, }) => {
    const entry = {
        ts: new Date().toISOString(),
        workflowType,
        step,
        inputTokens,
        outputTokens,
        ...(costUsd != null && { costUsd }),
        ...(latencyMs != null && { latencyMs }),
        ...(run_id != null && run_id !== "" ? { run_id } : {}),
    };
    if (filePath) {
        const safe = resolveSafePath(filePath);
        if ("error" in safe)
            return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath });
        try {
            const resolved = safe.resolved;
            const dir = dirname(resolved);
            if (!existsSync(dir))
                mkdirSync(dir, { recursive: true });
            appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
            return textContent(JSON.stringify({ ok: true, path: resolved, entry }));
        }
        catch (err) {
            return mcpError("IO_ERROR", String(err), { entry });
        }
    }
    return textContent(JSON.stringify({ summary: entry }));
});
const defaultUsagePath = ".pncore/usage.jsonl";
const usageScanMaxBytes = tailScanBytesFromEnv(process.env.PNCORE_USAGE_SCAN_BYTES, 786_432);
const handoffScanMaxBytes = tailScanBytesFromEnv(process.env.PNCORE_HANDOFF_SCAN_BYTES, 786_432);
regTool("workflow_usage_totals", "Sum inputTokens, outputTokens, and optional costUsd for a workflow run_id from a usage JSONL file (same format as report_usage). Scans tail of file for safety.", {
    run_id: z.string().min(1).describe("run_id from workflow_step responses"),
    path: z.string().optional().describe(`Optional usage JSONL path (default ${defaultUsagePath})`),
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ run_id, path: filePath }) => {
    const rel = filePath ?? defaultUsagePath;
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
    const resolved = safe.resolved;
    if (!existsSync(resolved))
        return textContent(JSON.stringify({
            run_id,
            path: resolved,
            linesMatched: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: null,
            warn: false,
        }));
    try {
        const raw = readFileTail(resolved, usageScanMaxBytes);
        let inputTokens = 0;
        let outputTokens = 0;
        let costUsd = 0;
        let hasCost = false;
        let linesMatched = 0;
        for (const line of raw.split("\n")) {
            const t = line.trim();
            if (!t)
                continue;
            try {
                const o = JSON.parse(t);
                if (o.run_id !== run_id)
                    continue;
                linesMatched += 1;
                const it = o.inputTokens;
                const ot = o.outputTokens;
                if (typeof it === "number" && Number.isFinite(it))
                    inputTokens += it;
                if (typeof ot === "number" && Number.isFinite(ot))
                    outputTokens += ot;
                const c = o.costUsd;
                if (typeof c === "number" && Number.isFinite(c)) {
                    costUsd += c;
                    hasCost = true;
                }
            }
            catch {
                /* skip line */
            }
        }
        const warnThreshold = parseInt(process.env.PNCORE_USAGE_WARN_INPUT_TOKENS ?? "", 10);
        const warn = Number.isFinite(warnThreshold) && warnThreshold > 0 && inputTokens >= warnThreshold;
        return textContent(JSON.stringify({
            run_id,
            path: resolved,
            linesMatched,
            inputTokens,
            outputTokens,
            costUsd: hasCost ? costUsd : null,
            warn,
            ...(warn
                ? {
                    warnMessage: `inputTokens ${inputTokens} >= PNCORE_USAGE_WARN_INPUT_TOKENS (${warnThreshold})`,
                }
                : {}),
        }));
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), { path: resolved });
    }
});
const defaultHandoffPath = process.env.PNCORE_HANDOFF_LOG ?? ".pncore/workflow-handoff.jsonl";
const HANDOFF_SUMMARY_MAX = 4000;
const HANDOFF_READ_MAX_LINES = 80;
regTool("workflow_handoff_append", "Append a bounded workflow step summary to JSONL for cross-session handoff (same run_id as workflow_step).", {
    run_id: z.string().min(1).describe("Echo run_id from workflow_step"),
    step: z.number().int().min(0).describe("Workflow step index just completed"),
    summary: z.string().min(1).max(HANDOFF_SUMMARY_MAX).describe("Short summary (max 4000 chars)"),
    path: z.string().optional().describe(`Optional JSONL path (default ${defaultHandoffPath})`),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ run_id, step, summary, path: filePath }) => {
    const rel = filePath ?? defaultHandoffPath;
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
    try {
        const resolved = safe.resolved;
        const dir = dirname(resolved);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        const entry = {
            ts: new Date().toISOString(),
            run_id,
            step,
            summary: summary.slice(0, HANDOFF_SUMMARY_MAX),
        };
        appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
        return textContent(JSON.stringify({ ok: true, path: resolved }));
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), { run_id, step });
    }
});
regTool("workflow_handoff_read", "Read recent handoff lines for a run_id (workflow_handoff_append). New chat: call with run_id to restore context.", {
    run_id: z.string().min(1).describe("Echo run_id from workflow_step / workflow_handoff_append"),
    path: z.string().optional().describe(`Optional JSONL path (default ${defaultHandoffPath})`),
    max_lines: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe(`Max matching lines (default ${HANDOFF_READ_MAX_LINES})`),
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ run_id, path: filePath, max_lines }) => {
    const rel = filePath ?? defaultHandoffPath;
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
    const resolved = safe.resolved;
    if (!existsSync(resolved))
        return textContent(JSON.stringify({ run_id, path: resolved, lines: [] }));
    const cap = max_lines ?? HANDOFF_READ_MAX_LINES;
    try {
        const raw = readFileTail(resolved, handoffScanMaxBytes);
        const matched = [];
        for (const line of raw.split("\n")) {
            const t = line.trim();
            if (!t)
                continue;
            try {
                const o = JSON.parse(t);
                if (o.run_id !== run_id)
                    continue;
                const ts = typeof o.ts === "string" ? o.ts : "";
                const step = typeof o.step === "number" ? o.step : -1;
                const summary = typeof o.summary === "string" ? o.summary : "";
                matched.push({ ts, step, summary });
            }
            catch {
                /* skip */
            }
        }
        const tail = matched.slice(-cap);
        return textContent(JSON.stringify({ run_id, path: resolved, lines: tail }));
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), { path: resolved });
    }
});
// MCP-only gate: structured confirmation prompt (approximates ask_question when Cursor ask_question is unavailable)
const workflowGateTypeEnum = z
    .enum(["skeptic", "plan", "design", "discovery"])
    .optional()
    .describe("Gate kind for audit log (default plan). Use skeptic after pn-skeptic-challenge.");
const workflowGateVerdictEnum = z
    .enum(["proceed", "revise", "conditional_go"])
    .optional()
    .describe("Skeptic or plan verdict; required context when gate_type=skeptic and verdict=revise.");
regTool("workflow_confirm", "Present a structured confirmation gate to the user. Use when ask_question is unavailable (MCP-only), or after AskQuestion in Cursor to record gate_id in .pncore/gate-log.jsonl. Returns formatted prompt text, options, and gate_id. You MUST output the prompt to the user, list the options, and STOP. Do not proceed until the user replies. For skeptic gates: set gate_type=skeptic, verdict, and non-empty context when verdict=revise.", {
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
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, async ({ question, options, context, gate_type, verdict, must_fix_summary, path: filePath }) => {
    const gateInput = {
        question,
        options,
        context,
        gate_type: gate_type,
        verdict: verdict,
        must_fix_summary,
        path: filePath,
    };
    const validationError = validateWorkflowConfirmGate(gateInput);
    if (validationError) {
        return mcpError("INVALID_GATE", validationError, { gate_type, verdict });
    }
    const logEntry = createWorkflowGateLogEntry(gateInput);
    const logResult = appendWorkflowGateLog(logEntry, filePath ?? defaultGateLogPath);
    if ("error" in logResult) {
        return mcpError("IO_ERROR", logResult.error, { gate_id: logEntry.gate_id });
    }
    const prompt = [
        "**Gate (wait for user reply):**",
        "",
        question,
        "",
        "**Options:** " + options.map((o) => `\`${o}\``).join(", ") + ".",
        "",
        "Reply with one option or your correction. Do not proceed until the user replies.",
    ];
    if (context) {
        prompt.splice(1, 0, context, "");
    }
    if (must_fix_summary?.trim()) {
        prompt.splice(context ? 2 : 1, 0, "**Must fix:** " + must_fix_summary.trim(), "");
    }
    return textContent(JSON.stringify({
        instruction: "Output the following to the user. STOP. Do not proceed to the next step until the user replies. Parse their reply (match to an option or treat as free-form), then continue. When advancing workflow_step with skepticPassed, prefer { verdict, go_no_go, gate_id, confirmed_at } using this gate_id after the user confirms.",
        prompt: prompt.join("\n"),
        options,
        gate_id: logEntry.gate_id,
        gate_log_path: logResult.path,
        gate_type: logEntry.gate_type,
        ...(verdict != null ? { verdict } : {}),
    }));
});
// Hard HITL: succeeds only if token matches server env (user configures MCP env; model cannot guess the secret)
regTool("approval_checkpoint", "Hard approval gate: returns success only if approval_token equals PNCORE_APPROVAL_TOKEN on the MCP server process. Configure the env var in MCP server config (not in chat). Optional workflow_type + workflow_step: when both are set and the token matches, appends a one-time ticket and returns pncoreHumanGateTicket for the next workflow_step human gate (used with PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS). If the env var is unset, returns an error (fail closed).", {
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
        .describe("Optional. When issuing a human-gate ticket, ties the ticket to this workflow run_id; workflow_step state must echo the same run_id when consuming."),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ approval_token, action_label, workflow_type, workflow_step, run_id }) => {
    const hasWf = workflow_type !== undefined;
    const hasStep = workflow_step !== undefined;
    if (hasWf !== hasStep) {
        return mcpError("INVALID_STATE", "workflow_type and workflow_step must both be provided or both omitted.", { workflow_type, workflow_step });
    }
    const result = evaluateApprovalCheckpoint(approval_token, action_label);
    if (!result.success) {
        const d = result.data;
        return mcpError(d.code, d.error, { action_label: d.action_label });
    }
    if (hasWf && workflow_type !== undefined && workflow_step !== undefined) {
        const ticketsSafe = resolveSafePath(defaultHumanGateTicketsPath);
        if ("error" in ticketsSafe) {
            return mcpError("PATH_TRAVERSAL", ticketsSafe.error, { path: defaultHumanGateTicketsPath });
        }
        const ticketsPath = ticketsSafe.resolved;
        const dir = dirname(ticketsPath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        const pncoreHumanGateTicket = issueHumanGateTicket(ticketsPath, workflow_type, workflow_step, run_id);
        return textContent(JSON.stringify({
            ...result.data,
            pncoreHumanGateTicket,
            workflow_type,
            workflow_step,
            note: `${result.data.note} Pass pncoreHumanGateTicket in workflow_step state for this human gate.`,
        }));
    }
    return textContent(JSON.stringify(result.data));
});
regTool("gate_log_append", "Append-only audit line for human or workflow gates. Writes one JSON object per line (JSONL) under the workspace, same path rules as report_usage. Use after user outcomes at gates (complements approval_checkpoint).", {
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
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ gate_type, workflowType, step, outcome, action_label, run_id, path: filePath }) => {
    const rel = filePath ?? ".pncore/gate-log.jsonl";
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
    try {
        const resolved = safe.resolved;
        const dir = dirname(resolved);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        const entry = {
            timestamp: new Date().toISOString(),
            gate_type,
            workflowType,
            step,
            outcome,
            ...(action_label != null && action_label !== "" ? { action_label } : {}),
            ...(run_id != null && run_id !== "" ? { run_id } : {}),
        };
        appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
        return textContent(JSON.stringify({ ok: true, path: resolved, entry }));
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), { gate_type, workflowType, step });
    }
});
// Optional: persist workflow state to a file for resume (shared memory / state persistence)
const defaultStatePath = process.env.PNCORE_STATE_PATH ?? ".pncore/workflow-state.json";
regTool("workflow_state_save", "Save workflow state to a file so it can be restored later (resume after disconnect). Path defaults to .pncore/workflow-state.json relative to process cwd.", {
    state: z
        .record(z.string(), z.unknown())
        .describe("State object (same shape passed to workflow_step)"),
    path: z
        .string()
        .optional()
        .describe("Optional file path; default .pncore/workflow-state.json; must be within process cwd"),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: true }, async ({ state, path: filePath }) => {
    const safe = resolveSafePath(filePath ?? defaultStatePath);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath ?? defaultStatePath });
    try {
        const path = safe.resolved;
        const dir = dirname(path);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        writeFileSync(path, JSON.stringify(state), "utf-8");
        return textContent(JSON.stringify({ ok: true, path }));
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), { path: safe.resolved });
    }
});
regTool("workflow_state_load", "Load workflow state from a file (e.g. after reconnect). Path defaults to .pncore/workflow-state.json relative to process cwd.", {
    path: z
        .string()
        .optional()
        .describe("Optional file path; default .pncore/workflow-state.json; must be within process cwd"),
}, { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, async ({ path: filePath }) => {
    const safe = resolveSafePath(filePath ?? defaultStatePath);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath ?? defaultStatePath });
    const path = safe.resolved;
    try {
        if (!existsSync(path))
            return mcpError("FILE_NOT_FOUND", "File not found", { path });
        const raw = readFileSync(path, "utf-8");
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return mcpError("PARSE_ERROR", "State file is not a JSON object", { path });
        }
        const state = parsed;
        return textContent(JSON.stringify({ state }));
    }
    catch (err) {
        if (err instanceof SyntaxError) {
            return mcpError("PARSE_ERROR", "Invalid JSON in state file", { path });
        }
        return mcpError("IO_ERROR", String(err), { path });
    }
});
// Paperclip integration (optional; PAPERCLIP_API_URL + PAPERCLIP_API_KEY; issue id via arg or PAPERCLIP_ISSUE_ID)
regTool("paperclip_issue_checkout", "Check out a Paperclip issue (POST /api/issues/:id/checkout). Use before starting work per pn-paperclip governance. Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.", {
    issueId: z
        .string()
        .optional()
        .describe("Issue ID (e.g. uuid or PAP-123); defaults to PAPERCLIP_ISSUE_ID when set"),
}, { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, async ({ issueId }) => {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(issueId);
    if (!id)
        return paperclipMissingIssueId();
    const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}/checkout`;
    try {
        const res = await fetch(url, { method: "POST", headers: cfg.headers, body: "{}" });
        return paperclipResultToContent(await parsePaperclipResponse(res), id);
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), {
            issueId: id,
            hint: "Check PAPERCLIP_API_URL reachability",
        });
    }
});
regTool("paperclip_issue_comment", "Add a markdown comment on a Paperclip issue (POST /api/issues/:id/comments with body). Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.", {
    issueId: z.string().optional().describe("Issue ID; defaults to PAPERCLIP_ISSUE_ID when set"),
    body: z.string().describe("Comment body (markdown); supports @mentions per Paperclip docs"),
}, { readOnlyHint: false, destructiveHint: true, idempotentHint: false }, async ({ issueId, body }) => {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(issueId);
    if (!id)
        return paperclipMissingIssueId();
    const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}/comments`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: cfg.headers,
            body: JSON.stringify({ body }),
        });
        return paperclipResultToContent(await parsePaperclipResponse(res), id);
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), {
            issueId: id,
            hint: "Check PAPERCLIP_API_URL reachability",
        });
    }
});
regTool("paperclip_issue_update", "Update a Paperclip issue status (PATCH /api/issues/:id). Prefer paperclip_issue_checkout for in_progress per governance. Requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY. issueId optional if PAPERCLIP_ISSUE_ID is set.", {
    issueId: z.string().optional().describe("Issue ID; defaults to PAPERCLIP_ISSUE_ID when set"),
    status: z
        .enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"])
        .describe("New status (done = workflow complete)"),
    comment: z.string().optional().describe("Optional comment with the update (summary of work)"),
}, { readOnlyHint: false, destructiveHint: true, idempotentHint: false }, async ({ issueId, status, comment }) => {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(issueId);
    if (!id)
        return paperclipMissingIssueId();
    const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}`;
    const body = { status };
    if (comment)
        body.comment = comment;
    try {
        const res = await fetch(url, {
            method: "PATCH",
            headers: cfg.headers,
            body: JSON.stringify(body),
        });
        return paperclipResultToContent(await parsePaperclipResponse(res), id);
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), {
            issueId: id,
            hint: "Check PAPERCLIP_API_URL reachability",
        });
    }
});
// Resources: config and reference docs (fetchable when workspace lacks them)
for (const def of resourceDefs) {
    server.registerResource(def.name, def.uri, {
        title: def.name,
        description: def.description,
        mimeType: def.mimeType,
    }, () => {
        const result = getResource(def.uri);
        if (result == null) {
            throwMcpError("NOT_FOUND", "Resource not found", { uri: def.uri });
        }
        return {
            contents: [{ uri: def.uri, mimeType: result.mimeType, text: result.text }],
        };
    });
}
// Prompts: agents and commands as reusable prompt templates (dedupe by id — agent wins on collision)
const agentIds = new Set(listAgents().map((a) => a.id));
for (const { id, name, description } of listAgents()) {
    regPrompt(id, description || `Run the ${name} agent`, contextArgSchema, ({ context }) => {
        const content = getAgent(id);
        if (content == null)
            throwMcpError("NOT_FOUND", `Agent not found: ${id}`, { id });
        return promptMessages(content, context);
    });
}
for (const { id, name, description } of listCommands()) {
    if (agentIds.has(id))
        continue; // skip — already registered as agent prompt
    regPrompt(id, description || `Run the ${name} command`, contextArgSchema, ({ context }) => {
        const content = getCommand(id);
        if (content == null)
            throwMcpError("NOT_FOUND", `Command not found: ${id}`, { id });
        return promptMessages(content, context);
    });
}
const transport = new StdioServerTransport();
await server.connect(transport);
const feats = loadFeatures();
debug("trace", `pn-core-mcp v${_mcpVersion} ready`, {
    content: process.env.PNCORE_CONTENT_PATH ?? "(default)",
    features: feats,
});
