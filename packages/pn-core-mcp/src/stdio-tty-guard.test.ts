import { describe, it, expect, vi } from "vitest";
import {
  TTY_USAGE,
  defaultExit,
  exitIfInteractiveStdin,
  isInteractiveStdin,
} from "./stdio-tty-guard.js";

describe("stdio-tty-guard", () => {
  it("treats piped stdin as a host (do not exit)", () => {
    expect(isInteractiveStdin({ isTTY: false }, {})).toBe(false);
    expect(isInteractiveStdin({}, {})).toBe(false);
  });

  it("treats a TTY as interactive", () => {
    expect(isInteractiveStdin({ isTTY: true }, {})).toBe(true);
  });

  it("PNCORE_MCP_ALLOW_TTY=1 keeps a TTY running", () => {
    expect(isInteractiveStdin({ isTTY: true }, { PNCORE_MCP_ALLOW_TTY: "1" })).toBe(false);
  });

  it("exitIfInteractiveStdin writes usage and exits 0 on TTY", () => {
    const writes: string[] = [];
    const exit = vi.fn();
    const asked = exitIfInteractiveStdin(
      { isTTY: true },
      { write: (s) => writes.push(s) },
      {},
      exit
    );
    expect(asked).toBe(true);
    expect(writes.join("")).toContain(TTY_USAGE);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("exitIfInteractiveStdin is a no-op for piped stdin", () => {
    const exit = vi.fn();
    const asked = exitIfInteractiveStdin({ isTTY: false }, { write: () => undefined }, {}, exit);
    expect(asked).toBe(false);
    expect(exit).not.toHaveBeenCalled();
  });

  it("defaultExit calls process.exit", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    defaultExit(0);
    expect(spy).toHaveBeenCalledWith(0);
    spy.mockRestore();
  });
});
