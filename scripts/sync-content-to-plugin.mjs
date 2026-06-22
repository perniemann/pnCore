#!/usr/bin/env node
/**
 * Sync content from packages/pn-core-mcp/content/ (canonical) to plugins/pnCore/.
 * Run after editing skills, agents, rules, config, docs, reference, or hooks in MCP content.
 * Usage: node scripts/sync-content-to-plugin.mjs (or npm run sync:content from repo root)
 *
 * Sync coverage map (canonical → plugin destination):
 *   content/commands/         → plugins/pnCore/.cursor/commands/
 *   content/skills/           → plugins/pnCore/skills/
 *   content/agents/           → plugins/pnCore/agents/
 *   content/agents-internal/  → plugins/pnCore/agents-internal/
 *   content/rules/            → plugins/pnCore/rules/
 *   content/config/           → plugins/pnCore/config/
 *   content/docs/             → plugins/pnCore/docs/
 *   content/reference/        → plugins/pnCore/reference/
 *   content/hooks/            → plugins/pnCore/hooks/
 *   content/docs/agents-md-guide.md → docs/agents-md-guide.md (repo-root copy)
 *   content/config/specialists.json → config/specialists.json  (repo-root copy)
 *   content/config/stacks.json      → config/stacks.json       (repo-root copy)
 *
 * NOT synced here (project-local):
 *   content/config/features.json  — intentionally local per project
 */
import { cpSync, mkdirSync, existsSync, rmSync, copyFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { partitionCommands } from "./command-slash-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const mcpContent = join(repoRoot, "packages", "pn-core-mcp", "content");
const pluginRoot = join(repoRoot, "plugins", "pnCore");

if (!existsSync(mcpContent)) {
  console.error("MCP content not found at", mcpContent);
  process.exit(1);
}
if (!existsSync(pluginRoot)) {
  console.error("Plugin not found at", pluginRoot);
  process.exit(1);
}

// Commands go to .cursor/commands (plugin structure).
// Filter by frontmatter `slash: false` so demoted (advanced) commands stay
// canonical-only and do not appear in the Cursor slash palette.
// See scripts/command-slash-filter.mjs for the contract.
const commandsSrc = join(mcpContent, "commands");
const commandsDest = join(pluginRoot, ".cursor", "commands");
if (existsSync(commandsSrc)) {
  if (existsSync(commandsDest)) rmSync(commandsDest, { recursive: true });
  mkdirSync(commandsDest, { recursive: true });
  const { visible, hidden } = partitionCommands(commandsSrc);
  for (const file of visible) {
    copyFileSync(join(commandsSrc, file), join(commandsDest, file));
  }
  // Also copy any non-md/txt files (none today, but preserves cpSync behavior).
  for (const file of readdirSync(commandsSrc)) {
    if (file.endsWith(".md") || file.endsWith(".txt")) continue;
    copyFileSync(join(commandsSrc, file), join(commandsDest, file));
  }
  const hiddenNote = hidden.length ? ` (${hidden.length} hidden via slash:false)` : "";
  console.log(
    `Synced content/commands -> plugins/pnCore/.cursor/commands/ — ${visible.length} visible${hiddenNote}`
  );
}

const dirs = [
  "skills",
  "agents",
  "agents-internal",
  "rules",
  "config",
  "docs",
  "reference",
  "hooks",
];
for (const dir of dirs) {
  const src = join(mcpContent, dir);
  const dest = join(pluginRoot, dir);
  if (existsSync(src)) {
    if (existsSync(dest)) rmSync(dest, { recursive: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log("Synced content/" + dir, "-> plugins/pnCore/" + dir);
  }
}

// Copy agents-md-guide to repo docs/ so plugin-reference and mcp-usage-guide links resolve (single source: content/docs/)
const agentsMdSrc = join(mcpContent, "docs", "agents-md-guide.md");
const agentsMdDest = join(repoRoot, "docs", "agents-md-guide.md");
if (existsSync(agentsMdSrc)) {
  mkdirSync(join(repoRoot, "docs"), { recursive: true });
  copyFileSync(agentsMdSrc, agentsMdDest);
  console.log("Synced content/docs/agents-md-guide.md -> docs/agents-md-guide.md");
}

// Copy config/specialists.json and config/stacks.json to repo root config/
// (features.json is project-local and intentionally not synced here)
for (const cfg of ["specialists.json", "stacks.json"]) {
  const cfgSrc = join(mcpContent, "config", cfg);
  const cfgDest = join(repoRoot, "config", cfg);
  if (existsSync(cfgSrc)) {
    mkdirSync(join(repoRoot, "config"), { recursive: true });
    copyFileSync(cfgSrc, cfgDest);
    console.log(`Synced content/config/${cfg} -> config/${cfg}`);
  }
}

console.log("Sync complete. Canonical source: packages/pn-core-mcp/content/");
