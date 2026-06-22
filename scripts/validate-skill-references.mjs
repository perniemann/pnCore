#!/usr/bin/env node
/**
 * Flags skills not referenced by any agent, command, rule, workflow, config, or other skill.
 * Default: informational only (exit 0 always).
 * Strict mode: set PNCORE_STRICT_ORPHANS=1 to exit non-zero on any orphan.
 * Run from repo root: node scripts/validate-skill-references.mjs
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { contentRoot, walkSkills } from "./validate-helpers.mjs";

const repoRoot = join(contentRoot, "..", "..", "..");

// Match pn-<id> (skill/agent/rule identifiers) in text
const PN_ID_RE = /pn-[a-z0-9-]+/g;

function collectIdsFromText(text) {
  const ids = new Set();
  let m;
  while ((m = PN_ID_RE.exec(text)) !== null) ids.add(m[0]);
  return ids;
}

function collectIdsFromFile(path) {
  if (!existsSync(path)) return new Set();
  try {
    return collectIdsFromText(readFileSync(path, "utf-8"));
  } catch {
    return new Set();
  }
}

function* walkMdFiles(dir, ext = ".md") {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (f.endsWith(ext)) yield join(dir, f);
  }
}

function* walkMdcFiles(dir) {
  yield* walkMdFiles(dir, ".mdc");
}

function main() {
  const skillIds = new Set(walkSkills(contentRoot));
  const referenced = new Set();

  // Agents
  const agentsDir = join(contentRoot, "agents");
  for (const p of walkMdFiles(agentsDir)) {
    for (const id of collectIdsFromFile(p)) referenced.add(id);
  }

  // Commands
  const commandsDir = join(contentRoot, "commands");
  for (const p of walkMdFiles(commandsDir)) {
    for (const id of collectIdsFromFile(p)) referenced.add(id);
  }

  // Rules
  const rulesDir = join(contentRoot, "rules");
  for (const p of walkMdcFiles(rulesDir)) {
    for (const id of collectIdsFromFile(p)) referenced.add(id);
  }

  // Skills (skills can reference other skills)
  for (const id of skillIds) {
    const catDir = join(contentRoot, "skills");
    for (const cat of readdirSync(catDir, { withFileTypes: true })) {
      if (!cat.isDirectory()) continue;
      const skillPath = join(catDir, cat.name, id, "SKILL.md");
      if (existsSync(skillPath)) {
        for (const ref of collectIdsFromFile(skillPath)) referenced.add(ref);
        // Also check reference.md in same folder
        const refPath = join(catDir, cat.name, id, "reference.md");
        if (existsSync(refPath)) {
          for (const ref of collectIdsFromFile(refPath)) referenced.add(ref);
        }
        break;
      }
    }
  }

  // Workflows
  const workflowsPath = join(repoRoot, "packages", "pn-core-mcp", "src", "workflows.ts");
  for (const id of collectIdsFromFile(workflowsPath)) referenced.add(id);

  // Config: specialists scaffolds, stacks scaffold/rule
  const specialistsPath = join(contentRoot, "config", "specialists.json");
  const stacksPath = join(contentRoot, "config", "stacks.json");
  for (const id of collectIdsFromFile(specialistsPath)) referenced.add(id);
  for (const id of collectIdsFromFile(stacksPath)) referenced.add(id);

  // Continual learning hook (references pn-continual-learning)
  const hookScriptPath = join(
    repoRoot,
    "plugins",
    "pnCore",
    "scripts",
    "pn-continual-learning-stop.mjs"
  );
  for (const id of collectIdsFromFile(hookScriptPath)) referenced.add(id);

  const orphan = [...skillIds].filter((id) => !referenced.has(id)).sort();

  if (orphan.length > 0) {
    const strict = process.env.PNCORE_STRICT_ORPHANS === "1";
    const method = strict ? console.error : console.warn;
    method(
      `validate-skill-references: ${orphan.length} skill(s) not referenced by agents, commands, rules, workflows, or config:`
    );
    orphan.forEach((id) => method(`  - ${id}`));
    if (strict) {
      console.error(
        "(Strict mode: PNCORE_STRICT_ORPHANS=1 — fix orphans or add to exclusion list)"
      );
      process.exit(1);
    } else {
      console.warn(
        "(Orphan skills are low-priority cleanup candidates; set PNCORE_STRICT_ORPHANS=1 to enforce)"
      );
    }
  } else {
    console.log("validate-skill-references: all skills are referenced");
  }
  process.exit(0);
}

main();
