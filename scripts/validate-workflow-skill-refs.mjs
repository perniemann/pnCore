#!/usr/bin/env node
/**
 * Ensures get_skill / get_agent / get_command / get_rule('…') ids referenced from:
 *   - packages/pn-core-mcp/src/workflows.ts
 *   - packages/pn-core-mcp/content/**\/*.md and *.mdc
 * resolve to a shipped pnCore asset, OR are explicitly allow-listed external
 * skills bundled with Cursor itself (e.g. the user-installed `canvas` skill).
 *
 * Run from repo root: node scripts/validate-workflow-skill-refs.mjs
 * Exit 0 if all valid; 1 if any unresolved.
 *
 * Adding a new external (non-pnCore-shipped) skill: append it to EXTERNAL_ALLOWLIST.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { contentRoot, walkSkills, listMdIds } from "./validate-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const workflowsPath = join(repoRoot, "packages", "pn-core-mcp", "src", "workflows.ts");

// Bare-or-pn ids: lowercase letter start, then [a-z0-9_-]*. Matches both
// `pn-foo` (shipped) and `canvas` (Cursor-built-in external).
const REF_RE = /get_(skill|agent|command|rule)\(\s*['"]([a-z][a-z0-9_-]*)['"]\s*\)/g;

// External assets that are not shipped by pnCore but are valid call targets
// (e.g. Cursor's user-installed skills, other MCPs). Adding an entry suppresses
// the "unresolved id" failure for that kind+id pair.
const EXTERNAL_ALLOWLIST = {
  skill: new Set([
    "canvas", // Cursor IDE built-in; user-level skill at ~/.cursor/skills-cursor/canvas/
  ]),
  agent: new Set(),
  command: new Set(),
  rule: new Set(),
};

/** Walk content/ recursively yielding every .md and .mdc file. */
function* walkContentDocs(root) {
  if (!existsSync(root)) return;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, ent.name);
    if (ent.isDirectory()) {
      yield* walkContentDocs(full);
    } else if (ent.isFile() && (ent.name.endsWith(".md") || ent.name.endsWith(".mdc"))) {
      yield full;
    }
  }
}

/** Collect every (kind, id, file, line) tuple where the regex matches. */
function collectRefsFromFile(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf-8");
  const refs = [];
  let m;
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(text)) !== null) {
    const kind = m[1];
    const id = m[2];
    const upTo = text.slice(0, m.index);
    const line = upTo.split(/\r?\n/).length;
    refs.push({ kind, id, file: path, line });
  }
  return refs;
}

function main() {
  if (!existsSync(workflowsPath)) {
    console.error("workflows.ts not found at", workflowsPath);
    process.exit(1);
  }

  // Collect every reference site
  const sites = [];
  sites.push(...collectRefsFromFile(workflowsPath));
  for (const file of walkContentDocs(contentRoot)) {
    sites.push(...collectRefsFromFile(file));
  }

  // Build the registry of shipped ids
  const registry = {
    skill: new Set(walkSkills(contentRoot)),
    agent: new Set(listMdIds(contentRoot, "agents")),
    command: new Set(listMdIds(contentRoot, "commands")),
    rule: new Set(listMdIds(contentRoot, "rules")),
  };

  // Internal agents live in agents-internal/ and are also valid targets for get_agent
  for (const id of listMdIds(contentRoot, "agents-internal")) {
    registry.agent.add(id);
  }

  const unresolved = [];
  let resolvedCount = 0;
  let externalCount = 0;
  for (const site of sites) {
    const { kind, id } = site;
    if (registry[kind].has(id)) {
      resolvedCount++;
      continue;
    }
    if (EXTERNAL_ALLOWLIST[kind].has(id)) {
      externalCount++;
      continue;
    }
    unresolved.push(site);
  }

  if (unresolved.length > 0) {
    console.error(
      `validate-workflow-skill-refs: ${unresolved.length} unresolved get_* reference(s):`
    );
    for (const { kind, id, file, line } of unresolved) {
      const rel = relative(repoRoot, file).replace(/\\/g, "/");
      console.error(`  - ${rel}:${line}  get_${kind}('${id}')`);
    }
    console.error(
      "\nFix options:\n" +
        "  1. Correct the id (typo) so it matches a shipped asset under packages/pn-core-mcp/content/.\n" +
        "  2. Add the missing asset under content/.\n" +
        "  3. If the id is an external (non-pnCore) asset that callers should reach only when present\n" +
        "     in the user's environment, add it to EXTERNAL_ALLOWLIST in scripts/validate-workflow-skill-refs.mjs."
    );
    process.exit(1);
  }

  console.log(
    `validate-workflow-skill-refs: ${resolvedCount} resolved, ${externalCount} external-allowlisted across ${sites.length} call site(s)`
  );
  process.exit(0);
}

main();
