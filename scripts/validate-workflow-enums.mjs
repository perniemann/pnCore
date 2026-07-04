#!/usr/bin/env node
/**
 * Validates workflowType consistency: canonical z.enum in index.ts (workflowTypeEnum)
 * is used by workflow_step, report_usage, gate_log_append, and matches workflows.ts.
 * Internal-only engine types (unreal_feature, godot_feature) may exist in workflows.ts only.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const indexPath = join(repoRoot, "packages", "pn-core-mcp", "src", "index.ts");
const workflowsPath = join(repoRoot, "packages", "pn-core-mcp", "src", "workflows.ts");

const INTERNAL_ONLY = new Set(["unreal_feature", "godot_feature"]);

const src = readFileSync(indexPath, "utf-8").replace(/\r\n/g, "\n");
const wfSrc = readFileSync(workflowsPath, "utf-8").replace(/\r\n/g, "\n");

function extractWorkflowTypeEnum(text) {
  const m = text.match(/const workflowTypeEnum = z\.enum\(\[([\s\S]*?)\]\)/);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

function extractWorkflowTypeUnion(text) {
  const m = text.match(/export type WorkflowType\s*=\s*([\s\S]*?);/);
  if (!m) return null;
  return [...m[1].matchAll(/\|\s*"([^"]+)"/g)].map((x) => x[1]);
}

const enumList = extractWorkflowTypeEnum(src);
if (!enumList || enumList.length === 0) {
  console.error("validate-workflow-enums: Could not extract workflowTypeEnum from index.ts");
  process.exit(1);
}

const unionList = extractWorkflowTypeUnion(wfSrc);
if (!unionList || unionList.length === 0) {
  console.error("validate-workflow-enums: Could not extract WorkflowType union from workflows.ts");
  process.exit(1);
}

const enumSet = new Set(enumList);
const unionSet = new Set(unionList);

for (const t of enumList) {
  if (!unionSet.has(t)) {
    console.error(
      `validate-workflow-enums: workflowTypeEnum entry "${t}" missing from WorkflowType union`
    );
    process.exit(1);
  }
}

const internalInUnion = [...INTERNAL_ONLY].filter((t) => unionSet.has(t));
if (internalInUnion.length !== INTERNAL_ONLY.size) {
  console.error("validate-workflow-enums: expected internal engine types in WorkflowType union:", [
    ...INTERNAL_ONLY,
  ]);
  process.exit(1);
}

for (const t of enumList) {
  if (INTERNAL_ONLY.has(t)) {
    console.error(
      `validate-workflow-enums: internal-only type "${t}" must not appear in workflowTypeEnum`
    );
    process.exit(1);
  }
}

const publicUnion = unionList.filter((t) => !INTERNAL_ONLY.has(t));
if (publicUnion.length !== enumList.length || publicUnion.some((t) => !enumSet.has(t))) {
  console.error(
    "validate-workflow-enums: public WorkflowType members must match workflowTypeEnum exactly"
  );
  console.error("  index.ts:", enumList);
  console.error("  workflows.ts (public):", publicUnion);
  process.exit(1);
}

for (const t of INTERNAL_ONLY) {
  if (!wfSrc.includes(`${t}: withHandoff(`) && !wfSrc.includes(`${t}:`)) {
    console.error(`validate-workflow-enums: internal type "${t}" missing from workflowSteps`);
    process.exit(1);
  }
}

for (const marker of [
  'regTool(\n  "workflow_step"',
  'regTool(\n  "report_usage"',
  'regTool(\n  "gate_log_append"',
  'regTool(\n  "approval_checkpoint"',
]) {
  const idx = src.indexOf(marker);
  if (idx === -1) {
    console.error(`validate-workflow-enums: missing tool block: ${marker}`);
    process.exit(1);
  }
  const slice = src.slice(idx, idx + 2500);
  if (!slice.includes("workflowTypeEnum")) {
    console.error(
      `validate-workflow-enums: expected workflowTypeEnum usage after ${marker.split("\n")[1]}`
    );
    process.exit(1);
  }
}

console.log("validate-workflow-enums: workflow types consistent across index.ts and workflows.ts");
process.exit(0);
