import { describe, expect, it } from "vitest";
import { resolveWorkflowRunId } from "./run-id.js";

describe("resolveWorkflowRunId", () => {
  it("returns trimmed state.run_id when set", () => {
    expect(resolveWorkflowRunId({ run_id: "  abc  " })).toBe("abc");
  });

  it("ignores non-string run_id values and generates UUID", () => {
    const id = resolveWorkflowRunId({ run_id: 42 });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns a fresh UUID when no run id is provided", () => {
    const id = resolveWorkflowRunId({});
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns a fresh UUID when run_id is empty or whitespace-only", () => {
    for (const run_id of ["", "   "]) {
      const id = resolveWorkflowRunId({ run_id });
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });
});
