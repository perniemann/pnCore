import { describe, it, expect, afterEach } from "vitest";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureSdkNestedZod } from "./fix-sdk-zod-runtime.js";

const roots: string[] = [];

function pkgRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "pn-zod-"));
  roots.push(root);
  return root;
}

function writeZod(dir: string, complete: boolean): void {
  mkdirSync(join(dir, "v3"), { recursive: true });
  mkdirSync(join(dir, "v4"), { recursive: true });
  writeFileSync(join(dir, "package.json"), "{}");
  writeFileSync(join(dir, "v3", "index.js"), "");
  if (complete) writeFileSync(join(dir, "v4", "index.js"), "");
}

const nestedOf = (root: string) =>
  join(root, "node_modules", "@modelcontextprotocol", "sdk", "node_modules", "zod");

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe("ensureSdkNestedZod", () => {
  it("does nothing before install (no hoisted zod)", () => {
    const root = pkgRoot();
    expect(ensureSdkNestedZod(root)).toBe("no_hoisted");
    expect(existsSync(nestedOf(root))).toBe(false);
  });

  it("leaves a complete nested zod alone", () => {
    const root = pkgRoot();
    writeZod(join(root, "node_modules", "zod"), true);
    writeZod(nestedOf(root), true);
    expect(ensureSdkNestedZod(root)).toBe("complete");
    expect(lstatSync(nestedOf(root)).isSymbolicLink()).toBe(false);
  });

  it("links the hoisted zod when the nested copy is missing", () => {
    const root = pkgRoot();
    writeZod(join(root, "node_modules", "zod"), true);
    expect(ensureSdkNestedZod(root, { platform: "linux" })).toBe("linked");
    expect(lstatSync(nestedOf(root)).isSymbolicLink()).toBe(true);
    expect(existsSync(join(nestedOf(root), "v4", "index.js"))).toBe(true);
  });

  it("replaces an incomplete nested zod and uses a junction on win32", () => {
    const root = pkgRoot();
    writeZod(join(root, "node_modules", "zod"), true);
    writeZod(nestedOf(root), false);
    const calls: string[] = [];
    const outcome = ensureSdkNestedZod(root, {
      platform: "win32",
      link: ((_target: string, _path: string, type?: string) => {
        calls.push(String(type));
      }) as never,
    });
    expect(outcome).toBe("linked");
    expect(calls).toEqual(["junction"]);
    expect(existsSync(nestedOf(root))).toBe(false);
  });

  it("copies when linking fails", () => {
    const root = pkgRoot();
    writeZod(join(root, "node_modules", "zod"), true);
    const outcome = ensureSdkNestedZod(root, {
      link: (() => {
        throw new Error("EPERM");
      }) as never,
    });
    expect(outcome).toBe("copied");
    expect(lstatSync(nestedOf(root)).isSymbolicLink()).toBe(false);
    expect(existsSync(join(nestedOf(root), "v4", "index.js"))).toBe(true);
  });

  it("reports failure when neither link nor copy works", () => {
    const root = pkgRoot();
    writeZod(join(root, "node_modules", "zod"), true);
    // A file where the sdk directory should be makes mkdir and copy fail.
    mkdirSync(join(root, "node_modules", "@modelcontextprotocol"), { recursive: true });
    writeFileSync(join(root, "node_modules", "@modelcontextprotocol", "sdk"), "");
    expect(ensureSdkNestedZod(root)).toBe("failed");
  });
});
