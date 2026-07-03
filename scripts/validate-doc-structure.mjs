#!/usr/bin/env node
/**
 * Validates pn-documentation structural rules on changed markdown in a PR diff.
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveDiffRange, listChangedFiles } from "./git-diff-lib.mjs";
import { validateChangedMarkdown } from "./validate-doc-structure-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const { range, skip, reason } = resolveDiffRange();
if (skip) {
  console.log(`validate-doc-structure: skip (${reason ?? "no diff range"})`);
  process.exit(0);
}

const changedFiles = listChangedFiles(range);
const errors = validateChangedMarkdown(repoRoot, changedFiles);

if (errors.length) {
  for (const e of errors) console.error(e);
  console.error("\nRun /pn-document locally or fix structure per pn-documentation skill.");
  process.exit(1);
}

const mdCount = changedFiles.filter((f) => f.endsWith(".md")).length;
console.log(`validate-doc-structure: OK (${mdCount} changed markdown file(s) checked)`);
process.exit(0);
