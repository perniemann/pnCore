#!/usr/bin/env node
/**
 * Pi /pn command menu index (ADR-0008 Pi path).
 * Generated at sync time from visible command paths; consumed by pn-core Pi extension.
 */
import { readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { commandIdFromFile, commandStemFromRel } from "./command-slash-filter.mjs";

/** @typedef {{ id: string, category: string, description: string, file: string }} PiCommandIndexEntry */

const CATEGORY_BY_FOLDER = {
  start: "Start",
  build: "Build",
  design: "Design",
  pm: "Product",
  audit: "Audit",
  challenge: "Challenge",
  ship: "Ship",
};

/**
 * @param {string} relPath e.g. "pn/build/pn-build.md" or "pn.md"
 * @returns {string}
 */
export function categoryFromCommandRel(relPath) {
  const parts = relPath.replace(/\\/g, "/").split("/");
  if (parts[0] === "pn" && parts.length >= 3) {
    return CATEGORY_BY_FOLDER[parts[1]] ?? "Other";
  }
  return "Other";
}

/**
 * @param {string} filePath
 * @returns {string}
 */
export function descriptionFromCommandFile(filePath) {
  let head;
  try {
    head = readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
  const match = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return "";
  const desc = match[1].match(/^description:\s*(.+?)\s*$/m);
  if (!desc) return "";
  return desc[1].replace(/^["']|["']$/g, "").trim();
}

/**
 * @param {string} commandsSrc absolute path to content/commands
 * @param {string[]} visibleRels relative paths from partitionCommands
 * @returns {PiCommandIndexEntry[]}
 */
export function buildPiCommandIndex(commandsSrc, visibleRels) {
  /** @type {PiCommandIndexEntry[]} */
  const entries = [];
  for (const rel of visibleRels) {
    if (!rel.endsWith(".md")) continue;
    const abs = join(commandsSrc, rel);
    const id = commandIdFromFile(abs) ?? commandStemFromRel(rel);
    if (id === "pn" && (rel === "pn.md" || basename(rel) === "pn.md")) continue;
    entries.push({
      id,
      category: categoryFromCommandRel(rel),
      description: descriptionFromCommandFile(abs),
      file: basename(rel),
    });
  }
  entries.sort((a, b) => {
    const cat = a.category.localeCompare(b.category);
    if (cat !== 0) return cat;
    return a.id.localeCompare(b.id);
  });
  return entries;
}

/**
 * @param {string} pluginRoot
 * @param {PiCommandIndexEntry[]} entries
 */
export function writePiCommandIndex(pluginRoot, entries) {
  const outPath = join(pluginRoot, "pi-command-index.json");
  writeFileSync(outPath, `${JSON.stringify({ version: 1, commands: entries }, null, 2)}\n`);
  return outPath;
}
