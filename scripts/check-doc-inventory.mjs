#!/usr/bin/env node
/**
 * Assert README catalog counts match on-disk inventory.
 * Prevents static prose drift for skills, commands, and workflow types.
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { partitionCommands } from "./command-slash-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function walkSkills(dir) {
  let out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walkSkills(p));
    else if (ent.name === "SKILL.md") out.push(p);
  }
  return out;
}

function countWorkflowTypes() {
  const src = readFileSync(
    join(repoRoot, "packages/pn-core-mcp/src/tools/schemas-zod.ts"),
    "utf8"
  );
  const block = src.match(/workflowTypeEnum\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/);
  if (!block) throw new Error("workflowTypeEnum not found in schemas-zod.ts");
  return (block[1].match(/"[^"]+"/g) ?? []).length;
}

const skillsDir = join(repoRoot, "packages/pn-core-mcp/content/skills");
const commandsDir = join(repoRoot, "packages/pn-core-mcp/content/commands");
const readmePath = join(repoRoot, "README.md");

const partition = partitionCommands(commandsDir);
const actual = {
  skills: walkSkills(skillsDir).length,
  visible: partition.visible.length,
  hidden: partition.hidden.length,
  commands: partition.visible.length + partition.hidden.length,
  workflows: countWorkflowTypes(),
};

const readme = readFileSync(readmePath, "utf8");
const catalogLine = readme.match(
  /\*\*Catalog:\*\* (\d+) skills.*?(\d+) visible slash palette files.*?(\d+) palette-hidden.*?(\d+) command files total\).*?(\d+) workflow types/
);

if (!catalogLine) {
  console.error("check-doc-inventory: README catalog line not found or format changed");
  process.exit(1);
}

const expected = {
  skills: Number(catalogLine[1]),
  visible: Number(catalogLine[2]),
  hidden: Number(catalogLine[3]),
  commands: Number(catalogLine[4]),
  workflows: Number(catalogLine[5]),
};

const mismatches = [];
if (expected.skills !== actual.skills)
  mismatches.push(`skills README=${expected.skills} disk=${actual.skills}`);
if (expected.visible !== actual.visible)
  mismatches.push(`visible commands README=${expected.visible} disk=${actual.visible}`);
if (expected.hidden !== actual.hidden)
  mismatches.push(`hidden commands README=${expected.hidden} disk=${actual.hidden}`);
if (expected.commands !== actual.commands)
  mismatches.push(`commands README=${expected.commands} disk=${actual.commands}`);
if (expected.workflows !== actual.workflows)
  mismatches.push(`workflows README=${expected.workflows} disk=${actual.workflows}`);

if (mismatches.length) {
  console.error("check-doc-inventory: README catalog drift:\n  " + mismatches.join("\n  "));
  process.exit(1);
}

console.log(
  `check-doc-inventory: OK — ${actual.skills} skills, ${actual.commands} commands (${actual.visible}+${actual.hidden}), ${actual.workflows} workflows`
);
