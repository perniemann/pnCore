#!/usr/bin/env node
/**
 * Assert README catalog counts match on-disk inventory, and that pn-guide.md
 * states the live visible/hidden command headlines (not last quarter's numbers).
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { partitionCommands } from "./command-slash-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = join(__dirname, "..");

export function walkSkills(dir) {
  let out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walkSkills(p));
    else if (ent.name === "SKILL.md") out.push(p);
  }
  return out;
}

export function countWorkflowTypes(repoRoot) {
  const src = readFileSync(join(repoRoot, "packages/pn-core-mcp/src/tools/schemas-zod.ts"), "utf8");
  const block = src.match(/workflowTypeEnum\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/);
  if (!block) throw new Error("workflowTypeEnum not found in schemas-zod.ts");
  return (block[1].match(/"[^"]+"/g) ?? []).length;
}

export function collectInventory(repoRoot) {
  const skillsDir = join(repoRoot, "packages/pn-core-mcp/content/skills");
  const commandsDir = join(repoRoot, "packages/pn-core-mcp/content/commands");
  const partition = partitionCommands(commandsDir);
  return {
    skills: walkSkills(skillsDir).length,
    visible: partition.visible.length,
    hidden: partition.hidden.length,
    commands: partition.visible.length + partition.hidden.length,
    workflows: countWorkflowTypes(repoRoot),
  };
}

export function parseReadmeCatalog(readme) {
  const catalogLine = readme.match(
    /\*\*Catalog:\*\* (\d+) skills.*?(\d+) visible slash palette files.*?(\d+) palette-hidden.*?(\d+) command files total\).*?(\d+) workflow types/
  );
  if (!catalogLine) return null;
  return {
    skills: Number(catalogLine[1]),
    visible: Number(catalogLine[2]),
    hidden: Number(catalogLine[3]),
    commands: Number(catalogLine[4]),
    workflows: Number(catalogLine[5]),
  };
}

/** Live headlines that pn-guide.md must contain. submenu = visible minus `/pn` stub. */
export function pnGuideLiveHeadlines(actual) {
  const submenuLeaves = actual.visible - 1;
  return [
    `**${submenuLeaves}** leaves`,
    `**${actual.visible}** visible palette files total`,
    `**${actual.hidden}** palette-hidden`,
  ];
}

export function checkPnGuideLiveCounts(pnGuideText, actual) {
  return pnGuideLiveHeadlines(actual).filter((h) => !pnGuideText.includes(h));
}

export function runCheck(repoRoot = defaultRepoRoot) {
  const actual = collectInventory(repoRoot);
  const mismatches = [];

  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const expected = parseReadmeCatalog(readme);
  if (!expected) {
    return {
      ok: false,
      actual,
      mismatches: ["README catalog line not found or format changed"],
      message: "check-doc-inventory: README catalog line not found or format changed",
    };
  }

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

  const pnGuidePath = join(repoRoot, "packages/pn-core-mcp/content/commands/pn/start/pn-guide.md");
  const pnGuide = readFileSync(pnGuidePath, "utf8");
  for (const missing of checkPnGuideLiveCounts(pnGuide, actual)) {
    mismatches.push(`pn-guide.md missing live headline ${JSON.stringify(missing)}`);
  }

  if (mismatches.length) {
    return {
      ok: false,
      actual,
      mismatches,
      message: "check-doc-inventory: catalog drift:\n  " + mismatches.join("\n  "),
    };
  }

  return {
    ok: true,
    actual,
    mismatches: [],
    message: `check-doc-inventory: OK — ${actual.skills} skills, ${actual.commands} commands (${actual.visible}+${actual.hidden}), ${actual.workflows} workflows; pn-guide live headlines match`,
  };
}

function isExecutedDirectly() {
  return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
}

if (isExecutedDirectly()) {
  const result = runCheck(defaultRepoRoot);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(result.message);
}
