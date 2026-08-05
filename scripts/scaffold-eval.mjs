#!/usr/bin/env node
/**
 * Scaffold EVAL.yaml for a skill (does not overwrite).
 *
 * Usage: node scripts/scaffold-eval.mjs <skill-id-or-path>
 * Example: node scripts/scaffold-eval.mjs pn-tdd
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");

/**
 * @param {string} dir
 * @param {string} skillId
 * @returns {string|null}
 */
function findSkillDir(dir, skillId) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name === skillId && existsSync(join(full, "SKILL.md"))) return full;
    const nested = findSkillDir(full, skillId);
    if (nested) return nested;
  }
  return null;
}

/**
 * @param {string} skillId
 */
function template(skillId) {
  return `# Evaluation suite for ${skillId}
# Convention: pn-core://reference/eval-convention.md
# Scaffolded by: npm run scaffold:eval -- ${skillId}

skill: ${skillId}
# owner: optional-maintainer-handle

scenarios:
  - id: without-skill-baseline
    prompt: "Describe a task where this skill should change agent behavior."
    expectation: "Agent violates the skill's core rule or omits the required structure."
    without_skill: true
    quadrant: inaccurate_inefficient

  - id: with-skill-compliance
    prompt: "Same task as without-skill-baseline, with ${skillId} loaded."
    expectation: "Agent follows the skill's required sections and verification steps."
    with_skill: true
    quadrant: accurate_efficient
`;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/scaffold-eval.mjs <skill-id-or-path>");
    process.exit(1);
  }

  let skillDir;
  let skillId;
  const asPath = resolve(process.cwd(), arg);
  if (existsSync(join(asPath, "SKILL.md"))) {
    skillDir = asPath;
    skillId = basename(asPath);
  } else if (existsSync(join(asPath)) && basename(asPath) === "SKILL.md") {
    skillDir = dirname(asPath);
    skillId = basename(skillDir);
  } else {
    skillId = arg.replace(/\/$/, "");
    skillDir = findSkillDir(skillsRoot, skillId);
  }

  if (!skillDir) {
    console.error(`scaffold-eval: skill not found: ${arg}`);
    process.exit(1);
  }

  const out = join(skillDir, "EVAL.yaml");
  if (existsSync(out)) {
    console.error(`scaffold-eval: REFUSE overwrite — ${out} already exists`);
    process.exit(1);
  }

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(out, template(skillId), "utf8");
  console.log(`scaffold-eval: wrote ${out.slice(repoRoot.length + 1)}`);
  console.log("Next: fill in prompts/expectations, then run `npm run sync:content`.");
}

main();
