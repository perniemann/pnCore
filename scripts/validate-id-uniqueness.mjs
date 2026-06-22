#!/usr/bin/env node
/**
 * Validate that skill IDs and agent IDs are unique across categories.
 * Fails CI with a clear duplicate-ID list when any collision exists.
 * Run from repo root: node scripts/validate-id-uniqueness.mjs
 */

import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { contentRoot } from "./validate-helpers.mjs";

let failures = 0;

function checkUniqueness(label, ids) {
  const seen = new Map();
  const duplicates = [];
  for (const { id, location } of ids) {
    if (seen.has(id)) {
      duplicates.push({ id, first: seen.get(id), second: location });
    } else {
      seen.set(id, location);
    }
  }
  if (duplicates.length > 0) {
    console.error(`✗ ${label}: ${duplicates.length} duplicate ID(s) found:`);
    for (const { id, first, second } of duplicates) {
      console.error(`  - "${id}" in ${first} AND ${second}`);
    }
    failures += duplicates.length;
  }
  return duplicates.length === 0;
}

// Collect all skill IDs across categories
const skillEntries = [];
const skillsDir = join(contentRoot, "skills");
if (existsSync(skillsDir)) {
  for (const cat of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catPath = join(skillsDir, cat.name);
    for (const ent of readdirSync(catPath, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const skillPath = join(catPath, ent.name, "SKILL.md");
      if (existsSync(skillPath)) {
        skillEntries.push({ id: ent.name, location: `skills/${cat.name}/${ent.name}` });
      }
    }
  }
}

// Collect all agent IDs (external + internal)
const agentEntries = [];
for (const agentDir of ["agents", "agents-internal"]) {
  const full = join(contentRoot, agentDir);
  if (!existsSync(full)) continue;
  for (const f of readdirSync(full)) {
    if (!f.endsWith(".md") && !f.endsWith(".mdc")) continue;
    const id = f.replace(/\.(md|mdc)$/, "");
    agentEntries.push({ id, location: `${agentDir}/${f}` });
  }
}

checkUniqueness("skills", skillEntries);
checkUniqueness("agents + agents-internal", agentEntries);

if (failures > 0) {
  console.error(`\nvalidate-id-uniqueness: ${failures} duplicate(s) found — fix before merging`);
  process.exit(1);
} else {
  console.log(
    `validate-id-uniqueness: ${skillEntries.length} skill IDs and ${agentEntries.length} agent IDs are all unique`
  );
}
