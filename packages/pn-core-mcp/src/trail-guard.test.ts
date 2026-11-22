import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { engineTrails, reservedTrailError, type TrailKind } from "./trail-guard.js";

describe("reservedTrailError", () => {
  const base = "/ws";

  it("allows the writer's own trail and any non-trail path", () => {
    expect(reservedTrailError(".pncore/usage.jsonl", "usage", { base, env: {} })).toBeNull();
    expect(reservedTrailError("logs/mine.jsonl", "usage", { base, env: {} })).toBeNull();
  });

  it("refuses every other engine trail, honouring env overrides", () => {
    const env = { PNCORE_RUN_LOG: "runs/steps.jsonl", PNCORE_HUMAN_GATE_TICKETS_PATH: "t.jsonl" };
    const trails = engineTrails(env);
    expect(trails.steps).toBe("runs/steps.jsonl");
    expect(trails.tickets).toBe("t.jsonl");
    for (const [kind, rel] of Object.entries(trails) as Array<[TrailKind, string]>) {
      const own: TrailKind = kind === "usage" ? "handoff" : "usage";
      expect(reservedTrailError(rel, own, { base, env })).toMatch(new RegExp(`${kind} trail`));
    }
  });
});

describe("no pn-core tool writes another tool's trail (ADR-0029)", () => {
  const startCwd = process.cwd();
  let ws: string;

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), "pn-trails-"));
    process.chdir(ws);
    for (const k of Object.keys(process.env)) {
      if (/^PNCORE_/.test(k)) vi.stubEnv(k, undefined as unknown as string);
    }
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(startCwd);
    vi.unstubAllEnvs();
    rmSync(ws, { recursive: true, force: true });
  });

  /** Minimal valid arguments for every writer that takes a caller-chosen path. */
  const WRITERS: Record<string, (target: string) => Record<string, unknown>> = {
    report_usage: (path) => ({
      workflowType: "design",
      step: 0,
      inputTokens: 1,
      outputTokens: 1,
      path,
    }),
    workflow_handoff_append: (path) => ({ run_id: "r", step: 0, summary: "s", path }),
    workflow_confirm: (path) => ({ question: "q", options: ["go", "no_go"], path }),
    gate_log_append: (path) => ({
      gate_type: "skeptic",
      workflowType: "design",
      step: 0,
      outcome: "pass",
      path,
    }),
    workflow_state_save: (path) => ({
      state: {},
      path: "s.json",
      run_id: "r",
      step: 0,
      summary: "s",
      handoff_path: path,
    }),
  };
  const OWN: Record<string, TrailKind> = {
    report_usage: "usage",
    workflow_handoff_append: "handoff",
    workflow_confirm: "gate",
    gate_log_append: "gate",
    workflow_state_save: "handoff",
  };

  it("covers every writing tool that accepts a path", async () => {
    const { PN_CORE_TOOLS } = await import("./tools/registry.js");
    const pathWriters = PN_CORE_TOOLS.filter(
      (t) =>
        t.annotations.readOnlyHint !== true &&
        Object.keys(t.zodSchema).some((k) => k === "path" || k === "handoff_path")
    ).map((t) => t.name);
    expect(pathWriters.sort()).toEqual(Object.keys(WRITERS).sort());
  });

  it("refuses each foreign trail and leaves it untouched", async () => {
    const { PN_CORE_TOOLS } = await import("./tools/registry.js");
    const trails = engineTrails({});
    mkdirSync(join(ws, ".pncore"));
    for (const rel of Object.values(trails)) writeFileSync(join(ws, rel), "");
    for (const [name, args] of Object.entries(WRITERS)) {
      const tool = PN_CORE_TOOLS.find((t) => t.name === name)!;
      for (const [kind, rel] of Object.entries(trails) as Array<[TrailKind, string]>) {
        if (kind === OWN[name]) continue;
        const before = readFileSync(join(ws, rel), "utf8");
        const r = await tool.handler(args(rel));
        expect(r.isError, `${name} -> ${kind}`).toBe(true);
        expect(r.content[0]!.text).toMatch(/trail/);
        expect(readFileSync(join(ws, rel), "utf8"), `${name} wrote ${kind}`).toBe(before);
      }
    }
  });

  it("sees through a symlink alias of a trail", async () => {
    const { PN_CORE_TOOLS } = await import("./tools/registry.js");
    mkdirSync(join(ws, ".pncore"));
    writeFileSync(join(ws, ".pncore", "run-events.jsonl"), "");
    symlinkSync(join(ws, ".pncore", "run-events.jsonl"), join(ws, "alias.jsonl"));
    const usage = PN_CORE_TOOLS.find((t) => t.name === "report_usage")!;
    const r = await usage.handler(WRITERS.report_usage!("alias.jsonl"));
    expect(r.content[0]!.text).toMatch(/events trail/);
    expect(readFileSync(join(ws, ".pncore", "run-events.jsonl"), "utf8")).toBe("");
  });

  it("keeps harness_scaffold and the gate log inside the workspace through symlinks", async () => {
    const outside = mkdtempSync(join(tmpdir(), "pn-outside-"));
    try {
      const { PN_CORE_TOOLS } = await import("./tools/registry.js");
      symlinkSync(outside, join(ws, ".cursor"));
      const scaffold = PN_CORE_TOOLS.find((t) => t.name === "harness_scaffold")!;
      const s = await scaffold.handler({ harnesses: ["cursor"], project: { name: "x" } });
      expect(s.content[0]!.text).toMatch(/PATH_TRAVERSAL/);
      symlinkSync(outside, join(ws, ".pncore"));
      const confirm = PN_CORE_TOOLS.find((t) => t.name === "workflow_confirm")!;
      const c = await confirm.handler({ question: "q", options: ["go", "no_go"] });
      expect(c.isError).toBe(true);
      expect(c.content[0]!.text).toMatch(/symlink escapes/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
