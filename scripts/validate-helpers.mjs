#!/usr/bin/env node
/**
 * Shared validation helpers for content traversal.
 * Used by validate-skill-references.mjs and validate-mcp-proactive-ids.mjs.
 */

import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

/** Absolute path to canonical content root. */
export const contentRoot = join(repoRoot, "packages", "pn-core-mcp", "content");

/**
 * Walk skills directory; yields skill ids.
 * @param {string} root - Content root (e.g. contentRoot)
 * @yields {string} Skill id
 */
export function* walkSkills(root) {
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return;
  for (const cat of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catPath = join(skillsDir, cat.name);
    for (const ent of readdirSync(catPath, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (existsSync(join(catPath, ent.name, "SKILL.md"))) yield ent.name;
    }
  }
}

/**
 * List ids from a directory of .md/.mdc files (e.g. agents/, commands/).
 * @param {string} root - Content root
 * @param {string} dir - Relative dir (e.g. "agents", "commands")
 * @returns {string[]} Array of ids
 */
export function listMdIds(root, dir) {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdc"))
    .map((f) => f.replace(/\.(md|mdc)$/, ""));
}
