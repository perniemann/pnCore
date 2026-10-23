import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { runPreflight } from "./verify-preflight.js";
import { classifyVerify } from "./verify-attest.js";

describe("runPreflight", () => {
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `pncore-pf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(root, "bin"), { recursive: true });
    writeFileSync(join(root, "data.txt"), "hello", "utf-8");
    writeFileSync(join(root, "bin", "tool"), "#!/bin/sh\n", "utf-8");
    chmodSync(join(root, "bin", "tool"), 0o755);
  });

  afterEach(() => {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  const failed = (r: ReturnType<typeof runPreflight>) =>
    r.checks.filter((c) => !c.ok).map((c) => `${c.kind}:${c.target}:${c.reason}`);

  it("finds a command on PATH and by relative path", () => {
    const env = { PATH: join(root, "bin") };
    expect(runPreflight({ argv: ["tool"], cwd: root, workspaceRoot: root, env }).ok).toBe(true);
    expect(runPreflight({ argv: ["./bin/tool"], cwd: root, workspaceRoot: root, env: {} }).ok).toBe(
      true
    );
    expect(failed(runPreflight({ argv: ["nope"], cwd: root, workspaceRoot: root, env }))).toEqual([
      "command:nope:not on PATH",
    ]);
    expect(
      failed(runPreflight({ argv: ["./bin/nope"], cwd: root, workspaceRoot: root, env }))
    ).toEqual(["command:./bin/nope:not found or not executable"]);
  });

  it("resolves win32 commands through PATHEXT without an execute bit", () => {
    writeFileSync(join(root, "bin", "npm.CMD"), "@echo off\n", "utf-8");
    const env = { Path: join(root, "bin"), PATHEXT: ".EXE;.CMD" };
    const r = runPreflight({
      argv: ["npm"],
      cwd: root,
      workspaceRoot: root,
      env,
      platform: "win32",
    });
    expect(r.ok).toBe(true);
  });

  it("checks inputs for presence, containment, access, and hash", () => {
    const env = { PATH: join(root, "bin") };
    const good = createHash("sha256").update("hello").digest("hex");
    const r = runPreflight({
      argv: ["tool"],
      cwd: root,
      workspaceRoot: root,
      env,
      inputs: [
        { path: "data.txt", sha256: good.toUpperCase(), access: "read" },
        { path: "bin/tool", access: "execute" },
        { path: "data.txt", access: "execute" },
        { path: "gone.txt" },
        { path: "../escape.txt" },
        { path: "data.txt", sha256: "0".repeat(64) },
        { path: "bin", sha256: good },
      ],
    });
    expect(r.ok).toBe(false);
    expect(failed(r)).toEqual([
      "input:data.txt:not executable",
      "input:gone.txt:missing",
      "input:../escape.txt:outside workspace",
      "input:data.txt:sha256 mismatch",
      "input:bin:not a file",
    ]);
  });

  it("checks required environment variables", () => {
    const env = { PATH: join(root, "bin"), PRESENT: "1", EMPTY: "" };
    const r = runPreflight({
      argv: ["tool"],
      cwd: root,
      workspaceRoot: root,
      env,
      env_required: ["PRESENT", "EMPTY", "ABSENT"],
    });
    expect(failed(r)).toEqual(["env:EMPTY:unset or empty", "env:ABSENT:unset or empty"]);
  });
});

describe("classifyVerify", () => {
  it("separates missing input, infrastructure, and behavioral failures", () => {
    const base = { exitCode: 0, timedOut: false };
    expect(classifyVerify(base)).toBe("none");
    expect(classifyVerify({ ...base, exitCode: 1 })).toBe("behavioral");
    expect(classifyVerify({ ...base, exitCode: 127 })).toBe("missing_input");
    expect(classifyVerify({ ...base, exitCode: 126 })).toBe("missing_input");
    expect(classifyVerify({ ...base, exitCode: 124, timedOut: true })).toBe("infrastructure");
    expect(classifyVerify({ ...base, exitCode: 1, signal: "SIGKILL" })).toBe("infrastructure");
    expect(classifyVerify({ ...base, exitCode: 127, spawnErrorCode: "ENOENT" })).toBe(
      "missing_input"
    );
    expect(classifyVerify({ ...base, exitCode: 1, spawnErrorCode: "EMFILE" })).toBe(
      "infrastructure"
    );
  });
});
