import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { appendSkillLoadLog, getMcpVersion, MCP_VERSION } from "./tool-runtime.js";

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "pn-runtime-"));
  dirs.push(d);
  return d;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("getMcpVersion", () => {
  it("reads the package version and names each way package.json can be wrong", () => {
    expect(getMcpVersion()).toBe(MCP_VERSION);
    const d = tmp();
    expect(() => getMcpVersion(join(d, "missing.json"))).toThrow(/cannot read package.json/);
    writeFileSync(join(d, "bad.json"), "{");
    expect(() => getMcpVersion(join(d, "bad.json"))).toThrow(/invalid package.json/);
    writeFileSync(join(d, "nov.json"), JSON.stringify({ version: " " }));
    expect(() => getMcpVersion(join(d, "nov.json"))).toThrow(/missing valid 'version'/);
  });
});

describe("appendSkillLoadLog", () => {
  it("appends to PNCORE_SKILL_LOAD_LOG, samples, and never throws", () => {
    const d = tmp();
    const log = join(d, "nested", "loads.jsonl");
    vi.stubEnv("PNCORE_SKILL_LOAD_LOG", log);
    appendSkillLoadLog("get_skill", "pn-tdd", "r1");
    expect(JSON.parse(readFileSync(log, "utf8"))).toMatchObject({
      tool: "get_skill",
      id: "pn-tdd",
      run_id: "r1",
    });

    vi.stubEnv("PNCORE_SKILL_LOG_SAMPLE_RATE", "10");
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    appendSkillLoadLog("get_skill", "pn-skipped");
    expect(readFileSync(log, "utf8")).not.toMatch(/pn-skipped/);

    writeFileSync(join(d, "blocker"), "a file where a folder belongs");
    vi.stubEnv("PNCORE_SKILL_LOAD_LOG", join(d, "blocker", "loads.jsonl"));
    vi.stubEnv("PNCORE_SKILL_LOG_SAMPLE_RATE", "1");
    expect(() => appendSkillLoadLog("get_skill", "pn-tdd")).not.toThrow();
    expect(existsSync(join(d, "blocker", "loads.jsonl"))).toBe(false);
  });
});
