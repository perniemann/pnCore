import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { maxResourceCharsFromEnv, truncateResourceBody } from "./resource-truncate.js";

describe("truncateResourceBody", () => {
  it("returns unchanged when under limit", () => {
    expect(truncateResourceBody("abc", "get_skill", "x", 100)).toBe("abc");
  });

  it("returns unchanged when exactly at limit", () => {
    const s = "x".repeat(100);
    expect(truncateResourceBody(s, "get_skill", "x", 100)).toBe(s);
  });

  it("truncates with marker when over limit and marker fits", () => {
    const s = "x".repeat(2000);
    const out = truncateResourceBody(s, "get_skill", "pn-foo", 800);
    expect(out.length).toBeLessThanOrEqual(800);
    expect(out).toContain("Truncated by pn-core-mcp");
    expect(out).toContain("pn-foo");
  });

  it("marker contains both original and target lengths plus the resource kind", () => {
    const s = "y".repeat(5000);
    const out = truncateResourceBody(s, "get_resource", "pn-core://r/x.md", 1000);
    expect(out).toContain("5000 chars");
    expect(out).toContain("→ 1000");
    expect(out).toContain("get_resource");
    expect(out).toContain("pn-core://r/x.md");
  });

  it("falls back to plain slice when maxChars is too small for marker (head < 256)", () => {
    const s = "z".repeat(2000);
    const out = truncateResourceBody(s, "get_skill", "tiny", 100);
    expect(out.length).toBe(100);
    expect(out).not.toContain("Truncated by pn-core-mcp");
    expect(out).toBe("z".repeat(100));
  });
});

describe("maxResourceCharsFromEnv", () => {
  const KEY = "PNCORE_MAX_RESOURCE_CHARS";

  beforeEach(() => {
    delete process.env[KEY];
  });
  afterEach(() => {
    delete process.env[KEY];
  });

  it("returns 150_000 default when env is undefined", () => {
    expect(maxResourceCharsFromEnv({})).toBe(150_000);
  });

  it("returns default when env is non-numeric", () => {
    expect(maxResourceCharsFromEnv({ [KEY]: "abc" })).toBe(150_000);
  });

  it("returns default when env is at or below the 1024 floor", () => {
    expect(maxResourceCharsFromEnv({ [KEY]: "500" })).toBe(150_000);
    expect(maxResourceCharsFromEnv({ [KEY]: "1024" })).toBe(150_000);
  });

  it("returns parsed value when env is above the floor", () => {
    expect(maxResourceCharsFromEnv({ [KEY]: "200000" })).toBe(200_000);
  });

  it("reads from process.env when no env arg is provided", () => {
    process.env[KEY] = "75000";
    expect(maxResourceCharsFromEnv()).toBe(75_000);
  });
});
