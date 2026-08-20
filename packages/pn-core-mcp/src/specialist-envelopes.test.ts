import { describe, expect, it } from "vitest";
import { isSafeRelPath, validateTaskResults } from "./specialist-envelopes.js";

const ok = {
  kind: "specialist" as const,
  specialistId: "pn-frontend-developer",
  run_id: "run-1",
  summary: "built ui",
  filesTouched: ["src/a.ts"],
};

describe("specialist envelopes", () => {
  it("accepts a valid pn-* envelope", () => {
    expect(validateTaskResults({ "pn-frontend-developer": ok })).toEqual({ ok: true });
  });

  it("rejects an invalid object for pn-* keys", () => {
    const r = validateTaskResults({ "pn-frontend-developer": { kind: "nope" } });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("not a valid specialist envelope");
  });

  it("rejects a string for pn-* keys", () => {
    const r = validateTaskResults({ "pn-frontend-developer": "did stuff" });
    expect(r).toHaveProperty("error");
    expect(String((r as { error: string }).error)).toContain("envelope");
  });

  it("rejects specialistId mismatch and unsafe paths", () => {
    const mismatch = validateTaskResults({
      "pn-frontend-developer": { ...ok, specialistId: "other" },
    });
    expect(mismatch).toHaveProperty("error");
    const unsafe = validateTaskResults({
      "pn-frontend-developer": { ...ok, filesTouched: ["../etc/passwd"] },
    });
    expect(unsafe).toHaveProperty("error");
  });

  it("allows non-pn string summaries and envelope objects", () => {
    expect(
      validateTaskResults({
        implementation_tournament: "merged",
        slice_a: { ...ok, specialistId: "slice_a" },
      })
    ).toEqual({ ok: true });
  });

  it("rejects empty strings and invalid objects on non-pn keys", () => {
    expect(validateTaskResults({ slice_a: "  " })).toHaveProperty("error");
    expect(validateTaskResults({ slice_a: { nope: true } })).toHaveProperty("error");
    expect(
      validateTaskResults({
        slice_a: { ...ok, specialistId: "slice_a", filesTouched: ["/abs"] },
      })
    ).toHaveProperty("error");
  });

  it("classifies relative paths", () => {
    expect(isSafeRelPath("src/a.ts")).toBe(true);
    expect(isSafeRelPath("../x")).toBe(false);
    expect(isSafeRelPath("/abs")).toBe(false);
    expect(isSafeRelPath("a\\b")).toBe(false);
    expect(isSafeRelPath("a/\0b")).toBe(false);
    expect(isSafeRelPath("./x")).toBe(false);
  });
});
