import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debug, __resetDebugConfigForTests } from "./debug.js";

describe("debug logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetDebugConfigForTests();
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    __resetDebugConfigForTests();
  });

  it("writes nothing when PNCORE_DEBUG is unset", () => {
    vi.stubEnv("PNCORE_DEBUG", "");
    debug("workflows", "should not appear");
    expect(stderrSpy).not.toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("writes a JSON line to stderr (and never stdout) when PNCORE_DEBUG=*", () => {
    vi.stubEnv("PNCORE_DEBUG", "*");
    debug("workflows", "hello");
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();

    const written = String(stderrSpy.mock.calls[0][0]);
    expect(written.endsWith("\n")).toBe(true);
    const obj = JSON.parse(written.trim());
    expect(obj.channel).toBe("workflows");
    expect(obj.msg).toBe("hello");
    expect(typeof obj.ts).toBe("string");
  });

  it("merges extra payload into the JSON line", () => {
    vi.stubEnv("PNCORE_DEBUG", "*");
    debug("tickets", "issued", { ticket: "abc", workflow: "full_dev" });
    const written = String(stderrSpy.mock.calls[0][0]);
    const obj = JSON.parse(written.trim());
    expect(obj.ticket).toBe("abc");
    expect(obj.workflow).toBe("full_dev");
    expect(obj.channel).toBe("tickets");
  });

  it("filters by channel when PNCORE_DEBUG names specific channels", () => {
    vi.stubEnv("PNCORE_DEBUG", "tickets, workflows");
    debug("tickets", "in");
    debug("workflows", "in");
    debug("features", "out");
    expect(stderrSpy).toHaveBeenCalledTimes(2);
    expect(stdoutSpy).not.toHaveBeenCalled();
    const channels = stderrSpy.mock.calls.map((c) => JSON.parse(String(c[0]).trim()).channel);
    expect(channels.sort()).toEqual(["tickets", "workflows"]);
  });

  it("never writes to stdout regardless of channel selection (JSON-RPC framing invariant)", () => {
    for (const setting of ["*", "tickets", "workflows,features", "anything"]) {
      __resetDebugConfigForTests();
      vi.stubEnv("PNCORE_DEBUG", setting);
      debug("tickets", "x");
      debug("workflows", "y");
      debug("features", "z");
    }
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
