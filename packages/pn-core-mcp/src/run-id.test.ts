import { describe, expect, it } from "vitest";
import { resolveWorkflowRunId } from "./run-id.js";

describe("resolveWorkflowRunId", () => {
  it("returns trimmed state.run_id when set", () => {
    expect(resolveWorkflowRunId({ run_id: "  abc  " })).toBe("abc");
  });

  it("prefers state.run_id over state.pncoreRunId", () => {
    expect(resolveWorkflowRunId({ run_id: "first", pncoreRunId: "second" })).toBe("first");
  });

  it("falls back to state.pncoreRunId when run_id is absent", () => {
    expect(resolveWorkflowRunId({ pncoreRunId: "xyz" })).toBe("xyz");
  });

  it("falls back to pncoreRunId when run_id is whitespace-only", () => {
    expect(resolveWorkflowRunId({ run_id: "   ", pncoreRunId: "xyz" })).toBe("xyz");
  });

  it("ignores non-string run_id values and falls back", () => {
    expect(resolveWorkflowRunId({ run_id: 42, pncoreRunId: "xyz" })).toBe("xyz");
  });

  it("returns a fresh UUID when no run id is provided", () => {
    const id = resolveWorkflowRunId({});
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns a fresh UUID when both run id fields are empty strings", () => {
    const id = resolveWorkflowRunId({ run_id: "", pncoreRunId: "" });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
