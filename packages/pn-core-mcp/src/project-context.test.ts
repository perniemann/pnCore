import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  buildProjectContextPacket,
  deriveArtifactStatus,
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
    };
    const r = deriveArtifactStatus(art, cwd);
    expect(r.derived_status).toBe("drift");
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
      authored_status: "complete",
      run_id: "run-1",
    };
    const r = deriveArtifactStatus(art, cwd);
    expect(r.derived_status).toBe("complete_attested");
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

  it("agent mode includes artifacts and JSONL trail", () => {
    writeFileSync(
      join(cwd, "docs", "refs", "context-index.json"),
      JSON.stringify({
        version: "1.3.0",
        last_reviewed: "2026-08-25",
        pointers: { workspace: "AGENTS.md" },
        artifacts: [{ id: "convention-1", type: "convention", path: "docs/convention.md" }],
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
      JSON.stringify({
        ts: "2026-08-25T12:00:00.000Z",
        run_id: "run-trail",
        step: 1,
        summary: "built packet",
      }) + "\n",
      "utf-8"
    );

    const packet = buildProjectContextPacket({ mode: "agent", cwd, max_trail: 10 });
    expect(packet.artifacts).toHaveLength(1);
    expect(packet.trail?.some((t) => t.summary.includes("built packet"))).toBe(true);
  });
});
