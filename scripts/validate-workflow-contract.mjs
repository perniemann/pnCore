#!/usr/bin/env node
/**
 * Contract validation for workflow_step: asserts expected structure and behavior
 * for golden states. Run from repo root after build: node scripts/validate-workflow-contract.mjs
 * Exit 0 if all assertions pass; 1 otherwise.
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distWorkflows = join(__dirname, "..", "packages", "pn-core-mcp", "dist", "workflows.js");

if (!existsSync(distWorkflows)) {
  console.error("validate-workflow-contract: dist/workflows.js not found.");
  console.error("Run: npm run build:mcp  (builds packages/pn-core-mcp/dist/ first)");
  process.exit(1);
}

const { getWorkflowStep } = await import(pathToFileURL(distWorkflows).href);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    return false;
  }
  return true;
}

let passed = 0;
let failed = 0;

// design step 0: no state required
const r0 = getWorkflowStep("design", 0, {});
assert(!("error" in r0), "design step 0 should not error");
if (!("error" in r0)) {
  assert(r0.instruction && typeof r0.instruction === "string", "design step 0 returns instruction");
  assert(r0.nextStep === 1, "design step 0 nextStep is 1");
  assert(r0.gate === "human", "design step 0 gate is human");
  passed++;
} else failed++;

// design step 1: requires discoverySpec
const r1fail = getWorkflowStep("design", 1, {});
assert("error" in r1fail, "design step 1 without discoverySpec should error");
if ("error" in r1fail) passed++;
else failed++;

// design step 1: with discoverySpec
const r1 = getWorkflowStep("design", 1, { discoverySpec: "user answers" });
assert(!("error" in r1), "design step 1 with discoverySpec should not error");
if (!("error" in r1)) {
  assert(r1.nextStep === 2, "design step 1 nextStep is 2");
  passed++;
} else failed++;

// design step 5: final step, requires skepticOutputPassed and skepticOutputVerdict
const r5 = getWorkflowStep("design", 5, {
  discoverySpec: "x",
  plan: "y",
  skepticPassed: true,
  skepticVerdict: "z",
  buildComplete: true,
  skepticOutputPassed: true,
  skepticOutputVerdict: "ok",
});
assert(!("error" in r5), "design step 5 with full state should not error");
if (!("error" in r5)) {
  assert(r5.done === true, "design step 5 is done");
  passed++;
} else failed++;

// full_dev step 0
const f0 = getWorkflowStep("full_dev", 0, {});
assert(!("error" in f0), "full_dev step 0 should not error");
if (!("error" in f0)) {
  assert(f0.nextStep === 1, "full_dev step 0 nextStep is 1");
  passed++;
} else failed++;

// prompt_optimize step 0
const p0 = getWorkflowStep("prompt_optimize", 0, {});
assert(!("error" in p0), "prompt_optimize step 0 should not error");
if (!("error" in p0)) passed++;
else failed++;

// frontend_audit step 0: no state required
const fa0 = getWorkflowStep("frontend_audit", 0, {});
assert(!("error" in fa0), "frontend_audit step 0 should not error");
if (!("error" in fa0)) {
  assert(fa0.nextStep === 1, "frontend_audit step 0 nextStep is 1");
  assert(fa0.gate === "human", "frontend_audit step 0 gate is human");
  passed++;
} else failed++;

// frontend_audit step 1: requires scope
const fa1fail = getWorkflowStep("frontend_audit", 1, {});
assert("error" in fa1fail, "frontend_audit step 1 without scope should error");
if ("error" in fa1fail) passed++;
else failed++;

// frontend_audit step 1: with scope
const fa1 = getWorkflowStep("frontend_audit", 1, { scope: "src/app/" });
assert(!("error" in fa1), "frontend_audit step 1 with scope should not error");
if (!("error" in fa1)) {
  assert(fa1.nextStep === 2, "frontend_audit step 1 nextStep is 2");
  passed++;
} else failed++;

// image_create step 0
const ic0 = getWorkflowStep("image_create", 0, {});
assert(!("error" in ic0), "image_create step 0 should not error");
if (!("error" in ic0)) {
  assert(ic0.nextStep === 1, "image_create step 0 nextStep is 1");
  passed++;
} else failed++;

// image_create step 3: skeptic requires generate output
const ic3fail = getWorkflowStep("image_create", 3, {
  specConfirmed: true,
  imageSpec: { format: "png" },
});
assert("error" in ic3fail, "image_create step 3 without imageComplete should error");
if ("error" in ic3fail) passed++;
else failed++;

const ic3 = getWorkflowStep("image_create", 3, {
  imageComplete: true,
  outputPath: "assets/hero.png",
});
assert(!("error" in ic3), "image_create step 3 with imageComplete should not error");
if (!("error" in ic3)) {
  assert(ic3.nextStep === 4, "image_create step 3 nextStep is 4");
  assert(ic3.gate === "human", "image_create step 3 gate is human");
  assert(
    ic3.instruction.includes("pn-skeptic-challenge"),
    "image_create step 3 instruction includes pn-skeptic-challenge"
  );
  passed++;
} else failed++;

// visual_tweak step 0
const vt0 = getWorkflowStep("visual_tweak", 0, {});
assert(!("error" in vt0), "visual_tweak step 0 should not error");
if (!("error" in vt0)) passed++;
else failed++;

// svg_create step 0
const sc0 = getWorkflowStep("svg_create", 0, {});
assert(!("error" in sc0), "svg_create step 0 should not error");
if (!("error" in sc0)) passed++;
else failed++;

// project_kickoff step 0: no state required
const pk0 = getWorkflowStep("project_kickoff", 0, {});
assert(!("error" in pk0), "project_kickoff step 0 should not error");
if (!("error" in pk0)) {
  assert(pk0.nextStep === 1, "project_kickoff step 0 nextStep is 1");
  assert(pk0.gate === "human", "project_kickoff step 0 gate is human");
  passed++;
} else failed++;

// invalid workflow type
const einv = getWorkflowStep("invalid", 0, {});
assert("error" in einv, "invalid workflow type should error");
if ("error" in einv) passed++;
else failed++;

// design step 4 iteration cap: fresh call proceeds normally
const d4fresh = getWorkflowStep("design", 4, { buildComplete: true });
assert(!("error" in d4fresh), "design step 4 fresh should not error");
if (!("error" in d4fresh)) {
  assert(d4fresh.nextStep === 5, "design step 4 fresh nextStep is 5");
  passed++;
} else failed++;

// design step 4: skeptic failed, iteration 0 → loop-back to step 3
const d4fail0 = getWorkflowStep("design", 4, {
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "generic fonts",
  iterationCount: 0,
});
assert(
  !("error" in d4fail0),
  "design step 4 skeptic fail iter 0 should return loop-back, not error"
);
if (!("error" in d4fail0)) {
  assert(d4fail0.nextStep === 3, "design step 4 skeptic fail iter 0 nextStep is 3");
  assert(
    d4fail0.instruction.includes("iterationCount: 1"),
    "design step 4 skeptic fail iter 0 instruction contains iterationCount: 1"
  );
  passed++;
} else failed++;

// design step 4: skeptic failed, iteration 2 → cap error requiring approval
const d4cap = getWorkflowStep("design", 4, {
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "still failing",
  iterationCount: 2,
});
assert("error" in d4cap, "design step 4 skeptic fail iter 2 should require approval (error)");
if ("error" in d4cap) {
  assert(
    d4cap.error.includes("approval_checkpoint"),
    "design step 4 cap error mentions approval_checkpoint"
  );
  passed++;
} else failed++;

// design step 4: skeptic failed, iteration 2, cap approved → loop-back continues
const d4approved = getWorkflowStep("design", 4, {
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "still failing",
  iterationCount: 2,
  iterationCapApproved: true,
  pncoreHumanGateTicket: "ticket-test",
});
assert(!("error" in d4approved), "design step 4 cap approved should return loop-back, not error");
if (!("error" in d4approved)) {
  assert(d4approved.nextStep === 3, "design step 4 cap approved nextStep is 3");
  passed++;
} else failed++;

// engine_feature (unreal) step 0: requires state.engine
const uf0 = getWorkflowStep("engine_feature", 0, { engine: "unreal" });
assert(!("error" in uf0), "engine_feature unreal step 0 should not error");
if (!("error" in uf0)) {
  assert(uf0.nextStep === 1, "engine_feature unreal step 0 nextStep is 1");
  assert(uf0.gate === "human", "engine_feature unreal step 0 gate is human");
  passed++;
} else failed++;

// engine_feature (unreal) step 3: fresh (no skepticOutputPassed) → proceeds to step 4
const uf3fresh = getWorkflowStep("engine_feature", 3, { engine: "unreal", buildComplete: true });
assert(!("error" in uf3fresh), "engine_feature unreal step 3 fresh should not error");
if (!("error" in uf3fresh)) {
  assert(uf3fresh.nextStep === 4, "engine_feature unreal step 3 fresh nextStep is 4");
  passed++;
} else failed++;

// engine_feature (unreal) step 3: skeptic failed, iterationCount:0 → loop-back to step 2
const uf3fail0 = getWorkflowStep("engine_feature", 3, {
  engine: "unreal",
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "Lumen quality incorrect",
  iterationCount: 0,
});
assert(
  !("error" in uf3fail0),
  "engine_feature unreal step 3 skeptic fail iter 0 should return loop-back, not error"
);
if (!("error" in uf3fail0)) {
  assert(uf3fail0.nextStep === 2, "engine_feature unreal step 3 skeptic fail iter 0 nextStep is 2");
  assert(
    uf3fail0.instruction.includes("iterationCount: 1"),
    "engine_feature unreal step 3 skeptic fail iter 0 instruction contains iterationCount: 1"
  );
  passed++;
} else failed++;

// engine_feature (unreal) step 3: skeptic failed, iterationCount:2 → cap error requiring approval
const uf3cap = getWorkflowStep("engine_feature", 3, {
  engine: "unreal",
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "still failing",
  iterationCount: 2,
});
assert(
  "error" in uf3cap,
  "engine_feature unreal step 3 skeptic fail iter 2 should require approval (error)"
);
if ("error" in uf3cap) {
  assert(
    uf3cap.error.includes("approval_checkpoint"),
    "engine_feature unreal step 3 cap error mentions approval_checkpoint"
  );
  passed++;
} else failed++;

// engine_feature (unreal) step 3: cap approved → loop-back continues
const uf3approved = getWorkflowStep("engine_feature", 3, {
  engine: "unreal",
  buildComplete: true,
  skepticOutputPassed: false,
  skepticOutputVerdict: "still failing",
  iterationCount: 2,
  iterationCapApproved: true,
  pncoreHumanGateTicket: "ticket-ue-test",
});
assert(
  !("error" in uf3approved),
  "engine_feature unreal step 3 cap approved should return loop-back, not error"
);
if (!("error" in uf3approved)) {
  assert(uf3approved.nextStep === 2, "engine_feature unreal step 3 cap approved nextStep is 2");
  passed++;
} else failed++;

if (process.exitCode === 1) {
  console.error(`Contract validation failed: ${failed} failure(s)`);
  process.exit(1);
}
console.log(`validate-workflow-contract: ${passed} assertions passed`);
process.exit(0);
