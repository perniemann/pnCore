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

/** Tool names registered in tools/registry.ts (each `def(` call opens with the name). */
export function countTools(repoRoot) {
  const src = readFileSync(join(repoRoot, "packages/pn-core-mcp/src/tools/registry.ts"), "utf8");
  return new Set([...src.matchAll(/\bdef\(\s*"([a-z_]+)"/g)].map((m) => m[1])).size;
}

function countMd(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
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
    agents: countMd(join(repoRoot, "packages/pn-core-mcp/content/agents")),
    internalAgents: countMd(join(repoRoot, "packages/pn-core-mcp/content/agents-internal")),
    tools: countTools(repoRoot),
  };
}

export function parseReadmeCatalog(readme) {
  const catalogLine = readme.match(
    /\*\*Catalog:\*\* (\d+) skills, (\d+) public agents \+ (\d+) internal orchestration agents, (\d+) visible slash palette files.*?(\d+) palette-hidden.*?(\d+) command files total\), (\d+) MCP tools, (\d+) workflow types/
  );
  if (!catalogLine) return null;
  return {
    skills: Number(catalogLine[1]),
    agents: Number(catalogLine[2]),
    internalAgents: Number(catalogLine[3]),
    visible: Number(catalogLine[4]),
    hidden: Number(catalogLine[5]),
    commands: Number(catalogLine[6]),
    tools: Number(catalogLine[7]),
    workflows: Number(catalogLine[8]),
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

const MAINTAINED_DOC_ASSERTIONS = {
  "docs/companion-mcp-catalog.md": {
    required: [
      "https://github.com/brave/brave-search-mcp-server",
      "https://mcp.cloudflare.com/mcp",
      "McpAutomationBridge",
      "plugin-install --harness",
      "host_localsearch",
    ],
    forbidden: ["modelcontextprotocol/servers/tree/main/src/brave-search", "`MCPBridge` plugin"],
  },
  "docs/mcp-usage-guide.md": {
    required: ["category index with counts", "has no `/pn-game` command"],
    forbidden: ["npm run install -- --with-shadcn", "`pn-game`, etc."],
  },
  "docs/plugin-reference.md": {
    required: ["`sessionStart`", "`engine_feature` step 0"],
    forbidden: ["`unreal_feature` workflow step 0"],
  },
  "docs/how-to-use-guide.md": {
    required: [
      "| `feature_program` | 0–5 |",
      "| `implementation_tournament` | 0–5 |",
      "packages/pn-core-mcp/src/workflows.ts",
    ],
    forbidden: ["packages/pn-core-mcp/src/index.ts`](../packages/pn-core-mcp/src/index.ts)"],
  },
};

export function checkMaintainedDocs(repoRoot) {
  const mismatches = [];
  for (const [relPath, assertions] of Object.entries(MAINTAINED_DOC_ASSERTIONS)) {
    const text = readFileSync(join(repoRoot, relPath), "utf8");
    for (const required of assertions.required) {
      if (!text.includes(required)) {
        mismatches.push(`${relPath} missing maintained-doc marker ${JSON.stringify(required)}`);
      }
    }
    for (const forbidden of assertions.forbidden) {
      if (text.includes(forbidden)) {
        mismatches.push(`${relPath} contains stale marker ${JSON.stringify(forbidden)}`);
      }
    }
  }
  return mismatches;
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

  for (const key of Object.keys(expected)) {
    if (expected[key] !== actual[key])
      mismatches.push(`${key} README=${expected[key]} disk=${actual[key]}`);
  }

  const pnGuidePath = join(repoRoot, "packages/pn-core-mcp/content/commands/pn/start/pn-guide.md");
  const pnGuide = readFileSync(pnGuidePath, "utf8");
  for (const missing of checkPnGuideLiveCounts(pnGuide, actual)) {
    mismatches.push(`pn-guide.md missing live headline ${JSON.stringify(missing)}`);
  }
  mismatches.push(...checkMaintainedDocs(repoRoot));

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
    message: `check-doc-inventory: OK: ${actual.skills} skills, ${actual.agents}+${actual.internalAgents} agents, ${actual.commands} commands (${actual.visible}+${actual.hidden}), ${actual.tools} tools, ${actual.workflows} workflows; pn-guide and maintained docs match`,
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
