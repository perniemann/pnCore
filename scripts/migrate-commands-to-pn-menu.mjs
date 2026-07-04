#!/usr/bin/env node
/**
 * One-time layout migration: move visible root commands into content/commands/pn/{category}/.
 * Hidden (slash: false) files stay at content/commands/ root.
 * Usage: node scripts/migrate-commands-to-pn-menu.mjs
 */
import { existsSync, mkdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isCommandHiddenFromSlash } from "./command-slash-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(__dirname, "..", "packages", "pn-core-mcp", "content", "commands");

/** @type {Record<string, string[]>} */
const CATEGORIES = {
  start: ["pn-guide", "pn-new", "pn-setup"],
  build: ["pn-build", "pn-best-of-n", "pn-deliver", "pn-program"],
  design: [
    "pn-design",
    "pn-design-dna",
    "pn-design-variants",
    "pn-preflight",
    "pn-visual-tweak",
    "pn-polish",
    "pn-assets",
  ],
  pm: ["pn-create-prd", "pn-user-stories", "pn-strategy", "pn-pressure-test", "pn-document"],
  audit: ["pn-frontend-audit", "pn-backend-audit"],
  challenge: ["pn-grill", "pn-skeptic", "pn-prompt-optimize"],
  ship: ["pn-review", "pn-retro", "pn-video-lint"],
};

const allMapped = new Set(Object.values(CATEGORIES).flat());

for (const [cat, ids] of Object.entries(CATEGORIES)) {
  const destDir = join(commandsDir, "pn", cat);
  mkdirSync(destDir, { recursive: true });
  for (const id of ids) {
    const src = join(commandsDir, `${id}.md`);
    const dest = join(destDir, `${id}.md`);
    if (!existsSync(src)) {
      if (existsSync(dest)) continue;
      console.warn(`skip missing: ${id}.md`);
      continue;
    }
    if (isCommandHiddenFromSlash(src)) {
      console.warn(`skip hidden at root: ${id}.md`);
      continue;
    }
    renameSync(src, dest);
    console.log(`moved ${id}.md -> pn/${cat}/`);
  }
}

// Warn on unmapped visible root commands (except pn.md stub)
import { readdirSync } from "fs";
for (const file of readdirSync(commandsDir)) {
  if (!file.endsWith(".md")) continue;
  if (file === "pn.md") continue;
  const abs = join(commandsDir, file);
  const stem = file.replace(/\.md$/, "");
  if (allMapped.has(stem)) continue;
  if (isCommandHiddenFromSlash(abs)) continue;
  console.warn(`unmapped visible root command: ${file}`);
}

console.log("migrate-commands-to-pn-menu: done");
