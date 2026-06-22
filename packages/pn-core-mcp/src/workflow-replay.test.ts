import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getWorkflowStep, type WorkflowStepResult } from "./workflows.js";

const here = dirname(fileURLToPath(import.meta.url));
const replay = JSON.parse(
  readFileSync(join(here, "fixtures", "workflow-replay.json"), "utf-8")
) as {
  workflowType: "full_dev";
  step: number;
  state: Record<string, unknown>;
  expectWorkflowPhase?: string;
  expectInstructionContains?: string;
}[];

describe("workflow replay fixtures", () => {
  replay.forEach((c, i) => {
    it(`full_dev fixture ${i}`, () => {
      const r = getWorkflowStep(c.workflowType, c.step, c.state);
      expect(r).not.toHaveProperty("error");
      const w = r as WorkflowStepResult;
      if (c.expectWorkflowPhase) expect(w.workflowPhase).toBe(c.expectWorkflowPhase);
      if (c.expectInstructionContains) expect(w.instruction).toContain(c.expectInstructionContains);
    });
  });
});
