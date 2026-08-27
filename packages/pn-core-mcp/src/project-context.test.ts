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
  });

  it("defaults to agent mode and empty artifacts when index absent", () => {
    const packet = buildProjectContextPacket({ cwd });
    expect(packet.mode).toBe("agent");
    expect(packet.context_index.present).toBe(false);
    expect(packet.artifacts).toEqual([]);
    expect(packet.next_incomplete).toBeNull();
  });
});
