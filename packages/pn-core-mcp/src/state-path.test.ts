import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  DEFAULT_STATE_REL,
  STATE_SAVES_REL,
  readLastStateSave,
  recordStateSave,
  resolveStatePath,
} from "./state-path.js";

describe("state-path", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = join(tmpdir(), `pncore-sp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(cwd, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true });
  });

  it("resolves argument > PNCORE_STATE_PATH > default", () => {
    const env = { PNCORE_STATE_PATH: ".pncore/env.json" };
    expect(resolveStatePath({ arg: ".pncore/arg.json", cwd, env })).toMatchObject({
      requested: ".pncore/arg.json",
      source: "argument",
      resolved: join(cwd, ".pncore/arg.json"),
    });
    expect(resolveStatePath({ cwd, env })).toMatchObject({ source: "env" });
    expect(resolveStatePath({ arg: "  ", cwd, env: { PNCORE_STATE_PATH: " " } })).toMatchObject({
      requested: DEFAULT_STATE_REL,
      source: "default",
    });
  });

  it("defaults to process.cwd() and process.env", () => {
    const r = resolveStatePath();
    expect(r.requested).toBe(process.env.PNCORE_STATE_PATH?.trim() || DEFAULT_STATE_REL);
    expect(r.resolved).toBe(join(process.cwd(), r.requested));
  });

  it("accepts absolute paths inside the workspace and rejects paths outside it", () => {
    const inside = join(cwd, ".pncore", "abs.json");
    expect(resolveStatePath({ arg: inside, cwd, env: {} }).resolved).toBe(inside);
    const outside = resolveStatePath({ arg: "../elsewhere.json", cwd, env: {} });
    expect(outside.resolved).toBeNull();
    expect(outside.error).toContain("workspace root");
  });

  it("rejects the workspace root and existing directories as the state path", () => {
    mkdirSync(join(cwd, ".pncore"));
    for (const arg of [".", "./", cwd, ".pncore"]) {
      const r = resolveStatePath({ arg, cwd, env: {} });
      expect(r.resolved).toBeNull();
      expect(r.error).toContain("must be a file inside the workspace");
    }
  });

  it("records saves append-only and reads back the newest", () => {
    expect(readLastStateSave(cwd)).toBeNull();
    recordStateSave(join(cwd, ".pncore", "a.json"), "run-a", cwd);
    recordStateSave(join(cwd, ".pncore", "b.json"), null, cwd);
    const lines = readFileSync(join(cwd, STATE_SAVES_REL), "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(readLastStateSave(cwd)).toMatchObject({ path: join(".pncore", "b.json"), run_id: null });
  });

  it("skips partial or malformed trailing lines", () => {
    recordStateSave(join(cwd, ".pncore", "a.json"), "run-a", cwd);
    appendFileSync(join(cwd, STATE_SAVES_REL), '{"ts":"x"}\n{"path":', "utf-8");
    expect(readLastStateSave(cwd)).toMatchObject({
      path: join(".pncore", "a.json"),
      run_id: "run-a",
    });
  });
});
