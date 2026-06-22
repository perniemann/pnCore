#!/usr/bin/env node
/**
 * Shared helper for the slash-visibility filter applied to command markdown.
 *
 * Used by:
 *   scripts/sync-content-to-plugin.mjs    (decides what to copy into plugin/.cursor/commands/)
 *   scripts/check-content-plugin-sync.mjs (mirrors that decision when comparing trees)
 *   scripts/validate-plugin-lib.mjs       (enforces a soft cap on visible-slash count)
 *
 * Contract:
 *   A command file in packages/pn-core-mcp/content/commands/<id>.md is **hidden**
 *   from the slash palette iff its YAML frontmatter contains:
 *     slash: false
 *   Default (no key, or any other value) is **visible**.
 *
 * Hidden commands remain canonical and continue to be reachable via:
 *   - get_command(id)            (MCP tool)
 *   - regPrompt(id, ...)         (MCP prompt registration loop)
 *   - get_command("<id>") chains inside other command markdown
 *
 * Rationale: documented in c:/Users/tool/.cursor/plans/slash_command_ux_consolidation_*.plan.md
 * and `pn-build-gate` § Command-contract acknowledgement (COMMAND-MISMATCH evidence).
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * Returns true when the command file should be hidden from the slash palette.
 * Reads only the YAML frontmatter (cheap; head of file).
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
 * Lists every command file in `commandsDir` and partitions it into
 * { visible, hidden } arrays of plain filenames (e.g. "pn-typeset.md").
 * @param {string} commandsDir Absolute path to canonical content/commands/
 * @returns {{ visible: string[], hidden: string[] }}
 */
export function partitionCommands(commandsDir) {
  const visible = [];
  const hidden = [];
  if (!existsSync(commandsDir)) return { visible, hidden };
  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith(".md") && !file.endsWith(".txt")) continue;
    if (isCommandHiddenFromSlash(join(commandsDir, file))) hidden.push(file);
    else visible.push(file);
  }
  visible.sort();
  hidden.sort();
  return { visible, hidden };
}
