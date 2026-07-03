#!/usr/bin/env node
/**
 * Agent-aligned PR review gate: deterministic checks + PR labels/comments.
 * Produces pass/fail for the pn-review CI check; Cloud Agent can override via pn-ready label.
 */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync, execFileSync } from "child_process";
import { resolveDiffRange, listChangedFiles } from "./git-diff-lib.mjs";
import { validateChangedMarkdown } from "./validate-doc-structure-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const HIGH_RISK_RE =
  /\b(auth|rls|payment|secret|password|token|api[_-]?key|credential|jwt|oauth)\b/i;

function gh(args) {
  const r = spawnSync("gh", args, {
    cwd: repoRoot,
    env: { ...process.env, GH_REPO: process.env.GITHUB_REPOSITORY },
    encoding: "utf8",
  });
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function gitDiffLines(range, relPath) {
  try {
    return execFileSync("git", ["diff", "-U0", range, "--", relPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch {
    return "";
  }
}

/** @param {string} diff */
function extractAddedLines(diff) {
  const added = [];
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) added.push(line.slice(1));
  }
  return added;
}

function reviewDiff(changedFiles, range) {
  const findings = [];
  const highRisk = changedFiles.some((f) => HIGH_RISK_RE.test(f));

  for (const file of changedFiles) {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    if (file.startsWith("scripts/")) continue;
    const added = extractAddedLines(gitDiffLines(range, file));
    if (added.length === 0) continue;

    const chunk = added.join("\n");
    if (/console\.(log|debug)\(/.test(chunk)) {
      findings.push(`${file}: added console.log/debug — remove before merge`);
    }
    if (/\bTODO\b(?!\s*\(#\d+\))/i.test(chunk) && !file.includes("__tests__")) {
      findings.push(`${file}: added bare TODO without issue reference`);
    }
  }

  return { findings, highRisk };
}

function setLabels(prNumber, pass) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) return;
  const ready = "pn-ready";
  const blocked = "pn-blocked";
  if (pass) {
    gh(["pr", "edit", String(prNumber), "--remove-label", blocked]);
    gh(["pr", "edit", String(prNumber), "--add-label", ready]);
  } else {
    gh(["pr", "edit", String(prNumber), "--remove-label", ready]);
    gh(["pr", "edit", String(prNumber), "--add-label", blocked]);
  }
}

function postComment(prNumber, body) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) return;
  gh(["pr", "comment", String(prNumber), "--body", body]);
}

const prNumber = process.env.PR_NUMBER?.trim();
const { range, skip, reason } = resolveDiffRange();

if (skip || !range) {
  console.log(`pn-pr-review-gate: skip (${reason ?? "no diff range"})`);
  process.exit(0);
}

const changedFiles = listChangedFiles(range);
const docErrors = validateChangedMarkdown(repoRoot, changedFiles);
const { findings, highRisk } = reviewDiff(changedFiles, range);

const allFindings = [...docErrors, ...findings];
const pass = allFindings.length === 0;

const summary = [
  "## pn-review gate (deterministic)",
  "",
  pass
    ? "**Result: pass** — ready for automerge when CI is green."
    : "**Result: fail** — fix findings below.",
  "",
  highRisk
    ? "> High-risk paths detected (auth/RLS/payments/secrets). Run full `/pn-review` with readonly checker + bugbot per `pn-build-gate`."
    : "> Run `/pn-document` on changed docs and `/pn-review` on the diff for semantic review.",
  "",
];

if (allFindings.length) {
  summary.push("### Findings", ...allFindings.map((f) => `- ${f}`));
} else {
  summary.push("No deterministic findings.");
}

summary.push(
  "",
  "### Cloud Agent (optional full review)",
  "For semantic `pn-review` + `pn-document` coverage, invoke a Cursor Cloud Agent on this PR with:",
  "- `get_command('pn-review')` on the PR diff",
  "- `get_command('pn-document')` compliance on changed README/CHANGELOG/docs",
  "- Apply label `pn-ready` on pass or `pn-blocked` on fail"
);

const body = summary.join("\n");
console.log(body);

if (prNumber) {
  postComment(prNumber, body);
  setLabels(prNumber, pass);
}

if (!pass) {
  process.exit(1);
}

console.log("pn-pr-review-gate: pass");
process.exit(0);
