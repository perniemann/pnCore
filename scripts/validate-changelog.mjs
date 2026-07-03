#!/usr/bin/env node
/**
 * Validates version bump + CHANGELOG entry when release paths change.
 * Strict pnCore policy: content/src/plugin edits require semver bump + dated entry.
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  resolveDiffRange,
  listChangedFiles,
  baseRefFromRange,
  readFileAtRef,
} from "./git-diff-lib.mjs";
import { validateChangelogPolicy, readRootVersion } from "./validate-changelog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

let changedFiles = [];
let baseVersion = null;

const { range, skip, reason } = resolveDiffRange();
if (skip) {
  console.log(`validate-changelog: skip (${reason ?? "no diff range"})`);
  process.exit(0);
}

changedFiles = listChangedFiles(range);
const baseRef = baseRefFromRange(range);
const basePkg = readFileAtRef(baseRef, "package.json");
if (basePkg) {
  try {
    baseVersion = JSON.parse(basePkg).version ?? null;
  } catch {
    baseVersion = null;
  }
}

const { errors, skipped } = validateChangelogPolicy({ repoRoot, changedFiles, baseVersion });

if (skipped) {
  console.log("validate-changelog: no release-path changes — OK");
  process.exit(0);
}

if (errors.length) {
  for (const e of errors) console.error(e);
  console.error("\nSee docs/commits.md § Version bumps and PR automerge.");
  process.exit(1);
}

console.log(
  `validate-changelog: OK (v${readRootVersion(repoRoot)}, ${changedFiles.filter((f) => f.startsWith("plugins/pnCore/CHANGELOG")).length ? "CHANGELOG updated" : "entry present"})`
);
process.exit(0);
