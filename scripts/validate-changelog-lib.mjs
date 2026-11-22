/**
 * CHANGELOG + version bump policy for pnCore releases.
 * Strict: changes under release paths require version bump + CHANGELOG entry.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Everything that ships to a consumer. Directory prefixes end in "/"; files are exact. */
export const RELEASE_PATH_PREFIXES = [
  "packages/pn-core-mcp/content/",
  "packages/pn-core-mcp/src/",
  "packages/pn-core-mcp/dist/",
  "packages/pn-core-mcp/extensions/",
  "plugins/pnCore/",
  ".cursor-plugin/",
  "scripts/install-to-project.mjs",
  "scripts/install-consumer-gating.mjs",
];

const CHANGELOG_REL = "plugins/pnCore/CHANGELOG.md";
const VERSION_ENTRY_RE = /^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}\s*$/;

/** @param {string} file */
export function isReleasePath(file) {
  return RELEASE_PATH_PREFIXES.some((p) =>
    p.endsWith("/") ? file === p.slice(0, -1) || file.startsWith(p) : file === p
  );
}

/** @param {string} v */
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** True when `a` is a strictly higher x.y.z than `b`. @param {string} a @param {string} b */
export function semverGreater(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i];
  }
  return false;
}

/** @param {string} repoRoot */
export function readRootVersion(repoRoot) {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  if (!pkg.version) throw new Error("No version in root package.json");
  return pkg.version;
}

/** @param {string} changelog @param {string} version */
export function hasChangelogEntry(changelog, version) {
  const line = changelog.split(/\r?\n/).find((l) => l.startsWith(`## [${version}]`));
  if (!line) return false;
  return VERSION_ENTRY_RE.test(line);
}

/**
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {string[]} opts.changedFiles
 * @param {string | null} opts.baseVersion from base ref package.json
 * @param {string | null} [opts.baseChangelog] CHANGELOG text at the base ref
 */
export function validateChangelogPolicy({ repoRoot, changedFiles, baseVersion, baseChangelog }) {
  const errors = [];
  const releaseChanges = changedFiles.filter(isReleasePath);

  if (releaseChanges.length === 0) {
    return { errors, skipped: true, reason: "no release-path changes" };
  }

  const headVersion = readRootVersion(repoRoot);
  const versionChanged = baseVersion != null && headVersion !== baseVersion;

  if (!versionChanged) {
    errors.push(
      `Release-path changes require a version bump (root package.json still ${baseVersion ?? "unknown"}). ` +
        `Changed: ${releaseChanges.slice(0, 5).join(", ")}${releaseChanges.length > 5 ? "…" : ""}. ` +
        `Run: npm version patch|minor|major`
    );
  } else if (!semverGreater(headVersion, baseVersion)) {
    errors.push(
      `Version must go up: ${headVersion} is not greater than the base version ${baseVersion}.`
    );
  }

  const changelogPath = join(repoRoot, CHANGELOG_REL);
  if (!existsSync(changelogPath)) {
    errors.push(`Missing ${CHANGELOG_REL}`);
    return { errors, skipped: false };
  }

  const changelog = readFileSync(changelogPath, "utf8");
  if (!hasChangelogEntry(changelog, headVersion)) {
    errors.push(
      `${CHANGELOG_REL} must include "## [${headVersion}] - YYYY-MM-DD" (pn-documentation format)`
    );
  } else if (baseChangelog != null && hasChangelogEntry(baseChangelog, headVersion)) {
    errors.push(
      `${CHANGELOG_REL} already had "## [${headVersion}]" at the base ref; this change needs a new entry.`
    );
  }

  return { errors, skipped: false, headVersion, baseVersion, releaseChanges };
}
