#!/usr/bin/env node
/**
 * Shared git diff range helpers for PR/push validators.
 * Mirrors range logic from check-commit-no-ide-trailers.mjs.
 */
import { execFileSync } from "child_process";

/** @param {string[]} argv */
export function git(argv) {
  return execFileSync("git", argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function prRange(baseRaw, headRaw) {
  git(["rev-parse", "--verify", `${baseRaw}^{commit}`]);
  git(["rev-parse", "--verify", `${headRaw}^{commit}`]);
  const mb = git(["merge-base", baseRaw, headRaw]);
  return `${mb}..${headRaw}`;
}

function isValidRevRange(range) {
  try {
    git(["rev-list", "-1", range]);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} before @param {string} after */
function pushRange(before, after) {
  if (!before || /^0+$/.test(before)) {
    try {
      const om = git(["rev-parse", "origin/main"]);
      const range = `${om}..${after}`;
      if (isValidRevRange(range)) return range;
    } catch {
      /* fall through */
    }
  } else {
    const range = `${before}..${after}`;
    if (isValidRevRange(range)) return range;
  }
  try {
    const parent = git(["rev-parse", `${after}^`]);
    const range = `${parent}..${after}`;
    if (isValidRevRange(range)) return range;
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * @returns {{ range: string | null, skip: boolean, reason?: string }}
 */
export function resolveDiffRange() {
  const event = process.env.GITHUB_EVENT_NAME;
  const inActions = Boolean(process.env.GITHUB_ACTIONS);

  if (event === "pull_request") {
    const base = process.env.PR_BASE?.trim();
    const head = process.env.PR_HEAD?.trim();
    if (base && head) return { range: prRange(base, head), skip: false };
    if (inActions) {
      return { range: null, skip: true, reason: "no PR_BASE/PR_HEAD in Actions" };
    }
    throw new Error("git-diff-lib: missing PR_BASE or PR_HEAD");
  }

  if (event === "push") {
    const before = (process.env.BEFORE ?? "").trim();
    const after = process.env.AFTER?.trim();
    if (after) {
      const range = pushRange(before, after);
      if (range) return { range, skip: false };
      return { range: null, skip: true, reason: "invalid push range (force-push without parent?)" };
    }
    if (inActions) {
      return { range: null, skip: true, reason: "no BEFORE/AFTER in Actions push" };
    }
    throw new Error("git-diff-lib: missing AFTER");
  }

  if (process.env.GITHUB_ACTIONS) {
    return { range: null, skip: true, reason: "unknown GitHub event" };
  }

  try {
    const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    const base = git(["merge-base", "HEAD", upstream]);
    return { range: `${base}..HEAD`, skip: false };
  } catch {
    try {
      const base = git(["merge-base", "HEAD", "origin/main"]);
      return { range: `${base}..HEAD`, skip: false };
    } catch {
      return { range: null, skip: true, reason: "no upstream / origin/main" };
    }
  }
}

/** @param {string} range */
export function listChangedFiles(range) {
  const out = git(["diff", "--name-only", "--diff-filter=ACMR", range]);
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

/** @param {string} ref @param {string} relPath */
export function readFileAtRef(ref, relPath) {
  try {
    return git(["show", `${ref}:${relPath}`]);
  } catch {
    return null;
  }
}

/** @param {string} range */
export function baseRefFromRange(range) {
  const idx = range.indexOf("..");
  if (idx === -1) throw new Error(`invalid range: ${range}`);
  return range.slice(0, idx);
}
