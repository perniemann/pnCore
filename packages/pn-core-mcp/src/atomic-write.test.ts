import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { RENAME_MAX_ATTEMPTS, renameWithRetry, writeFileAtomic } from "./atomic-write.js";

const errno = (code: string) => Object.assign(new Error(code), { code });

describe("atomic-write", () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `pncore-aw-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it("creates parent directories and replaces content", () => {
    const target = join(dir, "nested", "state.json");
    writeFileAtomic(target, '{"a":1}');
    writeFileAtomic(target, '{"a":2}');
    expect(readFileSync(target, "utf-8")).toBe('{"a":2}');
    expect(readdirSync(join(dir, "nested"))).toEqual(["state.json"]);
  });

  it("leaves the prior file intact and removes the temp file when rename fails", () => {
    const target = join(dir, "state.json");
    writeFileSync(target, "prior", "utf-8");
    expect(() =>
      writeFileAtomic(target, "next", {
        platform: "linux",
        rename: () => {
          throw errno("EIO");
        },
      })
    ).toThrow("EIO");
    expect(readFileSync(target, "utf-8")).toBe("prior");
    expect(readdirSync(dir)).toEqual(["state.json"]);
  });

  it("retries transient win32 rename errors with bounded backoff", () => {
    let calls = 0;
    const sleeps: number[] = [];
    renameWithRetry("a", "b", {
      platform: "win32",
      rename: () => {
        calls++;
        if (calls < 4) throw errno(calls === 2 ? "EBUSY" : "EPERM");
      },
      sleep: (ms) => sleeps.push(ms),
    });
    expect(calls).toBe(4);
    expect(sleeps).toEqual([10, 20, 40]);
  });

  it("uses the real sleep between win32 retries when none is injected", () => {
    let calls = 0;
    const started = Date.now();
    renameWithRetry("a", "b", {
      platform: "win32",
      rename: () => {
        if (++calls === 1) throw errno("EBUSY");
      },
    });
    expect(calls).toBe(2);
    expect(Date.now() - started).toBeGreaterThanOrEqual(9);
  });

  it("cleans up when the temp file cannot be created", () => {
    const target = join(dir, "state.json");
    writeFileSync(target, "prior", "utf-8");
    const blocked = join(dir, "blocked");
    writeFileSync(blocked, "a file, not a directory", "utf-8");
    expect(() => writeFileAtomic(join(blocked, "state.json"), "next")).toThrow();
    expect(readFileSync(target, "utf-8")).toBe("prior");
    expect(readdirSync(dir).sort()).toEqual(["blocked", "state.json"]);
  });

  it("gives up after the attempt cap and caps the backoff", () => {
    let calls = 0;
    const sleeps: number[] = [];
    expect(() =>
      renameWithRetry("a", "b", {
        platform: "win32",
        rename: () => {
          calls++;
          throw errno("EACCES");
        },
        sleep: (ms) => sleeps.push(ms),
      })
    ).toThrow("EACCES");
    expect(calls).toBe(RENAME_MAX_ATTEMPTS);
    expect(Math.max(...sleeps)).toBe(250);
  });

  it("does not retry non-transient errors or any error off win32", () => {
    let calls = 0;
    const failing = () => {
      calls++;
      throw errno("EPERM");
    };
    expect(() => renameWithRetry("a", "b", { platform: "linux", rename: failing })).toThrow();
    expect(calls).toBe(1);
    calls = 0;
    expect(() =>
      renameWithRetry("a", "b", {
        platform: "win32",
        rename: () => {
          calls++;
          throw errno("ENOENT");
        },
        sleep: () => {},
      })
    ).toThrow("ENOENT");
    expect(calls).toBe(1);
  });
});
