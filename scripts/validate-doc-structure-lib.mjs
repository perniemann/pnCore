/**
 * Structural pn-documentation checks on markdown files.
 */
import { readFileSync } from "fs";

const DATED_DOC_DIRS = ["docs/discovery/", "docs/plans/", "docs/research/", "docs/svg/"];
const DATED_NAME_RE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const CHANGELOG_SECTIONS = new Set(["Added", "Changed", "Fixed", "Removed", "Security"]);

/** @param {string} relPath */
export function isDatedDocPath(relPath) {
  return DATED_DOC_DIRS.some((d) => relPath.startsWith(d));
}

/** @param {string} content @param {string} relPath */
export function checkHeadingHierarchy(content, relPath) {
  const errors = [];
  let prevLevel = 0;
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^(#{1,6})\s+/);
    if (!m) continue;
    const level = m[1].length;
    if (prevLevel === 0) {
      prevLevel = level;
      continue;
    }
    if (level > prevLevel + 1) {
      errors.push(`${relPath}: skipped heading level (h${prevLevel} → h${level}): ${line.trim()}`);
    }
    prevLevel = level;
  }
  return errors;
}

/** @param {string} relPath */
export function checkDatedFilename(relPath) {
  const parts = relPath.split("/");
  const name = parts[parts.length - 1];
  if (!DATED_NAME_RE.test(name)) {
    return [`${relPath}: filename must match YYYY-MM-DD-<slug>.md (pn-documentation)`];
  }
  return [];
}

/** @param {string} content @param {string} relPath */
export function checkChangelogSections(content, relPath) {
  const errors = [];
  let inVersion = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/.test(line)) {
      inVersion = true;
      continue;
    }
    if (/^## /.test(line)) {
      inVersion = line.startsWith("## [Unreleased]");
      continue;
    }
    if (!inVersion) continue;
    const sec = line.match(/^### ([A-Za-z]+)\s*$/);
    if (sec && !CHANGELOG_SECTIONS.has(sec[1])) {
      errors.push(
        `${relPath}: invalid CHANGELOG section "### ${sec[1]}" — use Added/Changed/Fixed/Removed/Security`
      );
    }
  }
  return errors;
}

/**
 * @param {string} relPath
 * @param {string} content
 */
export function validateMarkdownStructure(relPath, content) {
  const errors = [];
  errors.push(...checkHeadingHierarchy(content, relPath));

  if (relPath.endsWith("CHANGELOG.md")) {
    errors.push(...checkChangelogSections(content, relPath));
  }

  if (isDatedDocPath(relPath)) {
    errors.push(...checkDatedFilename(relPath));
  }

  return errors;
}

/**
 * @param {string} repoRoot
 * @param {string[]} changedFiles
 */
export function validateChangedMarkdown(repoRoot, changedFiles) {
  const errors = [];
  const mdFiles = changedFiles.filter((f) => f.endsWith(".md"));

  for (const relPath of mdFiles) {
    let content;
    try {
      content = readFileSync(`${repoRoot}/${relPath}`, "utf8");
    } catch {
      errors.push(`${relPath}: could not read file`);
      continue;
    }
    errors.push(...validateMarkdownStructure(relPath, content));
  }

  return errors;
}
