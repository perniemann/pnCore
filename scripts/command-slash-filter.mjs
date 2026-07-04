#!/usr/bin/env node
/**
 * Shared helper for the slash-visibility filter applied to command markdown.
 *
 * Used by:
 *   scripts/sync-content-to-plugin.mjs    (decides what to copy into plugin/.cursor/commands/)
 *   scripts/check-content-plugin-sync.mjs (mirrors that decision when comparing trees)
 *   scripts/validate-plugin-lib.mjs       (enforces palette caps)
 *
 * Contract:
 *   A command file is **hidden** from the slash palette iff YAML frontmatter contains:
 *     slash: false
 *   Default (no key, or any other value) is **visible**.
 *
 * Layout (ADR-0008):
 *   - Visible leaves: content/commands/pn/ (recursive) and top-level content/commands/pn.md
 *   - Hidden surgical: content/commands/*.md with slash: false (canonical only)
 *
 * Hidden commands remain reachable via get_command(id), MCP prompts, and umbrella chains.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";

/**
 * Returns true when the command file should be hidden from the slash palette.
 * @param {string} filePath Absolute path to a command .md file
 * @returns {boolean}
 */
export function isCommandHiddenFromSlash(filePath) {
  let head;
  try {
    head = readFileSync(filePath, "utf8");
  } catch {
    return false;
  }
  const match = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;
  const slashLine = match[1].match(/^slash:\s*(.+?)\s*$/m);
  if (!slashLine) return false;
  const value = slashLine[1]
    .replace(/^["']|["']$/g, "")
    .trim()
    .toLowerCase();
  return value === "false";
}

/**
 * Walk all command markdown files under commandsDir (recursive).
 * @param {string} commandsDir
 * @param {string} [relativeBase]
 * @returns {Generator<{ rel: string, abs: string }>}
 */
export function* walkCommandFiles(commandsDir, relativeBase = "") {
  if (!existsSync(commandsDir)) return;
  for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
    const abs = join(commandsDir, entry.name);
    const rel = relativeBase ? join(relativeBase, entry.name) : entry.name;
    if (entry.isDirectory()) {
      yield* walkCommandFiles(abs, rel);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".txt")) {
      yield { rel: rel.replace(/\\/g, "/"), abs };
    }
  }
}

/**
 * Partition command files into visible/hidden using recursive walk.
 * Returns paths relative to commandsDir (e.g. "pn/build/pn-build.md", "pn.md").
 * @param {string} commandsDir
 * @returns {{ visible: string[], hidden: string[] }}
 */
export function partitionCommands(commandsDir) {
  const visible = [];
  const hidden = [];
  if (!existsSync(commandsDir)) return { visible, hidden };
  for (const { rel, abs } of walkCommandFiles(commandsDir)) {
    if (isCommandHiddenFromSlash(abs)) hidden.push(rel);
    else visible.push(rel);
  }
  visible.sort();
  hidden.sort();
  return { visible, hidden };
}

/**
 * Top-level visible command files directly under commandsDir (non-recursive).
 * Used for palette cap: only pn.md should appear at plugin commands root.
 * @param {string} commandsDir
 * @returns {string[]}
 */
export function listTopLevelVisibleCommands(commandsDir) {
  const out = [];
  if (!existsSync(commandsDir)) return out;
  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith(".md") && !file.endsWith(".txt")) continue;
    const abs = join(commandsDir, file);
    try {
      if (!statSync(abs).isFile()) continue;
    } catch {
      continue;
    }
    if (!isCommandHiddenFromSlash(abs)) out.push(file);
  }
  return out.sort();
}

/**
 * Count visible leaf commands under pn/ subtree.
 * @param {string} commandsDir
 * @returns {number}
 */
export function countVisiblePnLeaves(commandsDir) {
  let n = 0;
  for (const rel of partitionCommands(commandsDir).visible) {
    if (rel.startsWith("pn/") || rel.startsWith("pn\\")) n++;
  }
  return n;
}

/**
 * Parse frontmatter `name:` from a command file (cheap head read).
 * @param {string} filePath
 * @returns {string|undefined}
 */
export function commandIdFromFile(filePath) {
  let head;
  try {
    head = readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  const match = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;
  const nameLine = match[1].match(/^name:\s*(.+?)\s*$/m);
  if (!nameLine) return undefined;
  return nameLine[1].replace(/^["']|["']$/g, "").trim();
}

/**
 * Filename stem for a command path.
 * @param {string} relPath
 * @returns {string}
 */
export function commandStemFromRel(relPath) {
  return basename(relPath).replace(/\.(md|txt)$/, "");
}
