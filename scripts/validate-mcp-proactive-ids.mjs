#!/usr/bin/env node
/**
 * Validates that all pn-core ids referenced in pn-mcp-proactive rule exist in content.
 * Ensures the mapping table stays in sync when skills/agents/commands are added or removed.
 * Run from repo root: node scripts/validate-mcp-proactive-ids.mjs
 * Exit 0 if all ids exist; 1 if any are missing.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { contentRoot, walkSkills, listMdIds } from "./validate-helpers.mjs";

const rulePath = join(contentRoot, "rules", "pn-mcp-proactive.mdc");

function collectIds(text) {
  const matches = text.matchAll(/\bpn-[a-zA-Z0-9-]+\b/g);
  return [...new Set([...matches].map((m) => m[0]))];
}

if (!existsSync(rulePath)) {
  console.error("pn-mcp-proactive.mdc not found at", rulePath);
  process.exit(1);
}

const ruleText = readFileSync(rulePath, "utf-8");

const validSkills = new Set(walkSkills(contentRoot));
const validAgents = new Set(listMdIds(contentRoot, "agents"));
const validCommands = new Set(listMdIds(contentRoot, "commands"));
const validRules = new Set(listMdIds(contentRoot, "rules"));
const validIds = new Set([...validSkills, ...validAgents, ...validCommands, ...validRules]);

// Exclude workflow_step and other non-ids that match the pattern
const exclude = new Set(["pn-core"]);
const idsToCheck = collectIds(ruleText).filter((id) => !exclude.has(id));

const missing = idsToCheck.filter((id) => !validIds.has(id));
if (missing.length > 0) {
  console.error("pn-mcp-proactive references ids that do not exist in content:");
  for (const id of missing) {
    console.error("  -", id);
  }
  console.error("\nAdd the missing skill/agent/command to content/, or remove from the rule.");
  process.exit(1);
}

console.log("All pn-mcp-proactive ids exist in content");
process.exit(0);
