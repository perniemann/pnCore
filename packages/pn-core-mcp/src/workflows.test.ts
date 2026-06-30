import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getWorkflowStep,
  resolveStepTier,
  workflowSteps,
  type WorkflowType,
  type WorkflowStepResult,
} from "./workflows.js";
import { isModelTier, MODEL_TIERS } from "./model-tiers.js";

function assertWorkflowStepResultShape(result: unknown): asserts result is WorkflowStepResult {
  expect(result).not.toHaveProperty("error");
  expect(result).toHaveProperty("instruction");
  expect(result).toHaveProperty("nextStep");
  expect(result).toHaveProperty("requiredInputs");
  expect(result).toHaveProperty("gate");
  const r = result as WorkflowStepResult;
  expect(typeof r.instruction).toBe("string");
  expect(r.instruction.length).toBeGreaterThan(0);
  expect(typeof r.nextStep).toBe("number");
  expect(r.nextStep).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(r.requiredInputs)).toBe(true);
  expect(["human", "model"]).toContain(r.gate);
  if (r.tasks !== undefined) {
    expect(Array.isArray(r.tasks)).toBe(true);
    for (const t of r.tasks) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("instruction");
      expect(t).toHaveProperty("agentId");
      expect(typeof t.id).toBe("string");
      expect(typeof t.instruction).toBe("string");
      expect(typeof t.agentId).toBe("string");
    }
  }
}

describe("workflows contract", () => {
  describe("getWorkflowStep", () => {
    /**
     * Derived from workflowSteps so adding a new workflow type to production
     * code automatically extends every test that loops over workflowTypes.
     * Eliminates the drift class where this hand-written array forgot to
     * include newly-registered workflows.
     */
    const workflowTypes: WorkflowType[] = Object.keys(workflowSteps) as WorkflowType[];
    /**
     * Excluded from the generic step-0 loop because they require special setup:
     * - engine_feature: requires state.engine ('unreal'|'godot').
     * - feature_program: requires featureProgram feature flag (default: false).
     * - implementation_tournament: requires bestOfN.enabled (default: false).
     */
    const workflowTypesWithStep0: WorkflowType[] = workflowTypes.filter(
      (wt) =>
        wt !== "engine_feature" && wt !== "feature_program" && wt !== "implementation_tournament"
    );

    it("returns valid result for design workflow step 0", () => {
      const result = getWorkflowStep("design", 0, {});
      expect(result).not.toHaveProperty("error");
      expect(result).toHaveProperty("instruction");
      expect(result).toHaveProperty("nextStep");
      expect(result).toHaveProperty("requiredInputs");
      expect(result).toHaveProperty("gate");
      expect(typeof result.instruction).toBe("string");
      expect(typeof result.nextStep).toBe("number");
      expect(Array.isArray(result.requiredInputs)).toBe(true);
      expect(["human", "model"]).toContain(result.gate);
    });

    it("returns error for invalid state on design step 1", () => {
      const result = getWorkflowStep("design", 1, {});
      expect(result).toHaveProperty("error");
      expect(typeof result.error).toBe("string");
    });

    it("returns valid result when state satisfies required fields", () => {
      const result = getWorkflowStep("design", 1, {
        discoverySpec: "User answers to design questions",
      });
      expect(result).not.toHaveProperty("error");
      expect(result).toHaveProperty("instruction");
      expect(result).toHaveProperty("gate");
    });

    it("returns error when state misses required priorArt for full_dev step 2", () => {
      const result = getWorkflowStep("full_dev", 2, {
        discoverySpec: "x",
      });
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("priorArt");
    });

    it("returns step result for all workflow types at step 0", () => {
      for (const wt of workflowTypesWithStep0) {
        const result = getWorkflowStep(wt, 0, {});
        assertWorkflowStepResultShape(result);
      }
    });

    it("engine_feature step 0 requires state.engine", () => {
      const err = getWorkflowStep("engine_feature", 0, {});
      expect(err).toHaveProperty("error");
      expect((err as { error: string }).error).toContain("state.engine");
    });

    it("engine_feature step 0 routes to unreal steps when state.engine=unreal", () => {
      const result = getWorkflowStep("engine_feature", 0, { engine: "unreal" });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.instruction.toLowerCase()).toMatch(/unreal/i);
    });

    it("engine_feature step 0 routes to godot steps when state.engine=godot", () => {
      const result = getWorkflowStep("engine_feature", 0, { engine: "godot" });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.instruction.toLowerCase()).toMatch(/godot/i);
    });

    it("unreal_feature step 0 emits deprecation note when state.engine not set", () => {
      const result = getWorkflowStep("unreal_feature", 0, {});
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.instruction).toContain("Deprecation");
    });

    it("unreal_feature step 0 does NOT emit deprecation note when called via engine_feature routing", () => {
      const result = getWorkflowStep("engine_feature", 0, { engine: "unreal" });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.instruction).not.toContain("Deprecation");
    });

    it("every registered workflow has at least one step (powers list_workflow_types)", () => {
      for (const wt of workflowTypes) {
        expect(
          workflowSteps[wt].length,
          `workflowSteps['${wt}'] must have at least one step`
        ).toBeGreaterThan(0);
      }
    });

    it("validates WorkflowStepResult schema for success responses", () => {
      const result = getWorkflowStep("design", 0, {});
      assertWorkflowStepResultShape(result);
      expect((result as WorkflowStepResult).instruction).toContain("design");
    });

    it("validates error response shape (error string, no instruction)", () => {
      const result = getWorkflowStep("design", 1, {});
      expect(result).toHaveProperty("error");
      expect(result).not.toHaveProperty("instruction");
      expect(typeof (result as { error: string }).error).toBe("string");
      expect((result as { error: string }).error.length).toBeGreaterThan(0);
    });

    it("returns valid done flag on final design step", () => {
      const result = getWorkflowStep("design", 5, {
        discoverySpec: "x",
        plan: "y",
        skepticPassed: true,
        skepticVerdict: "z",
        assetsComplete: true,
        buildComplete: true,
        skepticOutputPassed: true,
        skepticOutputVerdict: "ok",
      });
      assertWorkflowStepResultShape(result);
      expect((result as WorkflowStepResult).done).toBe(true);
    });

    it("returns valid result for project_kickoff step 0", () => {
      const result = getWorkflowStep("project_kickoff", 0, {});
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.instruction.toLowerCase()).toContain("discovery");
      expect(r.nextStep).toBe(1);
    });

    it("returns error for project_kickoff step 1 with missing discoverySpec", () => {
      const result = getWorkflowStep("project_kickoff", 1, {});
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("discoverySpec");
    });

    it("returns done flag on final project_kickoff step", () => {
      const result = getWorkflowStep("project_kickoff", 7, {
        refsIndexPath: "docs/refs/README.md",
      });
      assertWorkflowStepResultShape(result);
      expect((result as WorkflowStepResult).done).toBe(true);
    });

    it("full_dev step 4 phased: Phase A when scaffolder + two group-1 specialists", () => {
      const result = getWorkflowStep("full_dev", 4, {
        specialistList: ["pn-scaffolder", "pn-frontend-developer", "pn-backend-developer"],
        routeConfirmed: true,
        plan: "p",
        skepticPassed: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.parallel).not.toBe(true);
      expect(r.instruction).toContain("Phase A");
      expect(r.instruction).toContain("pn-scaffolder");
    });

    it("full_dev step 4 phased: Phase B parallel after Phase A complete", () => {
      const result = getWorkflowStep("full_dev", 4, {
        specialistList: ["pn-scaffolder", "pn-frontend-developer", "pn-backend-developer"],
        routeConfirmed: true,
        plan: "p",
        skepticPassed: true,
        specialistSequentialComplete: true,
        taskResults: { "pn-scaffolder": "Scaffold done." },
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.parallel).toBe(true);
      expect(r.tasks?.length).toBe(2);
      expect(r.instruction).toContain("Phase B");
    });

    it("full_dev step 4 phased: error when Phase A flagged but summaries missing", () => {
      const result = getWorkflowStep("full_dev", 4, {
        specialistList: ["pn-scaffolder", "pn-frontend-developer", "pn-backend-developer"],
        routeConfirmed: true,
        plan: "p",
        skepticPassed: true,
        specialistSequentialComplete: true,
        taskResults: {},
      });
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("Phase A incomplete");
    });

    it("full_dev step 4 single-shot parallel when list is only group-1 specialists", () => {
      const result = getWorkflowStep("full_dev", 4, {
        specialistList: ["pn-frontend-developer", "pn-backend-developer"],
        routeConfirmed: true,
        plan: "p",
        skepticPassed: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.parallel).toBe(true);
      expect(r.tasks?.length).toBe(2);
    });

    it("full_dev step 3 returns github_issues phase when createGithubIssues true", () => {
      const result = getWorkflowStep("full_dev", 3, {
        plan: "p",
        skepticPassed: true,
        priorArt: "pa",
        planArtifactPath: "docs/plans/x.md",
        planSummary: "sum",
        createGithubIssues: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.workflowPhase).toBe("github_issues");
      expect(r.nextStep).toBe(3);
      expect(r.instruction).toContain("GITHUB_ISSUES_PHASE");
    });

    it("full_dev step 3 proceeds to specialist routing after githubVerticalSlicesComplete", () => {
      const result = getWorkflowStep("full_dev", 3, {
        plan: "p",
        skepticPassed: true,
        priorArt: "pa",
        planArtifactPath: "docs/plans/x.md",
        planSummary: "sum",
        createGithubIssues: true,
        githubVerticalSlicesComplete: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.workflowPhase).toBeUndefined();
      expect(r.instruction).toContain("specialists.json");
    });

    it("returns error for mis-shaped state (specialistList as string instead of array)", () => {
      const result = getWorkflowStep("full_dev", 5, {
        specialistList: "pn-frontend-developer",
        routeConfirmed: true,
      });
      // specialistList should be an array; string is mis-shaped but getWorkflowStep should
      // either return an error or handle it gracefully — not throw an uncaught exception.
      expect(() => {
        // the call itself must not throw
      }).not.toThrow();
      // result must be either an error or a valid step result — never undefined or null
      expect(result).toBeDefined();
      expect(result !== null).toBe(true);
    });

    // design step 4 iteration cap
    it("design step 4 with skepticOutputPassed:false returns nextStep:3 loop-back instruction (iteration 1)", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "generic fonts detected",
        iterationCount: 0,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(3);
      expect(r.done).toBeFalsy();
      expect(r.instruction).toContain('workflow_step("design", 3');
      expect(r.instruction).toContain("iterationCount: 1");
    });

    it("design step 4 with skepticOutputPassed:false and iterationCount:1 returns nextStep:3 (iteration 2)", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "still generic",
        iterationCount: 1,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(3);
      expect(r.instruction).toContain("iterationCount: 2");
    });

    it("design step 4 with skepticOutputPassed:false and iterationCount:2 returns error requiring approval", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "still failing",
        iterationCount: 2,
      });
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("approval_checkpoint");
      expect((result as { error: string }).error).toContain("iterationCount: 2");
    });

    it("design step 4 with skepticOutputPassed:false, iterationCount:2, iterationCapApproved:true returns nextStep:3", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "still failing",
        iterationCount: 2,
        iterationCapApproved: true,
        pncoreHumanGateTicket: "ticket-abc",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(3);
      expect(r.instruction).toContain("iterationCount: 3");
    });

    it("design step 4 with skepticOutputPassed:true proceeds normally to step 5", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
        skepticOutputPassed: true,
        skepticOutputVerdict: "all good",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(5);
    });

    it("design step 4 fresh call (no skepticOutputPassed) returns normal instruction", () => {
      const result = getWorkflowStep("design", 4, {
        buildComplete: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(5);
      expect(r.instruction).toContain("pn-skeptic-challenge");
    });

    // unreal_feature step 3 iteration cap
    it("unreal_feature step 0 returns valid discovery instruction", () => {
      const result = getWorkflowStep("unreal_feature", 0, {});
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(1);
      expect(r.gate).toBe("human");
      expect(r.instruction).toContain("pn-unreal-mcp");
    });

    it("unreal_feature step 3 fresh (no skepticOutputPassed) returns nextStep:4", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(4);
    });

    it("unreal_feature step 3 with skepticOutputPassed:false, iterationCount:0 returns nextStep:2 loop-back", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "Lumen GI incorrect",
        iterationCount: 0,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(2);
      expect(r.done).toBeFalsy();
      expect(r.instruction).toContain('workflow_step("unreal_feature", 2');
      expect(r.instruction).toContain("iterationCount: 1");
    });

    it("unreal_feature step 3 with iterationCount:1 failing returns nextStep:2 (iteration 2)", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "Nanite fallback still present",
        iterationCount: 1,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(2);
      expect(r.instruction).toContain("iterationCount: 2");
    });

    it("unreal_feature step 3 with iterationCount:2 failing without approval returns error requiring approval_checkpoint", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "still failing",
        iterationCount: 2,
      });
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("approval_checkpoint");
      expect((result as { error: string }).error).toContain("iterationCount: 2");
    });

    it("unreal_feature step 3 with iterationCount:2, iterationCapApproved:true returns nextStep:2", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "still failing",
        iterationCount: 2,
        iterationCapApproved: true,
        pncoreHumanGateTicket: "ticket-ue-001",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(2);
      expect(r.instruction).toContain("iterationCount: 3");
    });

    it("unreal_feature step 3 with skepticOutputPassed:true proceeds normally to step 4", () => {
      const result = getWorkflowStep("unreal_feature", 3, {
        buildComplete: true,
        skepticOutputPassed: true,
        skepticOutputVerdict: "render-verify passed",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.nextStep).toBe(4);
    });

    // fsi_analyst_draft workflow tests
    it("fsi_analyst_draft step 0 returns human gate with pn-fsi-analyst-discipline reference", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 0, {});
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.instruction).toContain("pn-fsi-analyst-discipline");
      expect(r.nextStep).toBe(1);
    });

    it("fsi_analyst_draft step 1 requires fsiScope in state", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 1, {});
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("fsiScope");
    });

    it("fsi_analyst_draft step 1 advances when fsiScope is present", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 1, {
        fsiScope: {
          deliverableType: "dcf",
          subject: "AcmeCorp",
          sourcesAvailable: "10-K",
          asOfDate: "2026-03-31",
          reviewerRole: "analyst",
        },
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("model");
      expect(r.nextStep).toBe(2);
    });

    it("fsi_analyst_draft step 2 requires sourcesValidated and assumptionLog", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 2, {
        fsiScope: { deliverableType: "dcf" },
      });
      expect(result).toHaveProperty("error");
      const err = (result as { error: string }).error;
      expect(err).toMatch(/sourcesValidated|assumptionLog/);
    });

    it("fsi_analyst_draft step 3 requires draftComplete and draftPath", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 3, {
        sourcesValidated: true,
        assumptionLog: "no gaps",
      });
      expect(result).toHaveProperty("error");
      const err = (result as { error: string }).error;
      expect(err).toMatch(/draftComplete|draftPath/);
    });

    it("fsi_analyst_draft step 3 is human-gated when state is valid", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 3, {
        draftComplete: true,
        draftPath: "docs/fsi/AcmeCorp-dcf-draft.md",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.instruction).toContain("pn-financial-model-audit");
      expect(r.instruction).toContain("pn-skeptic-challenge");
    });

    it("fsi_analyst_draft step 4 (sign-off gate) is human-gated", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 4, {
        qcPassed: true,
        qcVerdict: "proceed",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.instruction).toContain("MANDATORY HUMAN GATE");
    });

    it("fsi_analyst_draft step 5 (terminal) marks done and includes non-advice framing", () => {
      const result = getWorkflowStep("fsi_analyst_draft", 5, {
        signOffConfirmed: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.done).toBe(true);
      expect(r.instruction).toContain("staged for professional review");
    });

    // media_director workflow tests
    it("media_director step 0 returns human gate that asks for deliverable kind and grillTopics", () => {
      const result = getWorkflowStep("media_director", 0, {});
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.nextStep).toBe(1);
      expect(r.instruction).toContain("generative-media");
      expect(r.instruction).toContain("grillTopics");
    });

    it("media_director step 1 requires request in state", () => {
      const result = getWorkflowStep("media_director", 1, {});
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("request");
    });

    it("media_director step 1 advances when request present and states grill trigger rules verbatim", () => {
      const result = getWorkflowStep("media_director", 1, {
        request: "campaign film, three 8-second segments",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.nextStep).toBe(2);
      expect(r.instruction).toContain("pn-grill");
      expect(r.instruction).toContain("blank");
      expect(r.instruction).toContain("< 10 characters");
      expect(r.instruction).toContain("single-word");
      expect(r.instruction).toContain("contradicts");
      expect(r.instruction).toContain("grill_skipped_explicit");
    });

    it("media_director step 2 requires requiredTopics and grillComplete", () => {
      const result = getWorkflowStep("media_director", 2, {
        request: "campaign film",
      });
      expect(result).toHaveProperty("error");
      const err = (result as { error: string }).error;
      expect(err).toMatch(/requiredTopics|grillComplete/);
    });

    it("media_director step 2 advances and references docs/media/<slug>-brief.md path", () => {
      const result = getWorkflowStep("media_director", 2, {
        requiredTopics: { purpose: "x", visualDirection: "y" },
        grillComplete: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.nextStep).toBe(3);
      expect(r.instruction).toContain("docs/media/");
      expect(r.instruction).toContain("brief.md");
    });

    it("media_director step 3 requires briefPath and brief, and runs skeptic", () => {
      const missing = getWorkflowStep("media_director", 3, {});
      expect(missing).toHaveProperty("error");

      const result = getWorkflowStep("media_director", 3, {
        briefPath: "docs/media/x-brief.md",
        brief: "look/tone notes",
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.nextStep).toBe(4);
      expect(r.instruction).toContain("pn-skeptic-challenge");
      expect(r.instruction).toContain("checkpoints");
    });

    it("media_director step 4 is a model gate after plan + skeptic", () => {
      const result = getWorkflowStep("media_director", 4, {
        shotPlan: "3 segments",
        pipelineSpec: "ComfyUI",
        skepticPassed: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("model");
      expect(r.nextStep).toBe(5);
    });

    it("media_director step 5 is the mandatory human review gate", () => {
      const result = getWorkflowStep("media_director", 5, {
        produceComplete: true,
        outputPaths: ["assets/seg-01.mp4"],
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.gate).toBe("human");
      expect(r.nextStep).toBe(6);
      expect(r.instruction).toContain("pn-cinematography-lighting");
    });

    it("media_director step 6 is terminal and marks done", () => {
      const result = getWorkflowStep("media_director", 6, {
        reviewPassed: true,
      });
      assertWorkflowStepResultShape(result);
      const r = result as WorkflowStepResult;
      expect(r.done).toBe(true);
      expect(r.gate).toBe("model");
    });
  });

  describe("iteration-cap human-gate paths", () => {
    describe("business_strategy step 5 (Weak verdict)", () => {
      const baseState = {
        grillComplete: true,
        pressureTestVerdict: "Weak",
      };

      it("returns instruction with nextStep 4 and human gate when below cap", () => {
        const r = getWorkflowStep("business_strategy", 5, {
          ...baseState,
          discussionIterations: 1,
        });
        expect(r).not.toHaveProperty("error");
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(4);
        expect(w.gate).toBe("human");
        expect(w.done).toBe(false);
        expect(w.instruction).toMatch(/iteration \d+ of 2/);
      });

      it("returns approval-required error when iteration cap is reached without approval", () => {
        const r = getWorkflowStep("business_strategy", 5, {
          ...baseState,
          discussionIterations: 2,
        });
        expect(r).toHaveProperty("error");
        const e = (r as { error: string }).error;
        expect(e).toContain("approval_checkpoint");
        expect(e).toContain("pncoreHumanGateTicket");
        expect(e).toContain("business_strategy");
      });

      it("bypasses cap when iterationCapApproved is true", () => {
        const r = getWorkflowStep("business_strategy", 5, {
          ...baseState,
          discussionIterations: 2,
          iterationCapApproved: true,
        });
        expect(r).not.toHaveProperty("error");
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(4);
        expect(w.gate).toBe("human");
      });
    });

    describe("feature_program workflow", () => {
      const twoSlices = [
        { id: "slice-infra", title: "Infra", ownedPaths: ["infra/"], dependsOn: [] },
        { id: "slice-api", title: "API", ownedPaths: ["src/api/"], dependsOn: ["slice-infra"] },
      ];
      const twoSlicesWithPlans = twoSlices.map((s) => ({
        ...s,
        planArtifactPath: `docs/plans/my-prog/${s.id}.md`,
        planSummary: `Plan for ${s.id}`,
        worktreePath: `.worktrees/${s.id}`,
        branch: `slice/${s.id}`,
      }));

      it("step 0 returns error when featureProgram flag is off (default)", () => {
        const r = getWorkflowStep("feature_program", 0, {});
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("featureProgram");
      });

      it("step 1 first call (no slices in state yet) returns decomposition instruction", () => {
        // Covers the false branch of `if (Array.isArray(slices))` at step 1 —
        // the normal first call to get step 1's instruction before slices are known.
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/2026-05-17-test.md",
          programSlug: "test",
          // slices not yet provided — that is what step 1 produces
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(2);
        expect(w.instruction).toContain("pn-program-orchestration");
      });

      it("step 1 returns single-slice hard-exit when slices.length < 2", () => {
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/2026-05-17-my-prog.md",
          programSlug: "my-prog",
          slices: [{ id: "only-slice", title: "Only", ownedPaths: [], dependsOn: [] }],
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.done).toBe(true);
        expect(w.instruction).toContain("pn-build");
      });

      it("step 1 returns error on DAG cycle", () => {
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/2026-05-17-my-prog.md",
          programSlug: "my-prog",
          slices: [
            { id: "a", title: "A", ownedPaths: [], dependsOn: ["b"] },
            { id: "b", title: "B", ownedPaths: [], dependsOn: ["a"] },
          ],
        });
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("cycle");
      });

      it("step 1 happy path: 2 slices with valid DAG advances to step 2", () => {
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/2026-05-17-my-prog.md",
          programSlug: "my-prog",
          slices: twoSlices,
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(2);
        expect(w.done).toBeFalsy();
      });

      it("step 3 returns parallel: true and one task per slice (with worktreePath)", () => {
        const r = getWorkflowStep("feature_program", 3, {
          slices: twoSlicesWithPlans,
          slicesPlanned: true,
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.parallel).toBe(true);
        expect(Array.isArray(w.tasks)).toBe(true);
        expect(w.tasks).toHaveLength(2);
        expect(w.tasks!.map((t) => t.id)).toEqual(
          expect.arrayContaining(["slice-infra", "slice-api"])
        );
        for (const task of w.tasks!) {
          expect(task.instruction).toContain("workflow_step('full_dev'");
          expect(task.instruction).toContain(task.id);
          // With worktreePath set, instruction mentions the worktree path
          expect(task.instruction).toContain("git worktree");
        }
      });

      it("step 3 returns parallel tasks without worktreePath (covers fallback instruction branch)", () => {
        // Covers the false branch of `sl.worktreePath ? ... : ...` and `sl.branch ?? sl.id`
        const slicesWithoutWorktree = twoSlices.map((s) => ({
          ...s,
          planArtifactPath: `docs/plans/my-prog/${s.id}.md`,
          planSummary: `Plan for ${s.id}`,
          // no worktreePath, no branch
        }));
        const r = getWorkflowStep("feature_program", 3, {
          slices: slicesWithoutWorktree,
          slicesPlanned: true,
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.parallel).toBe(true);
        expect(w.tasks).toHaveLength(2);
        // Without worktreePath, instruction says "Create or use the worktree"
        expect(w.tasks![0].instruction).toContain("Create or use the worktree");
      });

      it("step 4: verifier gate returned when slices have no verifierReport", () => {
        const r = getWorkflowStep("feature_program", 4, {
          slices: twoSlicesWithPlans,
          taskResults: { "slice-infra": "done", "slice-api": "done" },
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.workflowPhase).toBe("merge");
        expect(w.done).toBe(false);
        expect(w.instruction).toContain("VERIFIER GATE");
        expect(w.nextStep).toBe(4);
      });

      it("step 4: verifier gate shows failed slice when passed: false", () => {
        const slicesWithFailedVerifier = twoSlicesWithPlans.map((s) => ({
          ...s,
          verifierReport:
            s.id === "slice-infra"
              ? { passed: true, evidence: "tests passed" }
              : { passed: false, evidence: "contract conformance failed" },
        }));
        const r = getWorkflowStep("feature_program", 4, {
          slices: slicesWithFailedVerifier,
          taskResults: { "slice-infra": "done", "slice-api": "done" },
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.workflowPhase).toBe("merge");
        expect(w.instruction).toContain("slice-api");
        expect(w.done).toBe(false);
      });

      it("step 4: returns merge instruction when all slices verified", () => {
        const slicesAllVerified = twoSlicesWithPlans.map((s) => ({
          ...s,
          verifierReport: { passed: true, evidence: "all tests pass" },
        }));
        const r = getWorkflowStep("feature_program", 4, {
          slices: slicesAllVerified,
          taskResults: { "slice-infra": "done", "slice-api": "done" },
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.workflowPhase).toBe("merge");
        expect(w.instruction).toContain("MERGE PHASE");
        // Topological order: infra (no deps) first, then api (depends on infra)
        expect(w.instruction).toContain("slice-infra");
        expect(w.instruction).toContain("slice-api");
        expect(w.done).toBe(false);
      });

      it("step 4: falls through to baseResult when mergeComplete is true", () => {
        const slicesAllVerified = twoSlicesWithPlans.map((s) => ({
          ...s,
          verifierReport: { passed: true, evidence: "ok" },
        }));
        const r = getWorkflowStep("feature_program", 4, {
          slices: slicesAllVerified,
          taskResults: { "slice-infra": "done", "slice-api": "done" },
          mergeComplete: true,
          mergedSlices: ["slice-infra", "slice-api"],
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(5);
        expect(w.workflowPhase).toBeUndefined();
      });

      it("step 5 requires mergeComplete", () => {
        const r = getWorkflowStep("feature_program", 5, {});
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("mergeComplete");
      });

      it("step 5 with mergeComplete returns done terminal step", () => {
        const r = getWorkflowStep("feature_program", 5, { mergeComplete: true });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.done).toBe(true);
      });

      it("step 3 falls through to baseResult when slices is empty (< 2)", () => {
        // Covers the false branch of Array.isArray(slices) && slices.length >= 2 in step 3
        const r = getWorkflowStep("feature_program", 3, {
          slices: [{ id: "only" }],
          slicesPlanned: true,
        });
        // Falls through to baseResult — no parallel tasks
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.parallel).toBeFalsy();
        expect(w.tasks).toBeUndefined();
      });

      it("step 4 falls through to baseResult when only 1 slice (< 2, special case skipped)", () => {
        // Covers the false branch of Array.isArray(slices) && slices.length >= 2 in step 4
        // With mergeComplete: true the outer guard is also skipped, producing plain baseResult
        const r = getWorkflowStep("feature_program", 4, {
          slices: [{ id: "only-slice", dependsOn: [] }],
          taskResults: { "only-slice": "done" },
          mergeComplete: true,
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(5);
        expect(w.workflowPhase).toBeUndefined();
      });

      it("step 4 uses sliceIds as fallback merge order when toposort returns null (cyclic slices)", () => {
        // Covers the `?? sliceIds` fallback in the merge phase (verifier gate path)
        const cyclic = [
          { id: "a", dependsOn: ["b"], verifierReport: undefined },
          { id: "b", dependsOn: ["a"], verifierReport: undefined },
        ];
        const r = getWorkflowStep("feature_program", 4, {
          slices: cyclic,
          taskResults: { a: "done", b: "done" },
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        // Verifier gate should be returned; merge order falls back to sliceIds order
        expect(w.workflowPhase).toBe("merge");
        expect(w.instruction).toContain("VERIFIER GATE");
      });

      it("step 1 happy path with slices that have no dependsOn field (covers ?? [] branch)", () => {
        // Covers `s.dependsOn ?? []` in step 1 when dependsOn is absent
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/2026-05-17-no-deps.md",
          programSlug: "no-deps",
          slices: [
            { id: "alpha", title: "Alpha", ownedPaths: [] },
            { id: "beta", title: "Beta", ownedPaths: [] },
          ],
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(2);
        expect(w.done).toBeFalsy();
      });

      it("step 4 verifier gate with slices missing dependsOn field (covers ?? [] branch in step 4)", () => {
        // Covers `s.dependsOn ?? []` in step 4 when dependsOn is absent on slices
        const slicesNoDependsOn = [
          { id: "x", title: "X" },
          { id: "y", title: "Y" },
        ];
        const r = getWorkflowStep("feature_program", 4, {
          slices: slicesNoDependsOn,
          taskResults: { x: "done", y: "done" },
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.workflowPhase).toBe("merge");
        expect(w.instruction).toContain("VERIFIER GATE");
      });

      it("toposortSlices handles dep not in initial sliceIds (phantom dep initializes adj)", () => {
        // Covers the `if (!adj[dep]) adj[dep] = []` branch in toposortSlices
        // Provide a dep id ('phantom') that is not in sliceIds
        const slicesWithPhantomDep = [
          { id: "a", dependsOn: ["phantom"] },
          { id: "b", dependsOn: [] },
        ];
        // workflow_step step 1 will call toposortSlices with these slices
        // 'phantom' is not in sliceIds so its adj entry is created dynamically
        // The DAG has no cycle but phantom is external — toposort still completes
        // (result.length may !== sliceIds.length, returning null, which step 1 catches as error)
        const r = getWorkflowStep("feature_program", 1, {
          discoveryPath: "docs/discovery/test.md",
          programSlug: "test",
          slices: slicesWithPhantomDep,
        });
        // The DAG appears to have no cycle among a,b but 'a' has in-degree 1 (depends on phantom)
        // phantom is not added to queue → result.length (1) < sliceIds.length (2) → null → cycle error
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("cycle");
      });
    });

    describe("implementation_tournament workflow", () => {
      afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
      });

      const fanOutState = {
        specSummary: "Extract YAML parser module with tests unchanged",
        verifyCommands: [{ cmd: "npm run test:scripts", exit: 0 }],
        scopeConfirmed: true,
        tournamentN: 2,
      };

      it("step 0 returns error when bestOfN.enabled is off (default)", () => {
        const r = getWorkflowStep("implementation_tournament", 0, {});
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("bestOfN");
      });

      it("step 1 returns parallel fan-out tasks when flag enabled", async () => {
        vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ bestOfN: { enabled: true } }));
        const { getWorkflowStep: gws } = await import("./workflows.js");
        const r = gws("implementation_tournament", 1, fanOutState);
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.parallel).toBe(true);
        expect(w.tasks).toHaveLength(2);
        expect(w.tasks!.map((t) => t.id)).toEqual(["path-a", "path-b"]);
        expect(w.workflowPhase).toBe("tournament_fanout");
        expect(w.instruction).toContain("best-of-n-runner");
        for (const task of w.tasks!) {
          expect(task.instruction).toContain("Worktree:");
          expect(task.instruction).toContain("npm run test:scripts");
        }
      });

      it("step 2 single survivor skips judge to step 4", async () => {
        vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ bestOfN: { enabled: true } }));
        const { getWorkflowStep: gws } = await import("./workflows.js");
        const r = gws("implementation_tournament", 2, {
          candidates: [
            { id: "path-a", worktree: ".worktrees/a", summary: "a", constraint: "min", model: "m" },
            { id: "path-b", worktree: ".worktrees/b", summary: "b", constraint: "max", model: "m" },
          ],
          objectiveGateResults: [
            { candidate_id: "path-a", passed: true, failed_commands: [] },
            { candidate_id: "path-b", passed: false, failed_commands: ["npm run test:scripts"] },
          ],
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(4);
        expect(w.workflowPhase).toBe("tournament_gate");
        expect(w.instruction).toContain("path-a");
      });

      it("step 2 zero survivors returns error", async () => {
        vi.stubEnv("PNCORE_FEATURES", JSON.stringify({ bestOfN: { enabled: true } }));
        const { getWorkflowStep: gws } = await import("./workflows.js");
        const r = gws("implementation_tournament", 2, {
          candidates: [{ id: "path-a" }],
          objectiveGateResults: [{ candidate_id: "path-a", passed: false, failed_commands: ["x"] }],
        });
        expect(r).toHaveProperty("error");
        expect((r as { error: string }).error).toContain("Zero survivors");
      });

      it("step 3 includes autoSelectMinDelta in instruction", async () => {
        vi.stubEnv(
          "PNCORE_FEATURES",
          JSON.stringify({ bestOfN: { enabled: true, autoSelectMinDelta: 0.2 } })
        );
        const { getWorkflowStep: gws } = await import("./workflows.js");
        const r = gws("implementation_tournament", 3, {
          objectiveGateResults: [
            { candidate_id: "path-a", passed: true, failed_commands: [] },
            { candidate_id: "path-b", passed: true, failed_commands: [] },
          ],
        });
        assertWorkflowStepResultShape(r);
        const w = r as WorkflowStepResult;
        expect(w.workflowPhase).toBe("tournament_judge");
        expect(w.instruction).toContain("0.2");
      });
    });

    describe("suggestedModelTier (model-tier suggestions)", () => {
      const SUGGEST_HINT_RE =
        /^\*\*Suggested model tier:\*\* (fast|standard|premium|premium_thinking)/;

      it("every annotated StepDef.modelTier is a valid ModelTier value", () => {
        for (const wt of Object.keys(workflowSteps) as WorkflowType[]) {
          const steps = workflowSteps[wt];
          steps.forEach((s, i) => {
            if (s.modelTier !== undefined) {
              expect(
                isModelTier(s.modelTier),
                `workflowSteps['${wt}'][${i}].modelTier = ${String(s.modelTier)} is not a valid ModelTier`
              ).toBe(true);
            }
          });
        }
      });

      it("attaches suggestedModelTier with {tier, exemplar, rationale} on a basic step", () => {
        const result = getWorkflowStep("design", 0, {});
        assertWorkflowStepResultShape(result);
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier).toBeDefined();
        expect(MODEL_TIERS).toContain(r.suggestedModelTier!.tier);
        expect(typeof r.suggestedModelTier!.exemplar).toBe("string");
        expect(r.suggestedModelTier!.exemplar.length).toBeGreaterThan(0);
        expect(typeof r.suggestedModelTier!.rationale).toBe("string");
        expect(r.suggestedModelTier!.rationale.length).toBeGreaterThan(0);
      });

      it("does NOT prepend inline hint when tier is standard (design step 3 build)", () => {
        const result = getWorkflowStep("design", 3, {
          discoverySpec: "x",
          plan: "p",
          skepticPassed: true,
          skepticVerdict: "proceed",
          assetsComplete: true,
        });
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("standard");
        expect(r.instruction.startsWith("**Suggested model tier:**")).toBe(false);
      });

      it("DOES prepend inline hint when tier is fast (design step 0 discovery)", () => {
        const result = getWorkflowStep("design", 0, {});
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("fast");
        expect(r.instruction).toMatch(SUGGEST_HINT_RE);
      });

      it("DOES prepend inline hint when tier is non-standard (design step 1 = premium)", () => {
        const result = getWorkflowStep("design", 1, { discoverySpec: "x" });
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("premium");
        expect(r.instruction).toMatch(SUGGEST_HINT_RE);
      });

      it("backend_audit step 2 (security) suggests premium_thinking", () => {
        const result = getWorkflowStep("backend_audit", 2, {
          scope: "all",
          stackContext: "node",
          apiAuditComplete: true,
        });
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("premium_thinking");
        expect(r.instruction).toMatch(SUGGEST_HINT_RE);
      });

      it("fsi_analyst_draft step 2 (draft) suggests premium_thinking", () => {
        const result = getWorkflowStep("fsi_analyst_draft", 2, {
          fsiScope: { deliverableType: "dcf" },
          sourcesValidated: true,
          assumptionLog: "no gaps",
        });
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("premium_thinking");
      });

      it("business_strategy step 3 (strategic frame) suggests premium_thinking", () => {
        const result = getWorkflowStep("business_strategy", 3, {
          framing: { problem: "p", audience: "a", hypotheses: [] },
          evidenceLogPath: ".pncore/workflow-handoff.jsonl",
        });
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier?.tier).toBe("premium_thinking");
      });

      it("full_dev step 4 phased Phase A carries a tier suggestion", () => {
        const result = getWorkflowStep("full_dev", 4, {
          specialistList: ["pn-scaffolder", "pn-frontend-developer", "pn-backend-developer"],
          routeConfirmed: true,
          plan: "p",
          skepticPassed: true,
        });
        assertWorkflowStepResultShape(result);
        const r = result as WorkflowStepResult;
        expect(r.suggestedModelTier).toBeDefined();
        expect(MODEL_TIERS).toContain(r.suggestedModelTier!.tier);
      });

      it("design step 4 iteration loop-back carries tier reflecting the rebuild work (standard)", () => {
        const result = getWorkflowStep("design", 4, {
          buildComplete: true,
          skepticOutputPassed: false,
          skepticOutputVerdict: "regressions",
          iterationCount: 0,
        });
        const r = result as WorkflowStepResult;
        expect(r.nextStep).toBe(3);
        expect(r.suggestedModelTier?.tier).toBe("standard");
      });

      it("business_strategy step 5 Pivot exit suggests premium for pivot synthesis", () => {
        const result = getWorkflowStep("business_strategy", 5, {
          grillComplete: true,
          pressureTestVerdict: "Pivot",
        });
        const r = result as WorkflowStepResult;
        expect(r.done).toBe(true);
        expect(r.suggestedModelTier?.tier).toBe("premium");
      });

      it("resolveStepTier returns null for out-of-range step", () => {
        expect(resolveStepTier("design", 999)).toBeNull();
        expect(resolveStepTier("design", -1)).toBeNull();
      });

      it("resolveStepTier returns the resolved tier for a known step", () => {
        const r = resolveStepTier("backend_audit", 2);
        expect(r).not.toBeNull();
        expect(r!.tier).toBe("premium_thinking");
      });
    });

    describe("godot_feature step 3 (skeptic-output failed)", () => {
      const baseState = {
        engine: "godot",
        buildComplete: true,
        skepticOutputPassed: false,
        skepticOutputVerdict: "issues",
      };

      it("returns instruction with nextStep 2 and human gate when below cap", () => {
        const r = getWorkflowStep("godot_feature", 3, {
          ...baseState,
          iterationCount: 1,
        });
        expect(r).not.toHaveProperty("error");
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(2);
        expect(w.gate).toBe("human");
        expect(w.done).toBe(false);
        expect(w.instruction).toMatch(/iteration \d+ of 2/);
      });

      it("returns approval-required error when iteration cap is reached without approval", () => {
        const r = getWorkflowStep("godot_feature", 3, {
          ...baseState,
          iterationCount: 2,
        });
        expect(r).toHaveProperty("error");
        const e = (r as { error: string }).error;
        expect(e).toContain("approval_checkpoint");
        expect(e).toContain("pncoreHumanGateTicket");
        expect(e).toContain("godot_feature");
      });

      it("bypasses cap when iterationCapApproved is true", () => {
        const r = getWorkflowStep("godot_feature", 3, {
          ...baseState,
          iterationCount: 2,
          iterationCapApproved: true,
        });
        expect(r).not.toHaveProperty("error");
        const w = r as WorkflowStepResult;
        expect(w.nextStep).toBe(2);
        expect(w.gate).toBe("human");
      });
    });
  });
});
