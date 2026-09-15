import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import {
  listSkills,
  getSkill,
  listAgents,
  listInternalAgents,
  getAgent,
  listCommands,
  getCommand,
  listRules,
  getRule,
} from "../content.js";
import {
  getWorkflowStep,
  PUBLIC_WORKFLOW_TYPES,
  resolveStepTier,
  workflowSteps,
} from "../workflows.js";
import { resolveRoleTier } from "../model-tiers.js";
import {
  loadPaperclipConfig,
  resolvePaperclipIssueId,
  parsePaperclipResponse,
  type PaperclipResult,
} from "../paperclip.js";
import { evaluateApprovalCheckpoint } from "../approval-checkpoint.js";
import {
  issueHumanGateTicket,
  validateAndConsumeHumanGateTicket,
  workflowRequiresHumanGateApproval,
} from "../human-gate-tickets.js";
import { resolveWorkflowRunId } from "../run-id.js";
import { parseRunLog, runLogStateEnabled, snapshotStateForLog } from "../trajectory.js";
import { agentsMdCapBytes, packProjectContext } from "../context-budget.js";
import {
  beginStepSpan,
  buildRunTimeline,
  readTrail,
  roundMs,
  trailPaths,
  type TrailId,
} from "../run-spans.js";
import { truncateResourceBody } from "../resource-truncate.js";
import { disposeVerifyAllowArgvEnabled, disposeVerifyEnabled, loadFeatures } from "../features.js";
import { resolveCatalogArgv } from "../verify-catalog.js";
import {
  VerifyPolicyError,
  assertSafeArgv,
  resolveSandboxBackend,
  sandboxLabel,
  spawnVerify,
} from "../verify-sandbox.js";
import {
  appendRunEvent,
  newAttestationId,
  readRunEvents,
  type GateReport,
} from "../verify-attest.js";
import { readFileTail } from "../file-tail.js";
import {
  appendWorkflowGateLog,
  createWorkflowGateLogEntry,
  validateWorkflowConfirmGate,
  type WorkflowGateType,
  type WorkflowGateVerdict,
} from "../workflow-gate-log.js";
import { buildProjectContextPacket } from "../project-context.js";
import {
  HARNESS_IDS,
  HARNESS_LAYOUTS,
  applyScaffoldPlan,
  buildScaffoldPlan,
  detectHarness,
  instructionsBudgetFor,
  layoutTable,
  upsertManagedBlock,
  type AppliedFile,
  type InstructionsBudget,
  type ScaffoldInclude,
} from "../harness.js";
import type { ShapeArgs } from "./tool-runtime.js";
import {
  MCP_VERSION,
  appendSkillLoadLog,
  defaultGateLogPath,
  defaultHandoffPath,
  defaultHumanGateTicketsPath,
  defaultStatePath,
  defaultUsagePath,
  getContentMaxChars,
  handoffScanMaxBytes,
  HANDOFF_READ_MAX_LINES,
  HANDOFF_SUMMARY_MAX,
  mcpError,
  requiredHumanGateWorkflows,
  resolveSafePath,
  safeBase,
  textContent,
  usageScanMaxBytes,
  debug,
} from "./tool-runtime.js";
import type {
  approvalCheckpointSchema,
  gateLogAppendSchema,
  getAgentSchema,
  getCommandSchema,
  getRuleSchema,
  getSkillSchema,
  harnessDetectSchema,
  harnessScaffoldSchema,
  listAgentsSchema,
  listSkillsSchema,
  paperclipIssueCheckoutSchema,
  paperclipIssueCommentSchema,
  paperclipIssueUpdateSchema,
  projectContextSchema,
  reportUsageSchema,
  suggestModelTierSchema,
  workflowConfirmSchema,
  workflowHandoffAppendSchema,
  workflowHandoffReadSchema,
  workflowStateLoadSchema,
  workflowStateSaveSchema,
  workflowRunQuerySchema,
  workflowStepSchema,
  workflowUsageTotalsSchema,
  workflowVerifySchema,
} from "./schemas-zod.js";

function paperclipNotConfigured() {
  return mcpError(
    "INVALID_STATE",
    "Paperclip not configured. Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY.",
    { hint: "Get API key from Paperclip agent settings" }
  );
}

function paperclipMissingIssueId() {
  return mcpError("INVALID_STATE", "Missing issue id. Pass issueId or set PAPERCLIP_ISSUE_ID.", {
    hint: "Paperclip runs often set PAPERCLIP_ISSUE_ID; otherwise pass issueId on each tool call.",
  });
}

function paperclipResultToContent(result: PaperclipResult, issueId: string) {
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
      "project_context",
      "harness_detect",
      "harness_scaffold",
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

export async function handleProjectContext(args: ShapeArgs<typeof projectContextSchema>) {
  const packet = buildProjectContextPacket({
    mode: args.mode,
    run_id: args.run_id,
    max_trail: args.max_trail,
  });
  return textContent(JSON.stringify(packProjectContext(packet, args.max_tokens)));
}

export async function handleHarnessDetect(args: ShapeArgs<typeof harnessDetectSchema>) {
  const detection = detectHarness({ cwd: safeBase });
  if (args.harness) {
    return textContent(
      JSON.stringify({
        harness: args.harness,
        layout: HARNESS_LAYOUTS[args.harness],
        detection,
      })
    );
  }
  return textContent(
    JSON.stringify({
      ...detection,
      layouts: layoutTable(),
      hint:
        detection.detected.length === 0
          ? "No harness detected. Pass harnesses explicitly to harness_scaffold, or set PNCORE_HARNESS (cursor | claude_code | codex | pi) in the MCP server env."
          : `Scaffold with harness_scaffold({ harnesses: ${JSON.stringify(detection.detected)}, project: {...} }). Files land only in the folders each selected harness reads.`,
    })
  );
}

export async function handleHarnessScaffold(args: ShapeArgs<typeof harnessScaffoldSchema>) {
  const detection = detectHarness({ cwd: safeBase });
  const harnesses =
    args.harnesses && args.harnesses.length > 0 ? args.harnesses : detection.detected;
  if (harnesses.length === 0) {
    return mcpError(
      "INVALID_STATE",
      "No harness selected and none detected. Pass harnesses: [cursor | claude_code | codex | pi].",
      { detection }
    );
  }
  const include = args.include as ScaffoldInclude[] | undefined;
  const plan = buildScaffoldPlan({
    harnesses,
    project: args.project,
    include,
    noTrailersRule: getRule("pn-no-cursor-commit-trailers"),
  });
  let files: AppliedFile[];
  try {
    files = applyScaffoldPlan({
      root: safeBase,
      plan,
      overwrite: args.overwrite === true,
      dryRun: args.dryRun === true,
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("escapes workspace")) return mcpError("PATH_TRAVERSAL", msg, {});
    return mcpError("IO_ERROR", msg, {});
  }
  const topFolder = (h: (typeof HARNESS_IDS)[number]) => HARNESS_LAYOUTS[h].skillsDir.split("/")[0];
  const usedFolders = new Set(harnesses.map(topFolder));
  const untouched = HARNESS_IDS.filter(
    (h) => !harnesses.includes(h) && !usedFolders.has(topFolder(h))
  );
  // Instructions-file byte budget (ADR-0019): measured for harnesses that truncate the chain.
  const instructionsBudget: InstructionsBudget[] = [];
  for (const h of harnesses) {
    const layout = HARNESS_LAYOUTS[h];
    if (layout.instructionsCapBytes == null) continue;
    const rel = layout.instructionsFile;
    if (instructionsBudget.some((b) => b.path === rel)) continue;
    const abs = join(safeBase, rel);
    const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
    const planned = plan.find((f) => f.path === rel && f.strategy === "managed_block");
    const text =
      args.dryRun === true && planned
        ? upsertManagedBlock(existing, planned.content).text
        : existing;
    instructionsBudget.push(instructionsBudgetFor(rel, text, agentsMdCapBytes()));
  }
  return textContent(
    JSON.stringify({
      harnesses,
      detection: { detected: detection.detected, explicit: detection.explicit },
      dryRun: args.dryRun === true,
      files,
      ...(args.dryRun === true
        ? { contents: Object.fromEntries(plan.map((f) => [f.path, f.content])) }
        : {}),
      ...(instructionsBudget.length > 0 ? { instructionsBudget } : {}),
      untouchedHarnessFolders: [...new Set(untouched.map(topFolder))],
      next: "Fill in any '(fill in)' placeholders from the codebase analysis. Re-run with overwrite: true to regenerate; managed AGENTS.md blocks are replaced in place.",
    })
  );
}

export async function handleListWorkflowTypes() {
  const table = Object.fromEntries(
    PUBLIC_WORKFLOW_TYPES.map((k) => [k, { steps: workflowSteps[k].length }])
  );
  return textContent(JSON.stringify(table));
}

export async function handleSuggestModelTier(args: ShapeArgs<typeof suggestModelTierSchema>) {
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
  const table: Array<{ step: number; tier: string; exemplar: string; rationale: string }> = [];
  for (let i = 0; i < stepCount; i++) {
    const s = resolveStepTier(workflowType, i);
    if (s) table.push({ step: i, ...s });
  }
  return textContent(JSON.stringify({ workflowType, stepCount, steps: table }));
}

export async function handleListSkills(args: ShapeArgs<typeof listSkillsSchema>) {
  const { category, filter, limit } = args;
  const hasFilter = (category != null && category !== "") || (filter != null && filter !== "");
  const skills = listSkills({
    category: category ?? undefined,
    filter: filter ?? undefined,
  });

  if (!hasFilter && limit === undefined) {
    const byCategory: Record<string, { count: number; skills: string[] }> = {};
    for (const s of skills) {
      const cat = s.category;
      if (!byCategory[cat]) byCategory[cat] = { count: 0, skills: [] };
      byCategory[cat].count += 1;
      if (byCategory[cat].skills.length < 3) byCategory[cat].skills.push(s.id);
    }
    return textContent(
      JSON.stringify({
        total: skills.length,
        categories: byCategory,
        hint: "Use category or filter param to list skills in a specific category.",
      })
    );
  }

  const cap = limit === 0 ? skills.length : (limit ?? skills.length);
  return textContent(JSON.stringify(skills.slice(0, cap)));
}

export async function handleGetSkill(args: ShapeArgs<typeof getSkillSchema>) {
  const { id, run_id } = args;
  let content = getSkill(id);
  if (content == null) return mcpError("NOT_FOUND", `Skill not found: ${id}`, { id });
  const max = getContentMaxChars();
  if (max < Number.MAX_SAFE_INTEGER) {
    content = truncateResourceBody(content, "get_skill", id, max);
  }
  appendSkillLoadLog("get_skill", id, run_id);
  return textContent(content);
}

export async function handleListAgents(args: ShapeArgs<typeof listAgentsSchema>) {
  const mode = args.include ?? "external";
  if (mode === "external") return textContent(JSON.stringify(listAgents()));
  if (mode === "internal") return textContent(JSON.stringify(listInternalAgents()));
  const ext = listAgents();
  const int_ = listInternalAgents();
  return textContent(JSON.stringify([...ext, ...int_]));
}

export async function handleGetAgent(args: ShapeArgs<typeof getAgentSchema>) {
  const { id, run_id } = args;
  let content = getAgent(id);
  if (content == null) return mcpError("NOT_FOUND", `Agent not found: ${id}`, { id });
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

export async function handleGetCommand(args: ShapeArgs<typeof getCommandSchema>) {
  const { id, run_id } = args;
  let content = getCommand(id);
  if (content == null) return mcpError("NOT_FOUND", `Command not found: ${id}`, { id });
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

export async function handleGetRule(args: ShapeArgs<typeof getRuleSchema>) {
  const { id, run_id } = args;
  let content = getRule(id);
  if (content == null) return mcpError("NOT_FOUND", `Rule not found: ${id}`, { id });
  const max = getContentMaxChars();
  if (max < Number.MAX_SAFE_INTEGER) {
    content = truncateResourceBody(content, "get_rule", id, max);
  }
  appendSkillLoadLog("get_rule", id, run_id);
  return textContent(content);
}

export async function handleWorkflowStep(args: ShapeArgs<typeof workflowStepSchema>) {
  const { workflowType, step, state } = args;
  const st = (state ?? {}) as Record<string, unknown>;
  const runId = resolveWorkflowRunId(st);
  const engineStart = performance.now();
  const result = getWorkflowStep(workflowType, step, st);
  if ("error" in result) return mcpError("INVALID_STATE", result.error, { workflowType, step });

  if (
    result.gate === "human" &&
    workflowRequiresHumanGateApproval(requiredHumanGateWorkflows, workflowType)
  ) {
    const ticketsSafe = resolveSafePath(defaultHumanGateTicketsPath);
    if ("error" in ticketsSafe) {
      return mcpError("PATH_TRAVERSAL", ticketsSafe.error, { path: defaultHumanGateTicketsPath });
    }
    const ticketsPath = ticketsSafe.resolved;
    const dir = dirname(ticketsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ticket =
      typeof st.pncoreHumanGateTicket === "string" ? st.pncoreHumanGateTicket : undefined;
    const consume = validateAndConsumeHumanGateTicket(
      ticketsPath,
      workflowType,
      step,
      ticket,
      runId
    );
    if (!consume.ok) {
      return mcpError(consume.code, consume.reason, {
        workflowType,
        step,
        hint: "Call approval_checkpoint with approval_token, action_label, workflow_type, and workflow_step matching this call; pass pncoreHumanGateTicket in state on the next workflow_step.",
      });
    }
  }

  const engineMs = roundMs(performance.now() - engineStart);
  const logPath = process.env.PNCORE_RUN_LOG ?? ".pncore/workflow-runs.jsonl";
  const span = beginStepSpan(runId, { logPath: logPath || undefined });
  if (logPath) {
    try {
      const safe = resolveSafePath(logPath);
      if (!("error" in safe)) {
        const dir = dirname(safe.resolved);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const entry = {
          ts: new Date().toISOString(),
          runId,
          workflowType,
          step,
          nextStep: result.nextStep,
          gate: result.gate,
          done: result.done ?? false,
          stepIndex: span.stepIndex,
          sinceLastStepMs: span.sinceLastStepMs,
          engineMs,
          ...(result.workflowPhase ? { workflowPhase: result.workflowPhase } : {}),
          ...(result.parallel ? { parallel: true } : {}),
          ...(result.tasks && result.tasks.length > 0
            ? { taskIds: result.tasks.map((t) => t.id) }
            : {}),
          stateKeys: Object.keys(st).filter((k) => st[k] != null),
          // Opt-in: state values make the entry replayable (ADR-0017 trajectory fixtures).
          ...(runLogStateEnabled() ? { state: snapshotStateForLog(st) } : {}),
        };
        appendFileSync(safe.resolved, JSON.stringify(entry) + "\n", "utf-8");
      }
    } catch (err) {
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

export async function handleReportUsage(args: ShapeArgs<typeof reportUsageSchema>) {
  const {
    workflowType,
    step,
    inputTokens,
    outputTokens,
    costUsd,
    latencyMs,
    run_id,
    path: filePath,
  } = args;
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
    if ("error" in safe) return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath });
    try {
      const resolved = safe.resolved;
      const dir = dirname(resolved);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
      return textContent(JSON.stringify({ ok: true, path: resolved, entry }));
    } catch (err) {
      return mcpError("IO_ERROR", String(err), { entry });
    }
  }
  return textContent(JSON.stringify({ summary: entry }));
}

export async function handleWorkflowUsageTotals(args: ShapeArgs<typeof workflowUsageTotalsSchema>) {
  const { run_id, path: filePath } = args;
  const rel = filePath ?? defaultUsagePath;
  const safe = resolveSafePath(rel);
  if ("error" in safe) return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
  const resolved = safe.resolved;
  if (!existsSync(resolved)) {
    return textContent(
      JSON.stringify({
        run_id,
        path: resolved,
        linesMatched: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: null as number | null,
        warn: false,
      })
    );
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
      if (!t) continue;
      try {
        const o = JSON.parse(t) as Record<string, unknown>;
        if (o.run_id !== run_id) continue;
        linesMatched += 1;
        const it = o.inputTokens;
        const ot = o.outputTokens;
        if (typeof it === "number" && Number.isFinite(it)) inputTokens += it;
        if (typeof ot === "number" && Number.isFinite(ot)) outputTokens += ot;
        const c = o.costUsd;
        if (typeof c === "number" && Number.isFinite(c)) {
          costUsd += c;
          hasCost = true;
        }
      } catch {
        /* skip line */
      }
    }
    const warnThreshold = parseInt(process.env.PNCORE_USAGE_WARN_INPUT_TOKENS ?? "", 10);
    const warn =
      Number.isFinite(warnThreshold) && warnThreshold > 0 && inputTokens >= warnThreshold;
    return textContent(
      JSON.stringify({
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
      })
    );
  } catch (err) {
    return mcpError("IO_ERROR", String(err), { path: resolved });
  }
}

export async function handleWorkflowHandoffAppend(
  args: ShapeArgs<typeof workflowHandoffAppendSchema>
) {
  const { run_id, step, summary, path: filePath } = args;
  const rel = filePath ?? defaultHandoffPath;
  const safe = resolveSafePath(rel);
  if ("error" in safe) return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
  try {
    const resolved = safe.resolved;
    const dir = dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      run_id,
      step,
      summary: summary.slice(0, HANDOFF_SUMMARY_MAX),
    };
    appendFileSync(resolved, JSON.stringify(entry) + "\n", "utf-8");
    return textContent(JSON.stringify({ ok: true, path: resolved }));
  } catch (err) {
    return mcpError("IO_ERROR", String(err), { run_id, step });
  }
}

export async function handleWorkflowHandoffRead(args: ShapeArgs<typeof workflowHandoffReadSchema>) {
  const { run_id, path: filePath, max_lines } = args;
  const rel = filePath ?? defaultHandoffPath;
  const safe = resolveSafePath(rel);
  if ("error" in safe) return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
  const resolved = safe.resolved;
  if (!existsSync(resolved))
    return textContent(JSON.stringify({ run_id, path: resolved, lines: [] }));
  const cap = max_lines ?? HANDOFF_READ_MAX_LINES;
  try {
    const raw = readFileTail(resolved, handoffScanMaxBytes);
    const matched: { ts: string; step: number; summary: string }[] = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const o = JSON.parse(t) as Record<string, unknown>;
        if (o.run_id !== run_id) continue;
        const ts = typeof o.ts === "string" ? o.ts : "";
        const step = typeof o.step === "number" ? o.step : -1;
        const summary = typeof o.summary === "string" ? o.summary : "";
        matched.push({ ts, step, summary });
      } catch {
        /* skip */
      }
    }
    const tail = matched.slice(-cap);
    return textContent(JSON.stringify({ run_id, path: resolved, lines: tail }));
  } catch (err) {
    return mcpError("IO_ERROR", String(err), { path: resolved });
  }
}

export async function handleWorkflowConfirm(args: ShapeArgs<typeof workflowConfirmSchema>) {
  const { question, options, context, gate_type, verdict, must_fix_summary, path: filePath } = args;
  const gateInput = {
    question,
    options,
    context,
    gate_type: gate_type as WorkflowGateType | undefined,
    verdict: verdict as WorkflowGateVerdict | undefined,
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
  return textContent(
    JSON.stringify({
      instruction:
        "Output the following to the user. STOP. Do not proceed to the next step until the user replies. Parse their reply (match to an option or treat as free-form), then continue. When advancing workflow_step with skepticPassed, prefer { verdict, go_no_go, gate_id, confirmed_at } using this gate_id after the user confirms.",
      prompt: prompt.join("\n"),
      options,
      gate_id: logEntry.gate_id,
      gate_log_path: logResult.path,
      gate_type: logEntry.gate_type,
      ...(verdict != null ? { verdict } : {}),
    })
  );
}

export async function handleApprovalCheckpoint(args: ShapeArgs<typeof approvalCheckpointSchema>) {
  const { approval_token, action_label, workflow_type, workflow_step, run_id } = args;
  const hasWf = workflow_type !== undefined;
  const hasStep = workflow_step !== undefined;
  if (hasWf !== hasStep) {
    return mcpError(
      "INVALID_STATE",
      "workflow_type and workflow_step must both be provided or both omitted.",
      { workflow_type, workflow_step }
    );
  }

  const result = evaluateApprovalCheckpoint(approval_token, action_label);
  if (!result.success) {
    const d = result.data;
    return mcpError(d.code, d.error, { action_label: d.action_label });
  }

  if (hasWf && workflow_type !== undefined && workflow_step !== undefined) {
    if (run_id === undefined || run_id.trim() === "") {
      return mcpError(
        "INVALID_STATE",
        "run_id is required when issuing a human-gate ticket (workflow_type + workflow_step).",
        { workflow_type, workflow_step }
      );
    }
    const ticketsSafe = resolveSafePath(defaultHumanGateTicketsPath);
    if ("error" in ticketsSafe) {
      return mcpError("PATH_TRAVERSAL", ticketsSafe.error, { path: defaultHumanGateTicketsPath });
    }
    const ticketsPath = ticketsSafe.resolved;
    const dir = dirname(ticketsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const pncoreHumanGateTicket = issueHumanGateTicket(
      ticketsPath,
      workflow_type,
      workflow_step,
      run_id.trim()
    );
    return textContent(
      JSON.stringify({
        ...result.data,
        pncoreHumanGateTicket,
        workflow_type,
        workflow_step,
        note: `${result.data.note} Pass pncoreHumanGateTicket in workflow_step state for this human gate.`,
      })
    );
  }

  return textContent(JSON.stringify(result.data));
}

export async function handleGateLogAppend(args: ShapeArgs<typeof gateLogAppendSchema>) {
  const { gate_type, workflowType, step, outcome, action_label, run_id, path: filePath } = args;
  const rel = filePath ?? ".pncore/gate-log.jsonl";
  const safe = resolveSafePath(rel);
  if ("error" in safe) return mcpError("PATH_TRAVERSAL", safe.error, { path: rel });
  try {
    const resolved = safe.resolved;
    const dir = dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
  } catch (err) {
    return mcpError("IO_ERROR", String(err), { gate_type, workflowType, step });
  }
}

export async function handleWorkflowStateSave(args: ShapeArgs<typeof workflowStateSaveSchema>) {
  const { state, path: filePath } = args;
  const safe = resolveSafePath(filePath ?? defaultStatePath);
  if ("error" in safe)
    return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath ?? defaultStatePath });
  try {
    const path = safe.resolved;
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(state), "utf-8");
    return textContent(JSON.stringify({ ok: true, path }));
  } catch (err) {
    return mcpError("IO_ERROR", String(err), { path: safe.resolved });
  }
}

export async function handleWorkflowStateLoad(args: ShapeArgs<typeof workflowStateLoadSchema>) {
  const { path: filePath } = args;
  const safe = resolveSafePath(filePath ?? defaultStatePath);
  if ("error" in safe)
    return mcpError("PATH_TRAVERSAL", safe.error, { path: filePath ?? defaultStatePath });
  const path = safe.resolved;
  try {
    if (!existsSync(path)) return mcpError("FILE_NOT_FOUND", "File not found", { path });
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return mcpError("PARSE_ERROR", "State file is not a JSON object", { path });
    }
    const state = parsed as Record<string, unknown>;
    return textContent(JSON.stringify({ state }));
  } catch (err) {
    if (err instanceof SyntaxError) {
      return mcpError("PARSE_ERROR", "Invalid JSON in state file", { path });
    }
    return mcpError("IO_ERROR", String(err), { path });
  }
}

export async function handlePaperclipIssueCheckout(
  args: ShapeArgs<typeof paperclipIssueCheckoutSchema>
) {
  const cfg = loadPaperclipConfig();
  if (!cfg) return paperclipNotConfigured();
  const id = resolvePaperclipIssueId(args.issueId);
  if (!id) return paperclipMissingIssueId();
  const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}/checkout`;
  try {
    const res = await fetch(url, { method: "POST", headers: cfg.headers, body: "{}" });
    return paperclipResultToContent(await parsePaperclipResponse(res), id);
  } catch (err) {
    return mcpError("IO_ERROR", String(err), {
      issueId: id,
      hint: "Check PAPERCLIP_API_URL reachability",
    });
  }
}

export async function handlePaperclipIssueComment(
  args: ShapeArgs<typeof paperclipIssueCommentSchema>
) {
  const cfg = loadPaperclipConfig();
  if (!cfg) return paperclipNotConfigured();
  const id = resolvePaperclipIssueId(args.issueId);
  if (!id) return paperclipMissingIssueId();
  const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}/comments`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({ body: args.body }),
    });
    return paperclipResultToContent(await parsePaperclipResponse(res), id);
  } catch (err) {
    return mcpError("IO_ERROR", String(err), {
      issueId: id,
      hint: "Check PAPERCLIP_API_URL reachability",
    });
  }
}

export async function handlePaperclipIssueUpdate(
  args: ShapeArgs<typeof paperclipIssueUpdateSchema>
) {
  const cfg = loadPaperclipConfig();
  if (!cfg) return paperclipNotConfigured();
  const id = resolvePaperclipIssueId(args.issueId);
  if (!id) return paperclipMissingIssueId();

  const url = `${cfg.apiUrl}/api/issues/${encodeURIComponent(id)}`;
  const body: { status: string; comment?: string } = { status: args.status };
  if (args.comment) body.comment = args.comment;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: cfg.headers,
      body: JSON.stringify(body),
    });
    return paperclipResultToContent(await parsePaperclipResponse(res), id);
  } catch (err) {
    return mcpError("IO_ERROR", String(err), {
      issueId: id,
      hint: "Check PAPERCLIP_API_URL reachability",
    });
  }
}

export async function handleWorkflowVerify(args: ShapeArgs<typeof workflowVerifySchema>) {
  if (!disposeVerifyEnabled()) {
    return mcpError(
      "DISPOSE_UNAVAILABLE",
      "workflow_verify is off. Set PNCORE_DISPOSE_VERIFY=1 or PNCORE_FEATURES.disposeVerify true.",
      {}
    );
  }
  const hasCmd = typeof args.commandId === "string" && args.commandId.trim() !== "";
  const hasArgv = Array.isArray(args.argv) && args.argv.length > 0;
  if (hasCmd === hasArgv) {
    return mcpError("INVALID_STATE", "Pass exactly one of commandId or argv", {});
  }
  const cwdRel = args.cwd && args.cwd.trim() !== "" ? args.cwd : ".";
  const cwdSafe = resolveSafePath(cwdRel);
  if ("error" in cwdSafe) return mcpError("PATH_TRAVERSAL", cwdSafe.error, { path: cwdRel });

  let argv: string[];
  if (hasCmd) {
    const resolved = resolveCatalogArgv(args.commandId!, cwdSafe.resolved);
    if ("error" in resolved) return mcpError("INVALID_STATE", resolved.error, {});
    argv = resolved.argv;
  } else {
    if (!disposeVerifyAllowArgvEnabled()) {
      return mcpError(
        "INVALID_ARGV",
        "Free-form argv requires disposeVerifyAllowArgv (PNCORE_DISPOSE_VERIFY_ALLOW_ARGV=1)",
        {}
      );
    }
    try {
      assertSafeArgv(args.argv!, { freeform: true });
    } catch (err) {
      if (err instanceof VerifyPolicyError) return mcpError(err.code, err.message, {});
      throw err;
    }
    argv = args.argv!;
  }

  const backend = resolveSandboxBackend();
  if (backend === "unavailable") {
    return mcpError(
      "DISPOSE_UNAVAILABLE",
      "Dispose-verify jail is unavailable. Install bwrap, set PNCORE_VERIFY_SANDBOX=restricted, or run under Vitest (test backend).",
      {}
    );
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
  } catch (err) {
    if (err instanceof VerifyPolicyError) return mcpError(err.code, err.message, {});
    return mcpError("IO_ERROR", String(err), {});
  }
  const finishedAt = new Date().toISOString();
  const report: GateReport = {
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
  if ("error" in written) return mcpError("PATH_TRAVERSAL", written.error, {});
  return textContent(JSON.stringify({ ok: true, ...report }));
}

/** kinds served from the non-events trails; verify + acceptance stay in run-events.jsonl. */
const TRAIL_KIND: Record<"step" | "load" | "usage" | "handoff" | "gate", TrailId> = {
  step: "steps",
  load: "loads",
  usage: "usage",
  handoff: "handoff",
  gate: "gate",
};

export async function handleWorkflowRunQuery(args: ShapeArgs<typeof workflowRunQuerySchema>) {
  const kinds = args.kinds ?? ["verify", "acceptance"];
  const runId = args.run_id;
  const paths = trailPaths();
  // Server-written events are read in full once: the timeline needs verify/acceptance even
  // when the caller only asked for other kinds.
  const result = readRunEvents(runId, {
    path: args.path,
    kinds: ["verify", "acceptance"],
    limit: 200,
  });
  if ("error" in result) return mcpError("PATH_TRAVERSAL", result.error, { path: args.path });

  const trailRecords: Partial<Record<TrailId, Record<string, unknown>[]>> = {};
  const readTrailOrFail = (trail: TrailId) => {
    if (trailRecords[trail]) return trailRecords[trail];
    const r = readTrail(paths[trail], runId);
    if ("error" in r) throw new Error(r.error);
    trailRecords[trail] = r.records;
    return r.records;
  };

  let merged: Record<string, unknown>[] = result.events.filter((e) => kinds.includes(e.kind));
  let timeline: ReturnType<typeof buildRunTimeline> | undefined;
  try {
    for (const k of kinds) {
      if (k === "verify" || k === "acceptance") continue;
      const trail = TRAIL_KIND[k];
      for (const rec of readTrailOrFail(trail)) {
        // Step entries can carry a state snapshot; the query returns keys only.
        const {
          state: _state,
          runId: _runId,
          ...rest
        } = rec as Record<string, unknown> & {
          state?: unknown;
          runId?: unknown;
        };
        void _state;
        void _runId;
        merged.push({ kind: k, run_id: runId, ...rest });
      }
    }
    if (args.timeline) {
      const stepRecords = readTrailOrFail("steps");
      const { entries } = parseRunLog(stepRecords.map((r) => JSON.stringify(r)).join("\n"));
      timeline = buildRunTimeline(runId, {
        steps: entries,
        loads: readTrailOrFail("loads") as never,
        usage: readTrailOrFail("usage") as never,
        handoff: readTrailOrFail("handoff") as never,
        gate: readTrailOrFail("gate") as never,
        events: result.events as never,
      });
    }
  } catch (err) {
    return mcpError("PATH_TRAVERSAL", err instanceof Error ? err.message : String(err), {
      run_id: runId,
    });
  }

  merged.sort((a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")));
  const cap = args.limit && args.limit > 0 ? Math.min(args.limit, 200) : 80;
  merged = merged.slice(-cap);
  const verify = result.events.filter((e) => e.kind === "verify");
  const acceptance = result.events.filter((e) => e.kind === "acceptance").slice(-1)[0];
  return textContent(
    JSON.stringify({
      run_id: runId,
      path: result.path,
      paths: { ...paths, events: result.path },
      events: merged,
      verify,
      acceptance: acceptance ?? null,
      ...(timeline ? { timeline } : {}),
    })
  );
}
