import { describe, it, expect } from "vitest";
import { handleWorkflowStep } from "./handlers.js";

describe("handleWorkflowStep", () => {
  it("defaults omitted state to {} (Pi TypeBox optional state parity)", async () => {
    const result = await handleWorkflowStep({
      workflowType: "design",
      step: 0,
      state: undefined as unknown as Record<string, unknown>,
    });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(typeof parsed.instruction).toBe("string");
    expect(typeof parsed.run_id).toBe("string");
  });
});
