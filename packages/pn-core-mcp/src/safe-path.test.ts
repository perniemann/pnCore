import { describe, expect, it } from "vitest";
import { resolveSafePath, safeBase } from "./safe-path.js";

describe("safe-path", () => {
  it("accepts paths inside cwd and rejects traversal", () => {
    expect(safeBase).toBe(process.cwd());
    expect("resolved" in resolveSafePath(".pncore/x.jsonl")).toBe(true);
    expect(resolveSafePath("../outside.jsonl")).toEqual({
      error: "Path must be within process cwd",
    });
  });
});
