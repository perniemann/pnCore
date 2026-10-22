import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  buildProjectContextPacket,
  deriveArtifactStatus,
  loadContextIndex,
  loadRunEventsForCwd,
  readActiveRunId,
  readResumeLine,
  type ContextArtifact,
} from "./project-context.js";

describe("project-context", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = join(tmpdir(), `pncore-pc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(cwd, "docs", "refs"), { recursive: true });
    mkdirSync(join(cwd, ".pncore"), { recursive: true });
    mkdirSync(join(cwd, "docs"), { recursive: true });
    writeFileSync(join(cwd, "docs", "convention.md"), "# convention\n", "utf-8");
  });

  afterEach(() => {
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true });
  });

  it("loadContextIndex returns present false when missing or invalid", () => {
    expect(loadContextIndex(cwd).present).toBe(false);
    writeFileSync(join(cwd, "docs", "refs", "context-index.json"), "not-json", "utf-8");
    expect(loadContextIndex(cwd).present).toBe(false);
    writeFileSync(join(cwd, "docs", "refs", "context-index.json"), "[]", "utf-8");
    expect(loadContextIndex(cwd).present).toBe(false);
  });

  it("loadContextIndex returns index when valid", () => {
    writeFileSync(
      join(cwd, "docs", "refs", "context-index.json"),
      JSON.stringify({
        version: "1.3.0",
        last_reviewed: "2026-08-25",
        pointers: { workspace: "AGENTS.md" },
        artifacts: [],
      }),
      "utf-8"
    );
    const loaded = loadContextIndex(cwd);
    expect(loaded.present).toBe(true);
    expect(loaded.index?.version).toBe("1.3.0");
  });

  it("readActiveRunId handles missing, invalid, and valid state", () => {
    expect(readActiveRunId(cwd)).toBeNull();
    writeFileSync(join(cwd, ".pncore", "workflow-state.json"), "{", "utf-8");
    expect(readActiveRunId(cwd)).toBeNull();
    writeFileSync(join(cwd, ".pncore", "workflow-state.json"), "[]", "utf-8");
    expect(readActiveRunId(cwd)).toBeNull();
    writeFileSync(join(cwd, ".pncore", "workflow-state.json"), JSON.stringify({}), "utf-8");
    expect(readActiveRunId(cwd)).toBeNull();
    writeFileSync(
      join(cwd, ".pncore", "workflow-state.json"),
      JSON.stringify({ run_id: "  " }),
      "utf-8"
    );
    expect(readActiveRunId(cwd)).toBeNull();
    writeFileSync(
      join(cwd, ".pncore", "workflow-state.json"),
      JSON.stringify({ run_id: "run-x" }),
      "utf-8"
    );
    expect(readActiveRunId(cwd)).toBe("run-x");
  });

  it("readResumeLine prefers Resume here, then Status, then first prose", () => {
    expect(readResumeLine(cwd)).toBeNull();
    writeFileSync(join(cwd, ".pncore", "handoff.md"), "# Only title\n", "utf-8");
    expect(readResumeLine(cwd)).toBeNull();
    writeFileSync(
      join(cwd, ".pncore", "handoff.md"),
      "# Handoff\n\nFirst line of body.\n",
      "utf-8"
    );
    expect(readResumeLine(cwd)).toContain("First line");
    writeFileSync(
      join(cwd, ".pncore", "handoff.md"),
      "# Handoff\n\n## Status\nShip in progress.\n",
      "utf-8"
    );
    expect(readResumeLine(cwd)).toContain("Ship in progress");
    writeFileSync(
      join(cwd, ".pncore", "handoff.md"),
      "# Handoff\n\n## Resume here\nCall project_context.\n",
      "utf-8"
    );
    expect(readResumeLine(cwd)).toContain("project_context");
  });

  it("loadRunEventsForCwd skips bad lines and filters by run_id", () => {
    expect(loadRunEventsForCwd("r1", cwd)).toEqual([]);
    writeFileSync(
      join(cwd, ".pncore", "run-events.jsonl"),
      [
        "not-json",
        JSON.stringify({ kind: "other", run_id: "r1" }),
        JSON.stringify({
          kind: "acceptance",
          run_id: "r1",
          ts: "2026-08-25T00:00:00.000Z",
          workflowType: "design",
          step: 1,
          phasesPassed: true,
          verifyEarned: true,
          humanEarned: true,
          accepted: true,
          reasons: [],
        }),
        JSON.stringify({
          kind: "verify",
          run_id: "r2",
          attestationId: "a2",
          argv: ["npm", "test"],
          cwd: ".",
          exitCode: 1,
          timedOut: false,
          stdoutTail: "",
          stderrTail: "",
          startedAt: "2026-08-25T00:00:00.000Z",
          finishedAt: "2026-08-25T00:00:01.000Z",
          sandbox: { backend: "unavailable", jailed: false },
        }),
      ].join("\n") + "\n",
      "utf-8"
    );
    const events = loadRunEventsForCwd("r1", cwd, 10);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("acceptance");
  });

  it("derives missing when path absent", () => {
    const art: ContextArtifact = {
      id: "x",
      type: "plan",
      path: "docs/plans/nope.md",
    };
    const r = deriveArtifactStatus(art, cwd);
    expect(r.derived_status).toBe("missing");
    expect(r.path_exists).toBe(false);
  });

  it("marks authored complete without run_id as drift", () => {
    const art: ContextArtifact = {
      id: "c1",
      type: "convention",
      path: "docs/convention.md",
      authored_status: "complete",
      tracker: "42",
    };
    const r = deriveArtifactStatus(art, cwd);
    expect(r.derived_status).toBe("drift");
    expect(r.tracker).toBe("42");
  });

  it("attests complete when verify exit 0 exists for run_id", () => {
    writeFileSync(
      join(cwd, ".pncore", "run-events.jsonl"),
      JSON.stringify({
        kind: "verify",
        run_id: "run-1",
        attestationId: "att-1",
        argv: ["npm", "test"],
        cwd: ".",
        exitCode: 0,
        timedOut: false,
        stdoutTail: "",
        stderrTail: "",
        startedAt: "2026-08-25T00:00:00.000Z",
        finishedAt: "2026-08-25T00:00:01.000Z",
        sandbox: { backend: "unavailable", jailed: false },
      }) + "\n",
      "utf-8"
    );
    const art: ContextArtifact = {
      id: "c1",
      type: "convention",
      path: "docs/convention.md",
      authored_status: "DONE",
      run_id: "run-1",
    };
    const r = deriveArtifactStatus(art, cwd);
    expect(r.derived_status).toBe("complete_attested");
  });

  it("attests complete via acceptance event and uses eventsByRunId map", () => {
    const art: ContextArtifact = {
      id: "c1",
      type: "plan",
      path: "docs/convention.md",
      authored_status: "shipped",
      run_id: "run-acc",
    };
    const map = new Map([
      [
        "run-acc",
        [
          {
            kind: "acceptance" as const,
            run_id: "run-acc",
            ts: "2026-08-25T00:00:00.000Z",
            workflowType: "full_dev",
            step: 5,
            phasesPassed: true,
            verifyEarned: true,
            humanEarned: true,
            accepted: true,
            reasons: [],
          },
        ],
      ],
    ]);
    expect(deriveArtifactStatus(art, cwd, map).derived_status).toBe("complete_attested");
  });

  it("marks complete with run_id but failing verify as drift", () => {
    writeFileSync(
      join(cwd, ".pncore", "run-events.jsonl"),
      JSON.stringify({
        kind: "verify",
        run_id: "run-fail",
        attestationId: "att-f",
        argv: ["npm", "test"],
        cwd: ".",
        exitCode: 1,
        timedOut: false,
        stdoutTail: "",
        stderrTail: "",
        startedAt: "2026-08-25T00:00:00.000Z",
        finishedAt: "2026-08-25T00:00:01.000Z",
        sandbox: { backend: "unavailable", jailed: false },
      }) + "\n",
      "utf-8"
    );
    const art: ContextArtifact = {
      id: "c1",
      type: "convention",
      path: "docs/convention.md",
      authored_status: "complete",
      run_id: "run-fail",
    };
    expect(deriveArtifactStatus(art, cwd).derived_status).toBe("drift");
  });

  it("derives in_progress and notes non-complete authored claims", () => {
    expect(
      deriveArtifactStatus(
        {
          id: "wip",
          type: "plan",
          path: "docs/convention.md",
          authored_status: "in_progress",
          run_id: "  ",
          tracker: "",
        },
        cwd
      ).derived_status
    ).toBe("in_progress");
    const other = deriveArtifactStatus(
      {
        id: "review",
        type: "design",
        path: "docs/convention.md",
        authored_status: "in_review",
      },
      cwd
    );
    expect(other.derived_status).toBe("ok");
    expect(other.notes.some((n) => n.includes("claim only"))).toBe(true);
  });

  it("builds operator packet with counts and no trail", () => {
    writeFileSync(
      join(cwd, "docs", "refs", "context-index.json"),
      JSON.stringify({
        version: "1.3.0",
        last_reviewed: "2026-08-25",
        pointers: { workspace: "AGENTS.md" },
        artifacts: [
          { id: "convention-1", type: "convention", path: "docs/convention.md" },
          {
            id: "plan-missing",
            type: "plan",
            path: "docs/plans/missing.md",
            authored_status: "complete",
          },
        ],
      }),
      "utf-8"
    );
    writeFileSync(
      join(cwd, ".pncore", "handoff.md"),
      "# Handoff\n\n## Resume here\nRun project_context next.\n",
      "utf-8"
    );
    writeFileSync(
      join(cwd, ".pncore", "workflow-state.json"),
      JSON.stringify({ run_id: "run-abc" }),
      "utf-8"
    );

    const packet = buildProjectContextPacket({ mode: "operator", cwd });
    expect(packet.mode).toBe("operator");
    expect(packet.counts.total).toBe(2);
    expect(packet.counts.convention).toBe(1);
    expect(packet.counts.plan).toBe(1);
    expect(packet.counts.missing).toBe(1);
    expect(packet.active_run_id).toBe("run-abc");
    expect(packet.resume).toContain("project_context");
    expect(packet.artifacts).toBeUndefined();
    expect(packet.trail).toBeUndefined();
    expect(packet.next_incomplete?.id).toBe("plan-missing");
    expect(packet.responseAliases.map((a) => a.alias)).toEqual(["scr", "eli", "foc", "ref", "scp"]);
    expect(packet.responseAliases.every((a) => a.expand.length > 0)).toBe(true);
    expect(packet.responseAliases.find((a) => a.alias === "ref")?.expand).toMatch(
      /Preserve codes for the rest of the session/
    );
  });

  it("agent mode includes artifacts and JSONL trail including verify and acceptance", () => {
    writeFileSync(
      join(cwd, "docs", "refs", "context-index.json"),
      JSON.stringify({
        version: "1.3.0",
        last_reviewed: "2026-08-25",
        pointers: { workspace: "AGENTS.md" },
        artifacts: [
          { id: "convention-1", type: "convention", path: "docs/convention.md" },
          { id: "bad-type", type: "epic", path: "docs/convention.md" },
          null,
        ],
      }),
      "utf-8"
    );
    writeFileSync(
      join(cwd, ".pncore", "workflow-state.json"),
      JSON.stringify({ run_id: "run-trail" }),
      "utf-8"
    );
    writeFileSync(
      join(cwd, ".pncore", "workflow-handoff.jsonl"),
      [
        "bad",
        JSON.stringify({
          ts: "2026-08-25T12:00:00.000Z",
          run_id: "run-trail",
          step: 1,
          summary: "built packet",
        }),
        JSON.stringify({
          ts: "2026-08-25T11:00:00.000Z",
          run_id: "other",
          step: 0,
          summary: "ignored",
        }),
        JSON.stringify({ ts: "2026-08-25T12:01:00.000Z", run_id: "run-trail", step: 2 }),
      ].join("\n") + "\n",
      "utf-8"
    );
    writeFileSync(
      join(cwd, ".pncore", "run-events.jsonl"),
      [
        JSON.stringify({
          kind: "verify",
          run_id: "run-trail",
          attestationId: "a1",
          commandId: "npm_test",
          argv: ["npm", "test"],
          cwd: ".",
          exitCode: 0,
          timedOut: false,
          stdoutTail: "",
          stderrTail: "",
          startedAt: "2026-08-25T12:02:00.000Z",
          finishedAt: "2026-08-25T12:02:01.000Z",
          sandbox: { backend: "unavailable", jailed: false },
        }),
        JSON.stringify({
          kind: "acceptance",
          run_id: "run-trail",
          ts: "2026-08-25T12:03:00.000Z",
          workflowType: "design",
          step: 4,
          phasesPassed: true,
          verifyEarned: true,
          humanEarned: false,
          accepted: false,
          reasons: ["skeptic"],
        }),
      ].join("\n") + "\n",
      "utf-8"
    );

    const packet = buildProjectContextPacket({
      mode: "agent",
      cwd,
      max_trail: 10,
      run_id: "run-trail",
    });
    expect(packet.artifacts).toHaveLength(1);
    expect(packet.trail?.some((t) => t.summary.includes("built packet"))).toBe(true);
    expect(packet.trail?.some((t) => t.source === "run_events")).toBe(true);
    expect(packet.pointers?.workspace).toBe("AGENTS.md");
    expect(packet.responseAliases).toHaveLength(5);
  });

  it("defaults to agent mode and empty artifacts when index absent", () => {
    const packet = buildProjectContextPacket({ cwd });
    expect(packet.mode).toBe("agent");
    expect(packet.context_index.present).toBe(false);
    expect(packet.artifacts).toEqual([]);
    expect(packet.next_incomplete).toBeNull();
    expect(packet.responseAliases).toHaveLength(5);
  });
});

describe("project-context active run and consistency", () => {
  let cwd: string;
  const savedEnv = { ...process.env };

  const writeJson = (rel: string, value: unknown) => {
    mkdirSync(join(cwd, rel, ".."), { recursive: true });
    writeFileSync(join(cwd, rel), JSON.stringify(value), "utf-8");
  };
  const writeJsonl = (rel: string, rows: unknown[]) => {
    mkdirSync(join(cwd, rel, ".."), { recursive: true });
    writeFileSync(join(cwd, rel), rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
  };
  const serve = (runId: string, step: number, ts: string) => ({
    ts,
    runId,
    workflowType: "full_dev",
    step,
    nextStep: step + 1,
    gate: "model",
    done: false,
  });
  const handoff = (runId: string, step: number, ts: string) => ({
    ts,
    run_id: runId,
    step,
    summary: `step ${step} done`,
  });
  const notable = (p: ReturnType<typeof buildProjectContextPacket>) =>
    p.consistency.mismatches.filter((m) => m.severity !== "info");
  const codes = (p: ReturnType<typeof buildProjectContextPacket>) => notable(p).map((m) => m.code);

  beforeEach(() => {
    cwd = join(tmpdir(), `pncore-ar-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(cwd, ".pncore"), { recursive: true });
    mkdirSync(join(cwd, "docs", "refs"), { recursive: true });
    writeFileSync(join(cwd, "docs", "convention.md"), "# c\n", "utf-8");
    writeJson("docs/refs/context-index.json", {
      version: "1.3.0",
      last_reviewed: "2026-10-01",
      pointers: {},
      artifacts: [{ id: "c", type: "convention", path: "docs/convention.md" }],
    });
    delete process.env.PNCORE_STATE_PATH;
    delete process.env.PNCORE_RUN_LOG;
    delete process.env.PNCORE_HANDOFF_LOG;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true });
  });

  it("selects the state run when every source agrees", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/workflow-runs.jsonl", [serve("run-a", 2, "2026-10-01T10:00:00.000Z")]);
    writeJsonl(".pncore/workflow-handoff.jsonl", [handoff("run-a", 1, "2026-10-01T09:59:00.000Z")]);
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.run_id).toBe("run-a");
    expect(p.active_run.run_id_source).toBe("state");
    expect(p.active_run.workflowType).toBe("full_dev");
    expect(p.active_run.last_served_step).toBe(2);
    expect(p.active_run.last_completed_step).toBe(1);
    expect(p.active_run.step_status).toBe("in_progress");
    expect(p.consistency.ok).toBe(true);
    expect(notable(p)).toEqual([]);
    expect(p.drift_scope).toBe("indexed_files");
    expect(p.active_run_id).toBe("run-a");
  });

  it("stale default state with a save to a custom path raises a mismatch while drift is 0", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-old" });
    writeJson(".pncore/runs/current.json", { run_id: "run-new" });
    writeJsonl(".pncore/state-saves.jsonl", [
      { ts: "2026-10-01T11:00:00.000Z", path: ".pncore/runs/current.json", run_id: "run-new" },
    ]);
    writeJsonl(".pncore/workflow-runs.jsonl", [
      serve("run-old", 4, "2026-09-01T10:00:00.000Z"),
      serve("run-new", 1, "2026-10-01T11:00:00.000Z"),
    ]);
    const p = buildProjectContextPacket({ cwd });
    expect(p.counts.drift).toBe(0);
    expect(p.drift).toEqual([]);
    expect(p.consistency.ok).toBe(false);
    expect(codes(p)).toEqual(expect.arrayContaining(["state_path_diverged", "newer_run_in_log"]));
    expect(p.active_run.run_id).toBeNull();
    expect(p.active_run_id).toBeNull();
    expect(p.active_run.candidates.map((c) => c.run_id)).toEqual(["run-old", "run-new"]);
  });

  it("explicit custom state_path selects the current run and flags the shadowed default", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-old" });
    writeJson(".pncore/runs/current.json", { run_id: "run-new" });
    writeJsonl(".pncore/state-saves.jsonl", [
      { ts: "2026-10-01T11:00:00.000Z", path: ".pncore/runs/current.json", run_id: "run-new" },
    ]);
    const p = buildProjectContextPacket({ cwd, state_path: ".pncore/runs/current.json" });
    expect(p.active_run.state_path_source).toBe("argument");
    expect(p.active_run.state_run_id).toBe("run-new");
    expect(p.active_run.run_id).toBe("run-new");
    expect(codes(p)).toEqual(["default_state_shadowed"]);
    expect(p.consistency.ok).toBe(true);
  });

  it("PNCORE_STATE_PATH is honoured", () => {
    writeJson(".pncore/env-state.json", { run_id: "run-env" });
    process.env.PNCORE_STATE_PATH = ".pncore/env-state.json";
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.state_path).toBe(".pncore/env-state.json");
    expect(p.active_run.state_path_source).toBe("env");
    expect(p.active_run.run_id).toBe("run-env");
  });

  it("a state path outside the workspace is reported, not replaced by the default", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-default" });
    process.env.PNCORE_STATE_PATH = join(tmpdir(), "outside-state.json");
    const p = buildProjectContextPacket({ cwd });
    expect(codes(p)).toContain("state_path_rejected");
    expect(p.consistency.ok).toBe(false);
    expect(p.active_run.state_present).toBe(false);
    expect(p.active_run.run_id).toBeNull();
    const rejected = p.consistency.mismatches.find((m) => m.code === "state_path_rejected");
    expect(rejected?.detail).toContain("workspace root");
  });

  it("warns when the cwd does not look like a workspace root", () => {
    rmSync(join(cwd, ".pncore"), { recursive: true, force: true });
    rmSync(join(cwd, "docs"), { recursive: true, force: true });
    const p = buildProjectContextPacket({ cwd });
    expect(codes(p)).toEqual(["workspace_root_suspect"]);
    expect(p.consistency.ok).toBe(true);
  });

  it("served = completed is idle; two distinct steps served after a handoff is handoff_skipped", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/workflow-runs.jsonl", [serve("run-a", 2, "2026-10-01T10:00:00.000Z")]);
    writeJsonl(".pncore/workflow-handoff.jsonl", [handoff("run-a", 2, "2026-10-01T10:05:00.000Z")]);
    expect(buildProjectContextPacket({ cwd }).active_run.step_status).toBe("idle");

    writeJsonl(".pncore/workflow-runs.jsonl", [
      serve("run-a", 2, "2026-10-01T10:00:00.000Z"),
      serve("run-a", 3, "2026-10-01T10:10:00.000Z"),
      serve("run-a", 4, "2026-10-01T10:20:00.000Z"),
    ]);
    const skipped = buildProjectContextPacket({ cwd });
    expect(skipped.active_run.step_status).toBe("handoff_skipped");
    expect(codes(skipped)).toEqual(["handoff_skipped"]);
    expect(skipped.consistency.ok).toBe(true);
    expect(skipped.active_run.run_id).toBe("run-a");
  });

  it("repeated serves of one step after a handoff stay in_progress (phased steps)", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/workflow-handoff.jsonl", [handoff("run-a", 3, "2026-10-01T10:00:00.000Z")]);
    writeJsonl(".pncore/workflow-runs.jsonl", [
      serve("run-a", 3, "2026-10-01T09:00:00.000Z"),
      serve("run-a", 4, "2026-10-01T10:10:00.000Z"),
      serve("run-a", 4, "2026-10-01T10:30:00.000Z"),
    ]);
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.step_status).toBe("in_progress");
    expect(notable(p)).toEqual([]);
  });

  it("a late handoff for an earlier step is handoff_foreign", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/workflow-runs.jsonl", [
      serve("run-a", 2, "2026-10-01T10:00:00.000Z"),
      serve("run-a", 3, "2026-10-01T10:10:00.000Z"),
    ]);
    writeJsonl(".pncore/workflow-handoff.jsonl", [handoff("run-a", 2, "2026-10-01T10:20:00.000Z")]);
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.step_status).toBe("handoff_foreign");
    expect(codes(p)).toEqual(["handoff_foreign"]);
  });

  it("a newer handoff from another run blocks silent selection of the state run", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-parent" });
    writeJsonl(".pncore/workflow-handoff.jsonl", [
      handoff("run-parent", 5, "2026-09-01T10:00:00.000Z"),
      handoff("run-child", 1, "2026-10-01T10:00:00.000Z"),
    ]);
    const p = buildProjectContextPacket({ cwd });
    expect(codes(p)).toEqual(["handoff_run_mismatch"]);
    expect(p.active_run.handoff_run_id).toBe("run-child");
    expect(p.active_run.run_id).toBeNull();
  });

  it("an explicit run_id wins; disagreements are reported as warnings", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-parent" });
    writeJsonl(".pncore/workflow-runs.jsonl", [serve("run-other", 0, "2026-10-01T12:00:00.000Z")]);
    const p = buildProjectContextPacket({ cwd, run_id: "run-chosen" });
    expect(p.active_run.run_id).toBe("run-chosen");
    expect(p.active_run.run_id_source).toBe("argument");
    expect(codes(p)).toEqual(expect.arrayContaining(["newer_run_in_log", "state_run_differs"]));
    expect(notable(p).every((m) => m.severity === "warn")).toBe(true);
    expect(p.consistency.ok).toBe(true);
  });

  it("resume_run_bound says whether handoff.md names the selected run", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeFileSync(join(cwd, ".pncore", "handoff.md"), "## Resume here\nContinue.\n", "utf-8");
    expect(buildProjectContextPacket({ cwd }).active_run.resume_run_bound).toBe(false);
    writeFileSync(
      join(cwd, ".pncore", "handoff.md"),
      "## Resume here\nContinue run-a at step 3.\n",
      "utf-8"
    );
    expect(buildProjectContextPacket({ cwd }).active_run.resume_run_bound).toBe(true);
  });

  it("honours PNCORE_RUN_LOG and PNCORE_HANDOFF_LOG overrides", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/alt-runs.jsonl", [serve("run-a", 1, "2026-10-01T10:00:00.000Z")]);
    writeJsonl(".pncore/alt-handoff.jsonl", [handoff("run-a", 1, "2026-10-01T10:01:00.000Z")]);
    process.env.PNCORE_RUN_LOG = ".pncore/alt-runs.jsonl";
    process.env.PNCORE_HANDOFF_LOG = ".pncore/alt-handoff.jsonl";
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.last_served_step).toBe(1);
    expect(p.active_run.last_completed_step).toBe(1);
    expect(p.active_run.step_status).toBe("idle");
  });

  it("plain-saved state is flagged state_unversioned as info only", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    const p = buildProjectContextPacket({ cwd });
    expect(p.consistency.mismatches).toEqual([
      expect.objectContaining({ code: "state_unversioned", severity: "info" }),
    ]);
    expect(p.consistency.ok).toBe(true);
    expect(p.active_run.state_revision).toBeNull();
  });

  it("ignores uncommitted handoff lines above the state revision (interrupted commit)", () => {
    writeJson(".pncore/workflow-state.json", {
      run_id: "run-a",
      _pncore: { revision: 2, run_id: "run-a", step: 2, savedAt: "t", stateHash: "h" },
    });
    writeJsonl(".pncore/workflow-runs.jsonl", [
      serve("run-a", 2, "2026-10-01T10:00:00.000Z"),
      serve("run-a", 3, "2026-10-01T10:10:00.000Z"),
    ]);
    writeJsonl(".pncore/workflow-handoff.jsonl", [
      { ...handoff("run-a", 2, "2026-10-01T10:05:00.000Z"), revision: 2 },
      { ...handoff("run-a", 3, "2026-10-01T10:20:00.000Z"), revision: 3 },
    ]);
    const p = buildProjectContextPacket({ cwd });
    expect(p.active_run.state_revision).toBe(2);
    expect(p.active_run.last_completed_step).toBe(2);
    expect(p.active_run.step_status).toBe("in_progress");
    expect(codes(p)).toEqual(["handoff_revision_ahead"]);
    expect(p.active_run.run_id).toBe("run-a");
  });

  it("trail summarizes preflight events and verify failure classes", () => {
    writeJson(".pncore/workflow-state.json", { run_id: "run-a" });
    writeJsonl(".pncore/run-events.jsonl", [
      {
        kind: "preflight",
        run_id: "run-a",
        ts: "2026-10-01T10:00:00.000Z",
        preflightId: "p1",
        ok: false,
        failureClass: "missing_input",
        checks: [
          { kind: "command", target: "npm", ok: true },
          { kind: "env", target: "API_KEY", ok: false, reason: "unset or empty" },
        ],
        argv: ["npm", "test"],
        cwd: ".",
      },
      {
        kind: "preflight",
        run_id: "run-a",
        ts: "2026-10-01T10:01:00.000Z",
        preflightId: "p2",
        ok: true,
        failureClass: "none",
        checks: [],
        argv: ["npm", "test"],
        cwd: ".",
      },
      {
        kind: "verify",
        run_id: "run-a",
        attestationId: "v1",
        argv: ["npm", "test"],
        cwd: ".",
        exitCode: 1,
        timedOut: false,
        stdoutTail: "",
        stderrTail: "",
        startedAt: "2026-10-01T10:02:00.000Z",
        finishedAt: "2026-10-01T10:02:01.000Z",
        sandbox: { backend: "unavailable", jailed: false },
        failureClass: "behavioral",
      },
    ]);
    const summaries = (buildProjectContextPacket({ cwd, max_trail: 10 }).trail ?? []).map(
      (t) => t.summary
    );
    expect(summaries).toEqual(
      expect.arrayContaining([
        "preflight ok=false missing=env:API_KEY",
        "preflight ok=true",
        "verify exit=1 class=behavioral npm test",
      ])
    );
  });

  it("readActiveRunId uses the same resolver as the packet", () => {
    writeJson(".pncore/custom.json", { run_id: "run-custom" });
    expect(readActiveRunId(cwd, ".pncore/custom.json")).toBe("run-custom");
    expect(readActiveRunId(cwd, "../escape.json")).toBeNull();
  });
});
