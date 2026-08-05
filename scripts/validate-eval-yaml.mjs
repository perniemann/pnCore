#!/usr/bin/env node
/**
 * Validate EVAL.yaml skill evaluation suites.
 *
 * Errors (exit 1):
 *   - Malformed existing EVAL.yaml (schema / skill id mismatch)
 *   - Newly added SKILL.md in the git diff range without a sibling EVAL.yaml
 *
 * Advisory (printed, non-fatal):
 *   - Count of existing skills still missing EVAL.yaml (backfill over time)
 *
 * Escape: PNCORE_STRICT_EVALS=0 → hard rules become warnings only.
 *
 * Run: node scripts/validate-eval-yaml.mjs
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvalContent } from "./eval-yaml-lib.mjs";
import { git, resolveDiffRange } from "./git-diff-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");
const SKILL_MD_RE = /^packages\/pn-core-mcp\/content\/skills\/[^/]+\/([^/]+)\/SKILL\.md$/;

/**
 * @param {string} dir
 * @param {string} [base]
 * @returns {Generator<{ skillId: string, evalPath: string, hasEval: boolean }>}
 */
function* walkSkills(dir, base = "") {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = base ? join(base, entry.name) : entry.name;
    if (!entry.isDirectory()) continue;
    const skillMd = join(full, "SKILL.md");
    if (existsSync(skillMd)) {
      const evalPath = join(full, "EVAL.yaml");
      yield {
        skillId: entry.name,
        evalPath,
        hasEval: existsSync(evalPath),
      };
    } else {
      yield* walkSkills(full, rel);
    }
  }
}

/** @param {string} range */
function listAddedSkillMdPaths(range) {
  try {
    const added = git(["diff", "--name-only", "--diff-filter=A", range]);
    return added ? added.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function main() {
  if (!existsSync(skillsRoot)) {
    console.error("validate-eval-yaml: skills directory not found:", skillsRoot);
    process.exit(1);
  }

  const soft = process.env.PNCORE_STRICT_EVALS === "0";
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const advisories = [];
  let totalSkills = 0;
  let withEval = 0;

  /** @type {Map<string, boolean>} */
  const hasEvalById = new Map();

  for (const { skillId, evalPath, hasEval } of walkSkills(skillsRoot)) {
    totalSkills++;
    hasEvalById.set(skillId, hasEval);
    if (!hasEval) continue;
    withEval++;
    const rel = evalPath.slice(repoRoot.length + 1).replace(/\\/g, "/");
    const text = readFileSync(evalPath, "utf8");
    for (const e of validateEvalContent(text, rel, { expectedSkillId: skillId })) {
      errors.push(e);
    }
  }

  const { range, skip, reason } = resolveDiffRange();
  if (!skip && range) {
    for (const f of listAddedSkillMdPaths(range)) {
      const norm = f.replace(/\\/g, "/");
      const m = norm.match(SKILL_MD_RE);
      if (!m) continue;
      const skillId = m[1];
      if (!hasEvalById.get(skillId)) {
        errors.push(
          `${norm}: new skill missing sibling EVAL.yaml (npm run scaffold:eval -- ${skillId})`
        );
      }
    }
  } else if (skip) {
    advisories.push(`new-skill EVAL gate skipped (${reason ?? "no diff range"})`);
  }

  const missing = totalSkills - withEval;
  advisories.push(
    `${missing} skill(s) have no EVAL.yaml — advisory backfill; required for newly added skills`
  );

  for (const a of advisories) console.warn("  WARN:", a);

  if (errors.length) {
    console[soft ? "warn" : "error"](
      `validate-eval-yaml: ${errors.length} ${soft ? "warning(s)" : "error(s)"}:`
    );
    for (const e of errors) {
      console[soft ? "warn" : "error"](soft ? `  WARN: ${e}` : `  ERR: ${e}`);
    }
    if (!soft) process.exit(1);
  }

  console.log(
    `validate-eval-yaml: OK (${withEval} EVAL.yaml checked, ${missing} missing — advisory; new skills must include EVAL.yaml)`
  );
  process.exit(0);
}

main();
