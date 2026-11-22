import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { realpathDeepest, resolveInside, resolveSafePath, safeBase } from "./safe-path.js";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "pn-safe-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("safe-path", () => {
  it("accepts paths inside cwd and rejects traversal", () => {
    expect(safeBase).toBe(process.cwd());
    expect("resolved" in resolveSafePath(".pncore/x.jsonl")).toBe(true);
    expect(resolveSafePath("../outside.jsonl")).toEqual({
      error: "Path must be within process cwd",
    });
  });

  it("rejects a sibling that only shares the base prefix", () => {
    const root = tmp();
    const base = join(root, "work");
    mkdirSync(base);
    expect(resolveInside(base, join(root, "work-evil", "x.json"))).toEqual({
      error: "Path must be within process cwd",
    });
  });

  it("rejects a write through a symlinked directory that points outside the workspace", () => {
    const base = tmp();
    const outside = tmp();
    symlinkSync(outside, join(base, ".pncore"), "dir");
    const r = resolveInside(base, ".pncore/run-events.jsonl");
    expect(r).toEqual({ error: "Path must be within process cwd (symlink escapes the workspace)" });
  });

  it("accepts a symlink that stays inside the workspace", () => {
    const base = tmp();
    mkdirSync(join(base, "real"));
    symlinkSync(join(base, "real"), join(base, "alias"), "dir");
    expect("resolved" in resolveInside(base, "alias/state.json")).toBe(true);
  });

  it("realpathDeepest resolves the deepest existing ancestor and keeps the missing tail", () => {
    const base = tmp();
    expect(realpathDeepest(join(base, "a", "b.json"))).toBe(
      join(realpathSync(base), "a", "b.json")
    );
  });
});
