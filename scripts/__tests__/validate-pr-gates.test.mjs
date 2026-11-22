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
  readRootVersion,
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
  const headVersion = readRootVersion(repoRoot);
  const { errors } = validateChangelogPolicy({
    repoRoot,
    changedFiles: ["packages/pn-core-mcp/content/foo.md"],
    baseVersion: headVersion,
  });
  assert.ok(errors.some((e) => e.includes("version bump")));
});

test("checkHeadingHierarchy detects skipped levels", () => {
  const md = "# Title\n\n### Skipped h2\n";
  const errors = checkHeadingHierarchy(md, "test.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /skipped heading level/);
});

test("checkHeadingHierarchy ignores ATX headings inside fenced examples", () => {
  const md = [
    "# Skill",
    "## Instructions",
    "### 8. Write the document",
    "#### Post-build program boundary",
    "",
    "```markdown",
    "## Post-build (program end)",
    "```",
    "",
    "#### Operating model",
    "",
    "## Output",
    "",
  ].join("\n");
  const errors = checkHeadingHierarchy(md, "skill.md");
  assert.deepEqual(errors, []);
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

test("semverGreater orders x.y.z and rejects equal or lower", async () => {
  const { semverGreater } = await import("../validate-changelog-lib.mjs");
  assert.equal(semverGreater("0.23.1", "0.23.0"), true);
  assert.equal(semverGreater("0.24.0", "0.23.9"), true);
  assert.equal(semverGreater("0.23.0", "0.23.0"), false);
  assert.equal(semverGreater("0.22.9", "0.23.0"), false);
  assert.equal(semverGreater("bad", "0.1.0"), false);
});

test("release paths include dist, extensions and installer scripts", () => {
  assert.equal(isReleasePath("packages/pn-core-mcp/dist/index.js"), true);
  assert.equal(isReleasePath("packages/pn-core-mcp/extensions/pn-core.ts"), true);
  assert.equal(isReleasePath("scripts/install-to-project.mjs"), true);
  assert.equal(isReleasePath("scripts/install-to-project.mjs.bak"), false);
  assert.equal(isReleasePath("scripts/run-pn-gates.mjs"), false);
});

test("validateChangelogPolicy refuses a downgrade and a reused CHANGELOG heading", () => {
  const headVersion = readRootVersion(repoRoot);
  const [maj, min, pat] = headVersion.split(".").map(Number);
  const higher = `${maj}.${min}.${pat + 1}`;
  const down = validateChangelogPolicy({
    repoRoot,
    changedFiles: ["packages/pn-core-mcp/src/index.ts"],
    baseVersion: higher,
  });
  assert.ok(down.errors.some((e) => e.includes("must go up")));
  const reused = validateChangelogPolicy({
    repoRoot,
    changedFiles: ["packages/pn-core-mcp/src/index.ts"],
    baseVersion: "0.0.1",
    baseChangelog: `## [${headVersion}] - 2026-01-01\n`,
  });
  assert.ok(reused.errors.some((e) => e.includes("already had")));
});
