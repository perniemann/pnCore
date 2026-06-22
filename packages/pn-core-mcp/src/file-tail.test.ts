import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { readFileTail, tailScanBytesFromEnv } from "./file-tail.js";

describe("readFileTail", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "pncore-file-tail-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns full file when smaller than maxBytes", () => {
    const p = join(dir, "small.txt");
    writeFileSync(p, "hello world", "utf-8");
    expect(readFileTail(p, 1024)).toBe("hello world");
  });

  it("returns only the tail when file exceeds maxBytes", () => {
    const p = join(dir, "big.txt");
    const body = "a".repeat(100) + "TAIL";
    writeFileSync(p, body, "utf-8");
    const out = readFileTail(p, 4);
    expect(out).toBe("TAIL");
  });

  it("handles empty file", () => {
    const p = join(dir, "empty.txt");
    writeFileSync(p, "", "utf-8");
    expect(readFileTail(p, 1024)).toBe("");
  });
});

describe("tailScanBytesFromEnv", () => {
  it("returns default when env is undefined", () => {
    expect(tailScanBytesFromEnv(undefined, 786_432)).toBe(786_432);
  });

  it("returns default when env is non-numeric", () => {
    expect(tailScanBytesFromEnv("not-a-number", 786_432)).toBe(786_432);
  });

  it("returns default when env is below the minimum", () => {
    expect(tailScanBytesFromEnv("1024", 786_432, 4096)).toBe(786_432);
  });

  it("returns parsed value when above minimum", () => {
    expect(tailScanBytesFromEnv("65536", 786_432, 4096)).toBe(65536);
  });
});
