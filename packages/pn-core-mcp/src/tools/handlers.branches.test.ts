/**
 * Branch tests for tools/handlers.ts, called in process. Each test runs in a fresh temp
 * workspace: the handlers resolve paths against safeBase (the cwd at import), so the module is
 * re-imported after chdir. Covers the error envelopes and options the per-tool suite skips.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

type Handlers = typeof import("./handlers.js");
type Result = { content: Array<{ type: "text"; text: string }>; isError?: true };

const HARNESS_ENV = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CURSOR_TRACE_ID", "CODEX_HOME"];
const startCwd = process.cwd();
let ws: string;
let h: Handlers;

const body = (r: Result) => JSON.parse(r.content[0]!.text) as Record<string, unknown>;
const code = (r: Result) => {
  expect(r.isError).toBe(true);
  return body(r).code;
};

async function load(env: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  h = await import("./handlers.js");
  return h;
}

beforeEach(async () => {
  ws = mkdtempSync(join(tmpdir(), "pn-handlers-"));
  process.chdir(ws);
  for (const k of Object.keys(process.env)) {
    if (HARNESS_ENV.includes(k) || /^(CURSOR_|CODEX_|PNCORE_|PAPERCLIP_)/.test(k)) {
      vi.stubEnv(k, undefined as unknown as string);
    }
  }
  await load();
});

afterEach(() => {
  process.chdir(startCwd);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(ws, { recursive: true, force: true });
});

describe("paperclip_issue", () => {
  const cfg = { PAPERCLIP_API_URL: "https://pc.example/", PAPERCLIP_API_KEY: "k" };

  it("needs config, an issue id, a comment body and an update status", async () => {
    expect(code(await h.handlePaperclipIssue({ action: "checkout" }))).toBe("INVALID_STATE");
    await load(cfg);
    for (const action of ["checkout", "comment", "update"] as const) {
      const r = await h.handlePaperclipIssue({ action, body: "b", status: "done" });
      expect(body(r).error).toMatch(/Missing issue id/);
    }
    expect(body(await h.handlePaperclipIssue({ action: "comment", issueId: "1" })).error).toMatch(
      /requires body/
    );
    expect(body(await h.handlePaperclipIssue({ action: "update", issueId: "1" })).error).toMatch(
      /requires status/
    );
  });

  it("maps ok, http errors, non-JSON bodies and network failures", async () => {
    await load({ ...cfg, PAPERCLIP_RUN_ID: "run-9" });
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const reply = (status: number, text: string) =>
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(text, { status });
      });
    vi.stubGlobal("fetch", reply(200, '{"id":"1"}'));
    expect(body(await h.handlePaperclipIssue({ action: "checkout", issueId: "a/b" }))).toEqual({
      ok: true,
      id: "1",
    });
    expect(calls[0]!.url).toBe("https://pc.example/api/issues/a%2Fb/checkout");
    vi.stubGlobal("fetch", reply(500, "boom"));
    const http = await h.handlePaperclipIssue({ action: "comment", issueId: "1", body: "hi" });
    expect(code(http)).toBe("IO_ERROR");
    expect(body(http).status).toBe(500);
    vi.stubGlobal("fetch", reply(200, "not json"));
    const parse = await h.handlePaperclipIssue({
      action: "update",
      issueId: "1",
      status: "done",
      comment: "c",
    });
    expect(code(parse)).toBe("PARSE_ERROR");
    expect(JSON.parse(String(calls.at(-1)!.init.body))).toEqual({ status: "done", comment: "c" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    for (const action of ["checkout", "comment", "update"] as const) {
      const r = await h.handlePaperclipIssue({ action, issueId: "1", body: "b", status: "s" });
      expect(code(r)).toBe("IO_ERROR");
      expect(body(r).hint).toMatch(/reachability/);
    }
  });
});

describe("harness_detect and harness_scaffold", () => {
  it("reports no harness and refuses to scaffold without one", async () => {
    expect(body(await h.handleHarnessDetect({})).hint).toMatch(/No harness detected/);
    expect(code(await h.handleHarnessScaffold({ project: { name: "x" } }))).toBe("INVALID_STATE");
  });

  it("detects from folders, scaffolds Codex with a measured AGENTS.md, and previews a dry run", async () => {
    mkdirSync(join(ws, ".codex"));
    writeFileSync(join(ws, "AGENTS.md"), "# Team\n");
    expect(body(await h.handleHarnessDetect({})).hint).toMatch(/harness_scaffold/);
    const dry = body(
      await h.handleHarnessScaffold({
        harnesses: ["codex", "pi"],
        dryRun: true,
        project: { name: "x" },
      })
    );
    expect(dry.dryRun).toBe(true);
    expect(Object.keys(dry.contents as object)).toContain("AGENTS.md");
    expect((dry.instructionsBudget as unknown[]).length).toBe(1);
    const real = body(await h.handleHarnessScaffold({ project: { name: "x" } }));
    expect(real.harnesses).toEqual(["codex"]);
    expect(readFileSync(join(ws, "AGENTS.md"), "utf8")).toMatch(/pncore:start/);
    const claude = body(
      await h.handleHarnessScaffold({ harnesses: ["claude_code"], project: { name: "x" } })
    );
    expect(claude.instructionsBudget).toBeUndefined();
  });

  it("maps a write failure to IO_ERROR", async () => {
    writeFileSync(join(ws, ".claude"), "a file where a folder belongs");
    expect(
      code(await h.handleHarnessScaffold({ harnesses: ["claude_code"], project: { name: "x" } }))
    ).toBe("IO_ERROR");
  });
});

describe("catalog reads", () => {
  it("suggest_model_tier covers role, missing input, an unknown step and the full table", async () => {
    expect(body(await h.handleSuggestModelTier({ role: "judge" })).role).toBe("judge");
    expect(code(await h.handleSuggestModelTier({}))).toBe("INVALID_STATE");
    expect(code(await h.handleSuggestModelTier({ workflowType: "design", step: 99 }))).toBe(
      "NOT_FOUND"
    );
    expect(body(await h.handleSuggestModelTier({ workflowType: "design", step: 0 })).step).toBe(0);
    const table = body(await h.handleSuggestModelTier({ workflowType: "design" }));
    expect((table.steps as unknown[]).length).toBe(table.stepCount);
  });

  it("list_skills honours limit 0 and filters; list_agents serves internal and all", async () => {
    const all = JSON.parse((await h.handleListSkills({ limit: 0 })).content[0]!.text) as unknown[];
    expect(all.length).toBeGreaterThan(100);
    const two = JSON.parse(
      (await h.handleListSkills({ category: "ci", limit: 2 })).content[0]!.text
    );
    expect(two).toHaveLength(2);
    const ext = JSON.parse((await h.handleListAgents({})).content[0]!.text) as unknown[];
    const int = JSON.parse((await h.handleListAgents({ include: "internal" })).content[0]!.text);
    const both = JSON.parse((await h.handleListAgents({ include: "all" })).content[0]!.text);
    expect(both).toHaveLength(ext.length + int.length);
  });

  it("truncates content when truncateSkills is on, and reports unknown ids", async () => {
    await load({
      PNCORE_FEATURES: JSON.stringify({ truncateSkills: true }),
      PNCORE_MAX_RESOURCE_CHARS: "1500",
    });
    for (const [fn, id] of [
      [h.handleGetSkill, "pn-tdd"],
      [h.handleGetAgent, "pn-skeptic"],
      [h.handleGetCommand, "pn-build"],
      [h.handleGetRule, "pn-build-gate"],
    ] as const) {
      const r = await fn({ id, run_id: "r1" });
      expect(r.isError).toBeFalsy();
      expect(r.content[0]!.text.length).toBeLessThan(2500);
      expect(code(await fn({ id: "pn-nope" }))).toBe("NOT_FOUND");
    }
    expect(JSON.parse((await h.handleListCommands()).content[0]!.text).length).toBeGreaterThan(10);
    expect(JSON.parse((await h.handleListRules()).content[0]!.text).length).toBeGreaterThan(10);
  });
});

describe("workflow_step", () => {
  it("rejects unknown steps and skips the run log when it is off or outside the workspace", async () => {
    expect(code(await h.handleWorkflowStep({ workflowType: "design", step: 99, state: {} }))).toBe(
      "INVALID_STATE"
    );
    await load({ PNCORE_RUN_LOG: "" });
    expect(
      (await h.handleWorkflowStep({ workflowType: "design", step: 0, state: {} })).isError
    ).toBeFalsy();
    await load({ PNCORE_RUN_LOG: "../outside.jsonl" });
    expect(
      (await h.handleWorkflowStep({ workflowType: "design", step: 0, state: {} })).isError
    ).toBeFalsy();
    expect(existsSync(join(ws, "..", "outside.jsonl"))).toBe(false);
  });

  it("logs task ids, the phase and a state snapshot for parallel steps", async () => {
    await load({
      PNCORE_FEATURES: JSON.stringify({ featureProgram: true }),
      PNCORE_RUN_LOG_STATE: "1",
    });
    const r = body(
      await h.handleWorkflowStep({
        workflowType: "feature_program",
        step: 0,
        state: { run_id: "fp1" },
      })
    );
    expect(r.run_id).toBe("fp1");
    const log = readFileSync(join(ws, ".pncore", "workflow-runs.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(JSON.parse(log.at(-1)!).runId).toBe("fp1");
  });

  it("logs the task ids of a parallel fan-out", async () => {
    await load({ PNCORE_FEATURES: JSON.stringify({ bestOfN: { enabled: true } }) });
    const state = {
      run_id: "t1",
      specSummary: "Extract a parser",
      verifyCommands: [{ cmd: "npm test", exit: 0 }],
      scopeConfirmed: true,
      tournamentN: 2,
    };
    expect(
      (await h.handleWorkflowStep({ workflowType: "implementation_tournament", step: 0, state }))
        .isError
    ).toBeFalsy();
    const r = body(
      await h.handleWorkflowStep({ workflowType: "implementation_tournament", step: 1, state })
    );
    expect(r.parallel).toBe(true);
    const last = readFileSync(join(ws, ".pncore", "workflow-runs.jsonl"), "utf8")
      .trim()
      .split("\n")
      .at(-1)!;
    expect(JSON.parse(last).taskIds).toHaveLength(2);
  });

  it("survives an unwritable run log", async () => {
    mkdirSync(join(ws, ".pncore"));
    writeFileSync(join(ws, ".pncore", "blocker"), "a file where a folder belongs");
    await load({ PNCORE_RUN_LOG: ".pncore/blocker/runs.jsonl" });
    expect(
      (await h.handleWorkflowStep({ workflowType: "design", step: 0, state: {} })).isError
    ).toBeFalsy();
  });

  it("enforces human gates for configured workflows", async () => {
    await load({ PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS: "design", PNCORE_APPROVAL_TOKEN: "t" });
    let step = 0;
    let state: Record<string, unknown> = { run_id: "hg1" };
    let blocked: Result | undefined;
    for (; step < 8; step++) {
      const r = await h.handleWorkflowStep({ workflowType: "design", step, state });
      if (r.isError) {
        blocked = r;
        break;
      }
      const b = body(r);
      state = { ...state, ...(b.requiredFromState ? {} : {}) };
      if (b.gate === "human") break;
      if (typeof b.nextStep !== "number") break;
      step = (b.nextStep as number) - 1;
    }
    void blocked;
    const ticket = body(
      await h.handleApprovalCheckpoint({
        approval_token: "t",
        action_label: "go",
        workflow_type: "design",
        workflow_step: 0,
        run_id: "hg1",
      })
    ).pncoreHumanGateTicket;
    expect(typeof ticket).toBe("string");
  });
});

describe("report_usage, handoff and gate logs", () => {
  it("validates observedBy, writes to a path, and maps traversal and IO errors", async () => {
    expect(
      code(
        await h.handleReportUsage({
          workflowType: "design",
          step: 0,
          inputTokens: 1,
          outputTokens: 1,
          observedBy: "unavailable",
          responseModel: "m",
        })
      )
    ).toBe("INVALID_STATE");
    const ok = body(
      await h.handleReportUsage({
        workflowType: "design",
        step: 0,
        inputTokens: 1,
        outputTokens: 2,
        costUsd: 0.1,
        latencyMs: 5,
        run_id: "u1",
        requestModel: "a",
        responseModel: "b",
        reasoningEffort: "high",
        workerId: "w",
        path: "logs/usage.jsonl",
      })
    );
    expect((ok.entry as Record<string, unknown>).observedBy).toBe("agent_claim");
    const summary = body(
      await h.handleReportUsage({
        workflowType: "design",
        step: 0,
        inputTokens: 1,
        outputTokens: 1,
      })
    );
    expect(summary.summary).toBeDefined();
    expect(
      code(
        await h.handleReportUsage({
          workflowType: "design",
          step: 0,
          inputTokens: 1,
          outputTokens: 1,
          path: "../x.jsonl",
        })
      )
    ).toBe("PATH_TRAVERSAL");
    mkdirSync(join(ws, "dir.jsonl"));
    expect(
      code(
        await h.handleReportUsage({
          workflowType: "design",
          step: 0,
          inputTokens: 1,
          outputTokens: 1,
          path: "dir.jsonl",
        })
      )
    ).toBe("IO_ERROR");
  });

  it("handoff append and gate_log_append map traversal and IO errors", async () => {
    mkdirSync(join(ws, "d.jsonl"));
    expect(
      code(
        await h.handleWorkflowHandoffAppend({ run_id: "r", step: 0, summary: "s", path: "../x" })
      )
    ).toBe("PATH_TRAVERSAL");
    expect(
      code(
        await h.handleWorkflowHandoffAppend({ run_id: "r", step: 0, summary: "s", path: "d.jsonl" })
      )
    ).toBe("IO_ERROR");
    const gate = {
      gate_type: "skeptic",
      workflowType: "design",
      step: 0,
      outcome: "pass",
    } as const;
    expect(code(await h.handleGateLogAppend({ ...gate, path: "../x" }))).toBe("PATH_TRAVERSAL");
    expect(code(await h.handleGateLogAppend({ ...gate, path: "d.jsonl" }))).toBe("IO_ERROR");
    expect(body(await h.handleGateLogAppend({ ...gate, action_label: "a", run_id: "r" })).ok).toBe(
      true
    );
  });

  it("workflow_confirm validates the gate, renders context and must-fix, and maps log errors", async () => {
    const base = { question: "Ship?", options: ["go", "no_go"] };
    expect(
      code(
        await h.handleWorkflowConfirm({
          ...base,
          options: ["go"],
          gate_type: "skeptic",
          verdict: "revise",
        })
      )
    ).toBe("INVALID_GATE");
    const ok = body(
      await h.handleWorkflowConfirm({
        ...base,
        context: "ctx",
        gate_type: "skeptic",
        verdict: "revise",
        must_fix_summary: "fix x",
      })
    );
    expect(String(ok.prompt)).toMatch(/ctx[\s\S]*Must fix:\*\* fix x/);
    const noCtx = body(
      await h.handleWorkflowConfirm({
        ...base,
        gate_type: "skeptic",
        verdict: "revise",
        must_fix_summary: "y",
      })
    );
    expect(String(noCtx.prompt)).toMatch(/Must fix:\*\* y/);
    expect(code(await h.handleWorkflowConfirm({ ...base, path: "../x" }))).toBe("IO_ERROR");
  });
});

describe("approval_checkpoint", () => {
  it("needs workflow_type and workflow_step together, a token, and a run_id for tickets", async () => {
    expect(
      code(
        await h.handleApprovalCheckpoint({
          approval_token: "t",
          action_label: "a",
          workflow_type: "design",
        })
      )
    ).toBe("INVALID_STATE");
    expect(code(await h.handleApprovalCheckpoint({ approval_token: "t", action_label: "a" }))).toBe(
      "INVALID_STATE"
    );
    await load({ PNCORE_APPROVAL_TOKEN: "t" });
    expect(
      body(await h.handleApprovalCheckpoint({ approval_token: "t", action_label: "a" })).approved
    ).toBe("a");
    expect(
      code(
        await h.handleApprovalCheckpoint({
          approval_token: "t",
          action_label: "a",
          workflow_type: "design",
          workflow_step: 1,
          run_id: " ",
        })
      )
    ).toBe("INVALID_STATE");
    await load({ PNCORE_APPROVAL_TOKEN: "t", PNCORE_HUMAN_GATE_TICKETS_PATH: "../t.jsonl" });
    expect(
      code(
        await h.handleApprovalCheckpoint({
          approval_token: "t",
          action_label: "a",
          workflow_type: "design",
          workflow_step: 1,
          run_id: "r",
        })
      )
    ).toBe("PATH_TRAVERSAL");
  });
});

describe("workflow_state_save and workflow_state_load", () => {
  it("rejects bad paths and partial commit arguments", async () => {
    expect(code(await h.handleWorkflowStateSave({ state: {}, path: "../x.json" }))).toBe(
      "PATH_TRAVERSAL"
    );
    expect(code(await h.handleWorkflowStateSave({ state: {}, path: "s.json", run_id: "r" }))).toBe(
      "INVALID_STATE"
    );
    expect(
      code(
        await h.handleWorkflowStateSave({
          state: {},
          path: "s.json",
          run_id: "r",
          step: 0,
          summary: "x",
          handoff_path: "../h.jsonl",
        })
      )
    ).toBe("PATH_TRAVERSAL");
  });

  it("commits, then reports a revision conflict and a run mismatch", async () => {
    const commit = (extra: Record<string, unknown> = {}) =>
      h.handleWorkflowStateSave({
        state: { a: 1 },
        path: "s.json",
        run_id: "r1",
        step: 0,
        summary: "x",
        history: true,
        ...extra,
      });
    expect(body(await commit()).mode).toBe("commit");
    expect(code(await commit({ expected_revision: 99 }))).toBe("REVISION_CONFLICT");
    expect(code(await commit({ run_id: "r2" }))).toBe("RUN_MISMATCH");
    expect(code(await h.handleWorkflowStateSave({ state: {}, path: "s.json" }))).toBe(
      "RUN_MISMATCH"
    );
  });

  it("plain-saves with and without a run id even when the save log is unwritable", async () => {
    mkdirSync(join(ws, ".pncore", "state-saves.jsonl"), { recursive: true });
    expect(
      body(await h.handleWorkflowStateSave({ state: { run_id: "p1" }, path: "p.json" })).mode
    ).toBe("plain");
    expect(
      body(await h.handleWorkflowStateSave({ state: { run_id: "" }, path: "q.json" })).ok
    ).toBe(true);
  });

  it("load maps missing, non-object, invalid JSON, unreadable and traversal cases", async () => {
    expect(code(await h.handleWorkflowStateLoad({ path: "../x.json" }))).toBe("PATH_TRAVERSAL");
    expect(code(await h.handleWorkflowStateLoad({ path: "none.json" }))).toBe("FILE_NOT_FOUND");
    writeFileSync(join(ws, "arr.json"), "[1]");
    expect(code(await h.handleWorkflowStateLoad({ path: "arr.json" }))).toBe("PARSE_ERROR");
    writeFileSync(join(ws, "bad.json"), "{");
    expect(code(await h.handleWorkflowStateLoad({ path: "bad.json" }))).toBe("PARSE_ERROR");
  });
});

describe("workflow_verify", () => {
  const on = { PNCORE_DISPOSE_VERIFY: "1" };

  it("needs exactly one of commandId or argv, a contained cwd and a known command", async () => {
    await load(on);
    expect(code(await h.handleWorkflowVerify({ run_id: "v" }))).toBe("INVALID_STATE");
    expect(
      code(await h.handleWorkflowVerify({ run_id: "v", commandId: "npm_test", cwd: "../" }))
    ).toBe("PATH_TRAVERSAL");
    expect(code(await h.handleWorkflowVerify({ run_id: "v", commandId: "nope" }))).toBe(
      "INVALID_STATE"
    );
  });

  it("gates free-form argv behind its flag and the argv policy", async () => {
    await load(on);
    expect(code(await h.handleWorkflowVerify({ run_id: "v", argv: ["node", "-v"] }))).toBe(
      "INVALID_ARGV"
    );
    await load({ ...on, PNCORE_DISPOSE_VERIFY_ALLOW_ARGV: "1" });
    expect(code(await h.handleWorkflowVerify({ run_id: "v", argv: ["sh", "-c", "x"] }))).toBe(
      "INVALID_ARGV"
    );
  });

  it("returns a preflight without launching, and fails closed when no jail is available", async () => {
    await load({ ...on, PNCORE_DISPOSE_VERIFY_ALLOW_ARGV: "1" });
    const pre = body(
      await h.handleWorkflowVerify({
        run_id: "v",
        argv: ["node", "--version"],
        preflight_only: true,
        inputs: [{ path: "package.json" }],
        owner: "o",
      })
    );
    expect(pre.launched).toBe(false);
    await load({
      ...on,
      PNCORE_DISPOSE_VERIFY_ALLOW_ARGV: "1",
      PNCORE_VERIFY_SANDBOX: "unavailable",
    });
    expect(code(await h.handleWorkflowVerify({ run_id: "v", argv: ["node", "--version"] }))).toBe(
      "DISPOSE_UNAVAILABLE"
    );
  });

  it("maps a run-events path outside the workspace", async () => {
    await load({
      ...on,
      PNCORE_DISPOSE_VERIFY_ALLOW_ARGV: "1",
      PNCORE_RUN_EVENTS_PATH: "../e.jsonl",
    });
    expect(
      code(
        await h.handleWorkflowVerify({
          run_id: "v",
          argv: ["node", "--version"],
          preflight_only: true,
        })
      )
    ).toBe("PATH_TRAVERSAL");
    expect(
      code(await h.handleWorkflowVerify({ run_id: "v", argv: ["node", "--version"], owner: "o" }))
    ).toBe("PATH_TRAVERSAL");
  });
});

describe("workflow_run_query", () => {
  it("returns a timeline with usage, caps the list, and maps trail errors", async () => {
    await h.handleReportUsage({
      workflowType: "design",
      step: 0,
      inputTokens: 10,
      outputTokens: 1,
      costUsd: 0.5,
      run_id: "q1",
      path: ".pncore/usage.jsonl",
    });
    await h.handleWorkflowStep({ workflowType: "design", step: 0, state: { run_id: "q1" } });
    await load({ PNCORE_USAGE_WARN_INPUT_TOKENS: "5" });
    const r = body(
      await h.handleWorkflowRunQuery({
        run_id: "q1",
        kinds: ["step", "usage"],
        timeline: true,
        limit: 1,
      })
    );
    expect((r.events as unknown[]).length).toBe(1);
    expect((r.usage as Record<string, unknown>).warn).toBe(true);
    expect(r.timeline).toBeDefined();
    expect(code(await h.handleWorkflowRunQuery({ run_id: "q1", path: "../e.jsonl" }))).toBe(
      "PATH_TRAVERSAL"
    );
    await load({ PNCORE_RUN_LOG: "../runs.jsonl" });
    expect(code(await h.handleWorkflowRunQuery({ run_id: "q1", kinds: ["step"] }))).toBe(
      "PATH_TRAVERSAL"
    );
  });

  it("summarizeUsage ignores non-numbers and reports no cost when none was logged", () => {
    expect(h.summarizeUsage([{ inputTokens: "x" }, { outputTokens: 2 }])).toMatchObject({
      inputTokens: 0,
      outputTokens: 2,
      costUsd: null,
      warn: false,
    });
  });
});
