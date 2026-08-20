import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { listSkills, getSkill, listAgents, listInternalAgents, getAgent, listCommands, getCommand, listRules, getRule, } from "../content.js";
import { getWorkflowStep, PUBLIC_WORKFLOW_TYPES, resolveStepTier, workflowSteps, } from "../workflows.js";
import { resolveRoleTier } from "../model-tiers.js";
import { loadPaperclipConfig, resolvePaperclipIssueId, parsePaperclipResponse, } from "../paperclip.js";
import { evaluateApprovalCheckpoint } from "../approval-checkpoint.js";
import { issueHumanGateTicket, validateAndConsumeHumanGateTicket, workflowRequiresHumanGateApproval, } from "../human-gate-tickets.js";
import { resolveWorkflowRunId } from "../run-id.js";
import { truncateResourceBody } from "../resource-truncate.js";
import { disposeVerifyAllowArgvEnabled, disposeVerifyEnabled, loadFeatures } from "../features.js";
import { resolveCatalogArgv } from "../verify-catalog.js";
import { VerifyPolicyError, assertSafeArgv, resolveSandboxBackend, sandboxLabel, spawnVerify, } from "../verify-sandbox.js";
import { appendRunEvent, newAttestationId, readRunEvents, } from "../verify-attest.js";
import { readFileTail } from "../file-tail.js";
import { appendWorkflowGateLog, createWorkflowGateLogEntry, validateWorkflowConfirmGate, } from "../workflow-gate-log.js";
import { MCP_VERSION, appendSkillLoadLog, defaultGateLogPath, defaultHandoffPath, defaultHumanGateTicketsPath, defaultStatePath, defaultUsagePath, getContentMaxChars, handoffScanMaxBytes, HANDOFF_READ_MAX_LINES, HANDOFF_SUMMARY_MAX, mcpError, requiredHumanGateWorkflows, resolveSafePath, textContent, usageScanMaxBytes, debug, } from "./tool-runtime.js";
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
export async function handleHealth() {
    const now = new Date();
    const status = {
        status: "ok",
        version: MCP_VERSION,
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
            "workflow_verify",
            "workflow_run_query",
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
}
export async function handleListWorkflowTypes() {
    const table = Object.fromEntries(PUBLIC_WORKFLOW_TYPES.map((k) => [k, { steps: workflowSteps[k].length }]));
    return textContent(JSON.stringify(table));
}
export async function handleSuggestModelTier(args) {
    const { workflowType, step, role } = args;
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
}
export async function handleListSkills(args) {
    const { category, filter, limit } = args;
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
}
export async function handleGetSkill(args) {
    const { id, run_id } = args;
    let content = getSkill(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Skill not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_skill", id, max);
    }
    appendSkillLoadLog("get_skill", id, run_id);
    return textContent(content);
}
export async function handleListAgents(args) {
    const mode = args.include ?? "external";
    if (mode === "external")
        return textContent(JSON.stringify(listAgents()));
    if (mode === "internal")
        return textContent(JSON.stringify(listInternalAgents()));
    const ext = listAgents();
    const int_ = listInternalAgents();
    return textContent(JSON.stringify([...ext, ...int_]));
}
export async function handleGetAgent(args) {
    const { id, run_id } = args;
    let content = getAgent(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Agent not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_agent", id, max);
    }
    appendSkillLoadLog("get_agent", id, run_id);
    return textContent(content);
}
export async function handleListCommands() {
    return textContent(JSON.stringify(listCommands()));
}
export async function handleGetCommand(args) {
    const { id, run_id } = args;
    let content = getCommand(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Command not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_command", id, max);
    }
    appendSkillLoadLog("get_command", id, run_id);
    return textContent(content);
}
export async function handleListRules() {
    return textContent(JSON.stringify(listRules()));
}
export async function handleGetRule(args) {
    const { id, run_id } = args;
    let content = getRule(id);
    if (content == null)
        return mcpError("NOT_FOUND", `Rule not found: ${id}`, { id });
    const max = getContentMaxChars();
    if (max < Number.MAX_SAFE_INTEGER) {
        content = truncateResourceBody(content, "get_rule", id, max);
    }
    appendSkillLoadLog("get_rule", id, run_id);
    return textContent(content);
}
export async function handleWorkflowStep(args) {
    const { workflowType, step, state } = args;
    const st = (state ?? {});
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
    if (result.acceptance) {
        appendRunEvent({
            kind: "acceptance",
            run_id: runId,
            ts: new Date().toISOString(),
            workflowType,
            step,
            ...result.acceptance,
        });
    }
    return textContent(JSON.stringify({ ...result, run_id: runId }));
}
export async function handleReportUsage(args) {
    const { workflowType, step, inputTokens, outputTokens, costUsd, latencyMs, run_id, path: filePath, } = args;
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
}
export async function handleWorkflowUsageTotals(args) {
    const { run_id, path: filePath } = args;
    const rel = filePath ?? defaultUsagePath;
    const safe = resolveSafePath(rel);
    if ("error" in safe)
        return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
    const resolved = safe.resolved;
    if (!existsSync(resolved)) {
        return textContent(JSON.stringify({
            run_id,
            path: resolved,
            linesMatched: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: null,
            warn: false,
        }));
    }
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
}
export async function handleWorkflowHandoffAppend(args) {
    const { run_id, step, summary, path: filePath } = args;
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
}
export async function handleWorkflowHandoffRead(args) {
    const { run_id, path: filePath, max_lines } = args;
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
}
export async function handleWorkflowConfirm(args) {
    const { question, options, context, gate_type, verdict, must_fix_summary, path: filePath } = args;
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
}
export async function handleApprovalCheckpoint(args) {
    const { approval_token, action_label, workflow_type, workflow_step, run_id } = args;
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
        if (run_id === undefined || run_id.trim() === "") {
            return mcpError("INVALID_STATE", "run_id is required when issuing a human-gate ticket (workflow_type + workflow_step).", { workflow_type, workflow_step });
        }
        const ticketsSafe = resolveSafePath(defaultHumanGateTicketsPath);
        if ("error" in ticketsSafe) {
            return mcpError("PATH_TRAVERSAL", ticketsSafe.error, { path: defaultHumanGateTicketsPath });
        }
        const ticketsPath = ticketsSafe.resolved;
        const dir = dirname(ticketsPath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        const pncoreHumanGateTicket = issueHumanGateTicket(ticketsPath, workflow_type, workflow_step, run_id.trim());
        return textContent(JSON.stringify({
            ...result.data,
            pncoreHumanGateTicket,
            workflow_type,
            workflow_step,
            note: `${result.data.note} Pass pncoreHumanGateTicket in workflow_step state for this human gate.`,
        }));
    }
    return textContent(JSON.stringify(result.data));
}
export async function handleGateLogAppend(args) {
    const { gate_type, workflowType, step, outcome, action_label, run_id, path: filePath } = args;
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
}
export async function handleWorkflowStateSave(args) {
    const { state, path: filePath } = args;
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
}
export async function handleWorkflowStateLoad(args) {
    const { path: filePath } = args;
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
}
export async function handlePaperclipIssueCheckout(args) {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(args.issueId);
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
}
export async function handlePaperclipIssueComment(args) {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(args.issueId);
    if (!id)
        return paperclipMissingIssueId();
    const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}/comments`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: cfg.headers,
            body: JSON.stringify({ body: args.body }),
        });
        return paperclipResultToContent(await parsePaperclipResponse(res), id);
    }
    catch (err) {
        return mcpError("IO_ERROR", String(err), {
            issueId: id,
            hint: "Check PAPERCLIP_API_URL reachability",
        });
    }
}
export async function handlePaperclipIssueUpdate(args) {
    const cfg = loadPaperclipConfig();
    if (!cfg)
        return paperclipNotConfigured();
    const id = resolvePaperclipIssueId(args.issueId);
    if (!id)
        return paperclipMissingIssueId();
    const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}`;
    const body = { status: args.status };
    if (args.comment)
        body.comment = args.comment;
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
}
export async function handleWorkflowVerify(args) {
    if (!disposeVerifyEnabled()) {
        return mcpError("DISPOSE_UNAVAILABLE", "workflow_verify is off. Set PNCORE_DISPOSE_VERIFY=1 or PNCORE_FEATURES.disposeVerify true.", {});
    }
    const hasCmd = typeof args.commandId === "string" && args.commandId.trim() !== "";
    const hasArgv = Array.isArray(args.argv) && args.argv.length > 0;
    if (hasCmd === hasArgv) {
        return mcpError("INVALID_STATE", "Pass exactly one of commandId or argv", {});
    }
    const cwdRel = args.cwd && args.cwd.trim() !== "" ? args.cwd : ".";
    const cwdSafe = resolveSafePath(cwdRel);
    if ("error" in cwdSafe)
        return mcpError("PATH_TRAVERSAL", cwdSafe.error, { path: cwdRel });
    let argv;
    if (hasCmd) {
        const resolved = resolveCatalogArgv(args.commandId, cwdSafe.resolved);
        if ("error" in resolved)
            return mcpError("INVALID_STATE", resolved.error, {});
        argv = resolved.argv;
    }
    else {
        if (!disposeVerifyAllowArgvEnabled()) {
            return mcpError("INVALID_ARGV", "Free-form argv requires disposeVerifyAllowArgv (PNCORE_DISPOSE_VERIFY_ALLOW_ARGV=1)", {});
        }
        try {
            assertSafeArgv(args.argv, { freeform: true });
        }
        catch (err) {
            if (err instanceof VerifyPolicyError)
                return mcpError(err.code, err.message, {});
            throw err;
        }
        argv = args.argv;
    }
    const backend = resolveSandboxBackend();
    if (backend === "unavailable") {
        return mcpError("DISPOSE_UNAVAILABLE", "Dispose-verify jail is unavailable. Install bwrap, set PNCORE_VERIFY_SANDBOX=restricted, or run under Vitest (test backend).", {});
    }
    const startedAt = new Date().toISOString();
    let spawned;
    try {
        spawned = await spawnVerify({
            argv,
            cwd: cwdSafe.resolved,
            timeoutMs: args.timeoutMs,
            backend,
        });
    }
    catch (err) {
        if (err instanceof VerifyPolicyError)
            return mcpError(err.code, err.message, {});
        return mcpError("IO_ERROR", String(err), {});
    }
    const finishedAt = new Date().toISOString();
    const report = {
        kind: "verify",
        run_id: args.run_id,
        commandId: hasCmd ? args.commandId : undefined,
        argv,
        cwd: cwdSafe.resolved,
        exitCode: spawned.exitCode,
        timedOut: spawned.timedOut,
        stdoutTail: spawned.stdoutTail,
        stderrTail: spawned.stderrTail,
        startedAt,
        finishedAt,
        attestationId: newAttestationId(),
        candidate_id: args.candidate_id,
        workflowType: args.workflowType,
        step: args.step,
        sandbox: sandboxLabel(backend),
    };
    const written = appendRunEvent(report);
    if ("error" in written)
        return mcpError("PATH_TRAVERSAL", written.error, {});
    return textContent(JSON.stringify({ ok: true, ...report }));
}
export async function handleWorkflowRunQuery(args) {
    const kinds = args.kinds ?? ["verify", "acceptance"];
    const result = readRunEvents(args.run_id, {
        path: args.path,
        kinds,
        limit: args.limit,
    });
    if ("error" in result)
        return mcpError("PATH_TRAVERSAL", result.error, { path: args.path });
    const verify = result.events.filter((e) => e.kind === "verify");
    const acceptance = result.events.filter((e) => e.kind === "acceptance").slice(-1)[0];
    return textContent(JSON.stringify({
        run_id: args.run_id,
        path: result.path,
        events: result.events,
        verify,
        acceptance: acceptance ?? null,
    }));
}
