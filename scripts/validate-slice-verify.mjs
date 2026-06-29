#!/usr/bin/env node
/**
 * Validate slice-verify artifact YAML front matter for phased programs.
 *
 * Run: node scripts/validate-slice-verify.mjs [project-path] [--strict-plan]
 *
 * Scans docs/audits/*-verify-*.md and enforces pn-deliver program checks
 * (checker evidence, verify exit codes). With --strict-plan, also requires
 * verify files for slice ids listed in docs/plans/*redo*.md or *-program*.md.
 *
 * Exit 0 when no verify files exist (skip) or all pass; exit 1 on errors.
 */

import { resolve } from "node:path";
import { validateSliceVerifyProject } from "./slice-verify-lib.mjs";

const args = process.argv.slice(2);
const strictPlan = args.includes("--strict-plan");
const pathArg = args.find((a) => !a.startsWith("--")) ?? ".";
const projectPath = resolve(pathArg);

const result = validateSliceVerifyProject(projectPath, { strictPlan });

if (result.skipped) {
  console.log(
    "validate-slice-verify: no docs/audits/*-verify-*.md files; skipping (ok for non-program repos)."
  );
  process.exit(0);
}

if (result.errors.length > 0) {
  console.error("validate-slice-verify: FAILED");
  for (const err of result.errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

console.log(`validate-slice-verify: ok (${result.files.length} file(s) checked)`);
process.exit(0);
