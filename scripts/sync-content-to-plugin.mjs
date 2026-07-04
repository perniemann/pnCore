#!/usr/bin/env node
/**
 * Sync content from packages/pn-core-mcp/content/ (canonical) to plugins/pnCore/.
 * Run after editing skills, agents, rules, config, docs, reference, or hooks in MCP content.
 * Usage: node scripts/sync-content-to-plugin.mjs (or npm run sync:content from repo root)
 *
 * Sync coverage map (canonical → plugin destination):
 *   content/commands/pn.md + pn/**  → plugins/pnCore/.cursor/commands/ (visible only)
 *   content/skills/                 → plugins/pnCore/skills/
 *   visible commands (Pi)           → plugins/pnCore/prompts/ (flat pn-*.md)
 *   ...
 *
 * NOT synced here (project-local):
 *   content/config/features.json  — intentionally local per project
 */
import {
  cpSync,
  mkdirSync,
  existsSync,
  rmSync,
  copyFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { partitionCommands } from "./command-slash-filter.mjs";
import { ensureRootPiManifest } from "./pi-package-manifest.mjs";

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

/** Copy visible command tree to Cursor plugin commands dir. */
const commandsSrc = join(mcpContent, "commands");
const commandsDest = join(pluginRoot, ".cursor", "commands");
const promptsDest = join(pluginRoot, "prompts");

if (existsSync(commandsSrc)) {
  if (existsSync(commandsDest)) rmSync(commandsDest, { recursive: true });
  mkdirSync(commandsDest, { recursive: true });

  const { visible, hidden } = partitionCommands(commandsSrc);
  let cursorCopied = 0;

  for (const rel of visible) {
    const src = join(commandsSrc, rel);
    const dest = join(commandsDest, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    cursorCopied++;
  }

  // Non-md assets at commands root (none expected today)
  for (const file of readdirSync(commandsSrc)) {
    const srcPath = join(commandsSrc, file);
    if (file.endsWith(".md") || file.endsWith(".txt")) continue;
    let isFile = false;
    try {
      isFile =
        readdirSync(commandsSrc, { withFileTypes: true })
          .find((e) => e.name === file)
          ?.isFile?.() ?? false;
    } catch {
      continue;
    }
    if (isFile) copyFileSync(srcPath, join(commandsDest, file));
  }

  const hiddenNote = hidden.length ? ` (${hidden.length} hidden via slash:false)` : "";
  console.log(
    `Synced content/commands -> plugins/pnCore/.cursor/commands/ — ${cursorCopied} visible${hiddenNote}`
  );

  // Pi.dev: flat prompts/ (non-recursive discovery per pi prompt-templates.md)
  if (existsSync(promptsDest)) rmSync(promptsDest, { recursive: true });
  mkdirSync(promptsDest, { recursive: true });
  let piCopied = 0;
  for (const rel of visible) {
    if (!rel.endsWith(".md")) continue;
    const src = join(commandsSrc, rel);
    const flatName = basename(rel);
    copyFileSync(src, join(promptsDest, flatName));
    piCopied++;
  }
  console.log(
    `Synced visible commands -> plugins/pnCore/prompts/ — ${piCopied} flat Pi prompt templates`
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

// Pi package manifest (pi.dev package install)
const piPackagePath = join(pluginRoot, "package.json");
if (!existsSync(piPackagePath)) {
  writeFileSync(
    piPackagePath,
    JSON.stringify(
      {
        name: "pn-core-plugin",
        version: "0.15.0",
        private: true,
        keywords: ["pi-package"],
        description:
          "pnCore plugin — Pi prompt templates and skills (Cursor plugin ships separately)",
        pi: {
          prompts: ["./prompts"],
          skills: ["./skills"],
        },
      },
      null,
      2
    ) + "\n"
  );
  console.log("Created plugins/pnCore/package.json (pi-package manifest)");
}

const agentsMdSrc = join(mcpContent, "docs", "agents-md-guide.md");
const agentsMdDest = join(repoRoot, "docs", "agents-md-guide.md");
if (existsSync(agentsMdSrc)) {
  mkdirSync(join(repoRoot, "docs"), { recursive: true });
  copyFileSync(agentsMdSrc, agentsMdDest);
  console.log("Synced content/docs/agents-md-guide.md -> docs/agents-md-guide.md");
}

for (const cfg of ["specialists.json", "stacks.json"]) {
  const cfgSrc = join(mcpContent, "config", cfg);
  const cfgDest = join(repoRoot, "config", cfg);
  if (existsSync(cfgSrc)) {
    mkdirSync(join(repoRoot, "config"), { recursive: true });
    copyFileSync(cfgSrc, cfgDest);
    console.log(`Synced content/config/${cfg} -> config/${cfg}`);
  }
}

ensureRootPiManifest(repoRoot);

console.log("Sync complete. Canonical source: packages/pn-core-mcp/content/");
