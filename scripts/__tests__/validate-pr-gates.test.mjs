/**
 * Unit tests for validate-changelog-lib.mjs and validate-doc-structure-lib.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasChangelogEntry,
  isReleasePath,
  validateChangelogPolicy,
} from "../validate-changelog-lib.mjs";
import {
  checkHeadingHierarchy,
  checkChangelogSections,
  checkDatedFilename,
  validateMarkdownStructure,
} from "../validate-doc-structure-lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("isReleasePath matches content and plugin paths", () => {
  assert.equal(isReleasePath("packages/pn-core-mcp/content/commands/pn-review.md"), true);
  assert.equal(isReleasePath("packages/pn-core-mcp/src/index.ts"), true);
  assert.equal(isReleasePath("plugins/pnCore/README.md"), true);
  assert.equal(isReleasePath("docs/commits.md"), false);
});

test("hasChangelogEntry accepts pn-documentation format", () => {
  const cl = "## [0.14.6] - 2026-06-22\n\n### Added\n\n- item\n";
  assert.equal(hasChangelogEntry(cl, "0.14.6"), true);
  assert.equal(hasChangelogEntry(cl, "0.14.7"), false);
  assert.equal(hasChangelogEntry("## [0.14.6] - bad-date\n", "0.14.6"), false);
});

test("validateChangelogPolicy requires bump for release-path changes", () => {
  const { errors } = validateChangelogPolicy({
    repoRoot,
    changedFiles: ["packages/pn-core-mcp/content/foo.md"],
    baseVersion: "0.14.6",
  });
  assert.ok(errors.some((e) => e.includes("version bump")));
});

test("checkHeadingHierarchy detects skipped levels", () => {
  const md = "# Title\n\n### Skipped h2\n";
  const errors = checkHeadingHierarchy(md, "test.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /skipped heading level/);
});

test("checkChangelogSections rejects unknown sections", () => {
  const md = "## [1.0.0] - 2026-01-01\n\n### Misc\n\n- x\n";
  const errors = checkChangelogSections(md, "CHANGELOG.md");
  assert.ok(errors.some((e) => e.includes("Misc")));
});

test("checkDatedFilename enforces YYYY-MM-DD slug", () => {
  assert.equal(checkDatedFilename("docs/plans/bad-name.md").length, 1);
  assert.equal(checkDatedFilename("docs/plans/2026-07-03-feature.md").length, 0);
});

test("validateMarkdownStructure passes valid plan path", () => {
  const md = "# Plan\n\n## Goal\n\nText.\n";
  const errors = validateMarkdownStructure("docs/plans/2026-07-03-feature.md", md);
  assert.deepEqual(errors, []);
});
