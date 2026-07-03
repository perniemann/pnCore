#!/usr/bin/env node
/**
 * Fails if commit messages in a git range contain Cursor IDE trailers.
 * CI: driven by GITHUB_EVENT_NAME + env. Local: origin/main..HEAD or @{upstream}..HEAD.
 */
import { execFileSync } from "child_process";

function git(argv) {
  return execFileSync("git", argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function forbiddenLine(line) {
  if (/^Made-with:/i.test(line)) return `Made-with: (${line})`;
  if (/^Co-authored-by:.*cursoragent@cursor\.com/i.test(line))
    return `Co-authored-by cursoragent (${line})`;
  if (/^Co-authored-by:.*Cursor\s*<cursor@cursor\.com>/i.test(line))
    return `Co-authored-by Cursor (${line})`;
  return null;
}

/** PR base SHA from GitHub is not always an ancestor of head (rebase/force-push). Use merge-base..head. */
function prRange(baseRaw, headRaw) {
  try {
    git(["rev-parse", "--verify", `${baseRaw}^{commit}`]);
    git(["rev-parse", "--verify", `${headRaw}^{commit}`]);
  } catch {
    console.error(
      "check-commit-no-ide-trailers: PR_BASE or PR_HEAD is not a valid commit in this clone (fetch full history?)"
    );
    process.exit(1);
  }
  try {
    const mb = git(["merge-base", baseRaw, headRaw]);
    return `${mb}..${headRaw}`;
  } catch {
    console.error(
      "check-commit-no-ide-trailers: could not merge-base PR_BASE and PR_HEAD (unrelated histories?)"
    );
    process.exit(1);
  }
}

function rangeForEnv() {
  const event = process.env.GITHUB_EVENT_NAME;
  const inActions = Boolean(process.env.GITHUB_ACTIONS);

  if (event === "pull_request") {
    const base = process.env.PR_BASE?.trim();
    const head = process.env.PR_HEAD?.trim();
    if (base && head) return prRange(base, head);
    // Other workflows (e.g. Sync MCP) inherit GITHUB_EVENT_NAME but do not set PR_*.
    if (inActions) {
      console.warn(
        "check-commit-no-ide-trailers: skip in Actions (no PR_BASE/PR_HEAD; run only in commit-message-policy workflow)"
      );
      process.exit(0);
    }
    console.error("check-commit-no-ide-trailers: missing PR_BASE or PR_HEAD");
    process.exit(1);
  }
  if (event === "push") {
    const before = (process.env.BEFORE ?? "").trim();
    const after = process.env.AFTER?.trim();
    if (after) {
      if (!before || /^0+$/.test(before)) {
        try {
          const om = git(["rev-parse", "origin/main"]);
          return `${om}..${after}`;
        } catch {
          console.warn("check-commit-no-ide-trailers: skip (no origin/main range for push)");
          process.exit(0);
        }
      }
      return `${before}..${after}`;
    }
    // Push event in Actions but no BEFORE/AFTER (validate inside Sync MCP or other jobs).
    if (inActions) {
      console.warn(
        "check-commit-no-ide-trailers: skip in Actions (no BEFORE/AFTER; run only in commit-message-policy workflow)"
      );
      process.exit(0);
    }
    console.error("check-commit-no-ide-trailers: missing AFTER");
    process.exit(1);
  }
  if (process.env.GITHUB_ACTIONS) {
    console.warn("check-commit-no-ide-trailers: skip (unknown event)");
    process.exit(0);
  }
  try {
    const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    const base = git(["merge-base", "HEAD", upstream]);
    return `${base}..HEAD`;
  } catch {
    try {
      const base = git(["merge-base", "HEAD", "origin/main"]);
      return `${base}..HEAD`;
    } catch {
      console.warn("check-commit-no-ide-trailers: skip (no upstream / origin/main)");
      process.exit(0);
    }
  }
}

const range = rangeForEnv();
let shas;
try {
  shas = git(["rev-list", "--reverse", range]).split(/\r?\n/).filter(Boolean);
} catch (e) {
  const after = (process.env.AFTER ?? "").trim();
  if (process.env.GITHUB_EVENT_NAME === "push" && after) {
    console.warn(
      `check-commit-no-ide-trailers: invalid range ${range}; scanning ${after} only (rewritten history?)`
    );
    shas = [after];
  } else {
    console.error("check-commit-no-ide-trailers: git rev-list failed", e?.message ?? e);
    process.exit(1);
  }
}

const bad = [];
for (const sha of shas) {
  let body;
  try {
    body = git(["log", "-1", "--format=%B", sha]);
  } catch (e) {
    console.error("check-commit-no-ide-trailers: git log failed", e?.message ?? e);
    process.exit(1);
  }
  const subject = git(["log", "-1", "--format=%s", sha]);
  for (const line of body.split(/\r?\n/)) {
    const reason = forbiddenLine(line);
    if (reason) bad.push({ sha, subject, reason });
  }
}

if (bad.length) {
  console.error("Commit messages must not include IDE-injected trailers:");
  for (const { sha, subject, reason } of bad) {
    console.error(` - ${sha.slice(0, 7)} ${subject}`);
    console.error(`   ${reason}`);
  }
  console.error("See docs/commits.md; enable: git config core.hooksPath .githooks");
  console.error("In Cursor, keep .cursor/rules/pn-no-cursor-commit-trailers.mdc (alwaysApply).");
  process.exit(1);
}
