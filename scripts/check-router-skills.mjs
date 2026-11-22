#!/usr/bin/env node
/**
 * Router skill set gate (ADR-0027). content/config/router-skills.json names the skills the
 * installer copies into .agents/skills for Codex and Pi. Every id must exist, appear once, and
 * the sum of id + description lengths must stay within budgetChars, so Codex lists every router
 * skill in full instead of shortening descriptions and dropping entries.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/** Frontmatter description of a SKILL.md, unquoted. */
export function skillDescription(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const m = fm && /^description:\s*(.*)$/m.exec(fm[1]);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

/** id -> description for every skill under content/skills/<category>/<id>/SKILL.md. */
export function skillCatalog(skillsRoot) {
  const out = new Map();
  for (const cat of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const s of readdirSync(join(skillsRoot, cat.name), { withFileTypes: true })) {
      const p = join(skillsRoot, cat.name, s.name, "SKILL.md");
      if (s.isDirectory() && existsSync(p))
        out.set(s.name, skillDescription(readFileSync(p, "utf8")));
    }
  }
  return out;
}

/** @returns {{ errors: string[], chars: number }} */
export function routerFindings(config, catalog) {
  const errors = [];
  const ids = Array.isArray(config.skills) ? config.skills : [];
  if (!Number.isInteger(config.budgetChars) || config.budgetChars <= 0)
    errors.push("budgetChars must be a positive integer");
  if (ids.length === 0) errors.push("skills is empty");
  const seen = new Set();
  let chars = 0;
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${id}: listed twice`);
    seen.add(id);
    if (!catalog.has(id)) {
      errors.push(`${id}: no such skill`);
      continue;
    }
    chars += id.length + catalog.get(id).length;
  }
  if (chars > config.budgetChars)
    errors.push(
      `router set is ${chars} chars (id + description), over budgetChars ${config.budgetChars}`
    );
  return { errors, chars };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const content = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "packages/pn-core-mcp/content"
  );
  const config = JSON.parse(readFileSync(join(content, "config/router-skills.json"), "utf8"));
  const { errors, chars } = routerFindings(config, skillCatalog(join(content, "skills")));
  if (errors.length) {
    console.error("check-router-skills: FAIL\n" + errors.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log(
    `check-router-skills: OK (${config.skills.length} skills, ${chars} of ${config.budgetChars} chars)`
  );
}
