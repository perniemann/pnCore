#!/usr/bin/env node
/**
 * Shared validation logic for Cursor plugin manifest, paths, and component frontmatter.
 * Used by scripts/validate-template.mjs. Runnable as CLI: node scripts/validate-plugin-lib.mjs [pluginPath]
 * @param {string} pluginRoot - Absolute path to the plugin directory
 * @returns {number} 0 on success, 1 on failure (writes errors to stderr)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { walkCommandFiles, listTopLevelVisibleCommands } from "./command-slash-filter.mjs";

export function runValidation(pluginRoot) {
  const errors = [];

  function err(msg) {
    errors.push(msg);
  }

  function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const obj = {};
    for (const line of match[1].split(/\r?\n/)) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) obj[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
    return obj;
  }

  // --- Manifest
  const manifestPath = path.join(pluginRoot, ".cursor-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) {
    err(`Missing manifest: .cursor-plugin/plugin.json`);
    process.stderr.write(errors.join("\n") + "\n");
    return 1;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    err(`Invalid plugin.json: ${e.message}`);
    process.stderr.write(errors.join("\n") + "\n");
    return 1;
  }

  const required = ["name", "displayName", "version", "description", "author", "license"];
  for (const key of required) {
    if (manifest[key] === undefined || manifest[key] === null)
      err(`Manifest missing required field: ${key}`);
  }

  if (manifest.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name))
    err(`Manifest 'name' must be lowercase kebab-case: ${manifest.name}`);

  if (manifest.author && typeof manifest.author !== "object")
    err('Manifest \'author\' must be an object (e.g. { "name": "..." })');

  if (manifest.author?.name === undefined || manifest.author?.name === "")
    err("Manifest 'author.name' is required");

  // --- Paths
  const pathKeys = ["skills", "agents", "rules", "commands", "logo"];
  if (manifest.hooks) pathKeys.push("hooks");

  for (const key of pathKeys) {
    const value = manifest[key];
    if (value === undefined) continue;
    const resolved = path.join(pluginRoot, value);
    const isFile = value.endsWith(".json") || value.endsWith(".svg") || key === "hooks";
    if (isFile) {
      if (!fs.existsSync(resolved)) err(`Manifest path does not exist: ${key} -> ${value}`);
    } else {
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory())
        err(`Manifest path is not an existing directory: ${key} -> ${value}`);
    }
  }

  // --- Frontmatter: rules
  const rulesDir = manifest.rules
    ? path.join(pluginRoot, manifest.rules)
    : path.join(pluginRoot, "rules");
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".mdc"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(rulesDir, file), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) err(`Rule missing YAML frontmatter: rules/${file}`);
      else if (!fm.description) err(`Rule missing 'description' in frontmatter: rules/${file}`);
    }
  }

  // --- Frontmatter: skills (recursive SKILL.md)
  const skillsDir = manifest.skills
    ? path.join(pluginRoot, manifest.skills)
    : path.join(pluginRoot, "skills");
  function collectSkillMd(dir, base = "skills") {
    const out = [];
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return out;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.join(base, name);
      if (fs.statSync(full).isDirectory()) {
        const skillMd = path.join(full, "SKILL.md");
        if (fs.existsSync(skillMd)) out.push(path.join(rel, "SKILL.md"));
        out.push(...collectSkillMd(full, rel));
      }
    }
    return out;
  }
  if (fs.existsSync(skillsDir)) {
    for (const rel of collectSkillMd(skillsDir)) {
      const content = fs.readFileSync(path.join(pluginRoot, rel), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) err(`Skill missing YAML frontmatter: ${rel}`);
      else {
        if (!fm.name) err(`Skill missing 'name' in frontmatter: ${rel}`);
        if (!fm.description) err(`Skill missing 'description' in frontmatter: ${rel}`);
      }
    }
  }

  // --- Frontmatter: agents
  const agentsDir = manifest.agents
    ? path.join(pluginRoot, manifest.agents)
    : path.join(pluginRoot, "agents");
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) err(`Agent missing YAML frontmatter: agents/${file}`);
      else {
        if (!fm.name) err(`Agent missing 'name' in frontmatter: agents/${file}`);
        if (!fm.description) err(`Agent missing 'description' in frontmatter: agents/${file}`);
      }
    }
  }

  // --- Frontmatter: commands (ADR-0008 pn submenu)
  // Top-level palette: pn.md stub only. Leaves live under pn/{category}/.
  const TOP_LEVEL_HARD = 2;
  const LEAF_SOFT_CAP = 35;
  const LEAF_HARD_CAP = 45;
  const commandsDir = manifest.commands
    ? path.join(pluginRoot, manifest.commands)
    : path.join(pluginRoot, "commands");
  if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
    let leafCount = 0;
    for (const { rel, abs } of walkCommandFiles(commandsDir)) {
      if (!rel.endsWith(".md") && !rel.endsWith(".txt")) continue;
      leafCount++;
      const content = fs.readFileSync(abs, "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) err(`Command missing YAML frontmatter: commands/${rel}`);
      else {
        if (!fm.name) err(`Command missing 'name' in frontmatter: commands/${rel}`);
        if (!fm.description) err(`Command missing 'description' in frontmatter: commands/${rel}`);
      }
    }
    const topLevel = listTopLevelVisibleCommands(commandsDir);
    if (topLevel.length > TOP_LEVEL_HARD) {
      err(
        `Slash-palette top-level overflow: ${topLevel.length} files at ${commandsDir} root exceeds cap of ${TOP_LEVEL_HARD}. ` +
          `Only pn.md should sit at root; move leaves under pn/.`
      );
    }
    if (leafCount > LEAF_HARD_CAP) {
      err(
        `Slash-palette leaf overflow: ${leafCount} visible command files under ${commandsDir} exceeds hard cap of ${LEAF_HARD_CAP}.`
      );
    } else if (leafCount > LEAF_SOFT_CAP) {
      process.stderr.write(
        `[plugin-validate] WARN: ${leafCount} visible command leaves exceeds soft cap of ${LEAF_SOFT_CAP}.\n`
      );
    }
  }

  if (errors.length) {
    process.stderr.write(
      "Plugin validation failed:\n" + errors.map((e) => "  - " + e).join("\n") + "\n"
    );
    return 1;
  }

  console.log("Plugin validation passed: manifest, paths, and frontmatter OK.");
  return 0;
}

// CLI when run directly: node scripts/validate-plugin-lib.mjs [pluginPath]
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const pluginRoot = path.resolve(process.cwd(), process.argv[2] || ".");
  process.exit(runValidation(pluginRoot));
}
