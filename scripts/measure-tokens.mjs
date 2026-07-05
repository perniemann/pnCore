#!/usr/bin/env node
/**
 * M2: Token baseline.
 *
 * Estimates tokens (chars / 4) for:
 *   (a) Bundle of all alwaysApply:true rules — loaded on every Cursor turn
 *   (b) MCP tool descriptions + input-schema .describe() text
 *   (c) Top-10 largest SKILL.md files by character count
 *
 * Usage:
 *   node scripts/measure-tokens.mjs           # print only
 *   node scripts/measure-tokens.mjs --write   # persist bench/baseline-tokens.json
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const contentRoot = join(root, "packages", "pn-core-mcp", "content");
const benchDir = join(root, "bench");
const doWrite = process.argv.includes("--write");

function tokenEst(chars) {
  return Math.round(chars / 4);
}
function pad(n, w = 6) {
  return String(n).padStart(w);
}

// ── (a) alwaysApply rules ─────────────────────────────────────────────────────

console.log("\n=== (a) alwaysApply rules (loaded every Cursor turn) ===");

const rulesDir = join(contentRoot, "rules");
const ruleEntries = readdirSync(rulesDir).filter((f) => f.endsWith(".mdc") || f.endsWith(".md"));

const alwaysApplyRules = [];
let alwaysApplyTotalChars = 0;

for (const f of ruleEntries) {
  const text = readFileSync(join(rulesDir, f), "utf-8");
  if (/alwaysApply:\s*true/i.test(text)) {
    const chars = text.length;
    alwaysApplyTotalChars += chars;
    alwaysApplyRules.push({ file: f, chars, estimatedTokens: tokenEst(chars) });
  }
}

alwaysApplyRules.sort((a, b) => b.chars - a.chars);

for (const r of alwaysApplyRules) {
  console.log(`  ${pad(r.chars)} chars  ≈ ${pad(r.estimatedTokens, 5)} tokens  ${r.file}`);
}
console.log(
  `\n  BUNDLE TOTAL: ${alwaysApplyTotalChars} chars  ≈ ${tokenEst(alwaysApplyTotalChars)} tokens  (${alwaysApplyRules.length} rules)`
);

// ── (b) MCP tool descriptions + schema .describe() text ──────────────────────

console.log("\n=== (b) MCP tool descriptions + schema .describe() text ===");

const indexSrc = readFileSync(
  join(root, "packages", "pn-core-mcp", "src", "tools", "registry.ts"),
  "utf-8"
);
const schemaSrc = readFileSync(
  join(root, "packages", "pn-core-mcp", "src", "tools", "schemas-zod.ts"),
  "utf-8"
);

// Extract tool descriptions from registry def("name", "Label", "description", ...)
const toolDescRe = /def\(\s*\n\s*"([^"]+)",\s*\n\s*"[^"]+",\s*\n\s*"((?:[^"\\]|\\.)*)"/gs;
const toolDescs = [];
let toolDescTotalChars = 0;

for (const m of indexSrc.matchAll(toolDescRe)) {
  const name = m[1];
  const desc = m[2];
  toolDescTotalChars += desc.length;
  toolDescs.push({ tool: name, descChars: desc.length, estimatedTokens: tokenEst(desc.length) });
}

// list/get tool descriptions are captured via registry def() blocks above.

// Extract all .describe("text") calls from Zod schemas
const describeRe = /\.describe\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
let schemaTotalChars = 0;
const schemaDescs = [];
for (const m of schemaSrc.matchAll(describeRe)) {
  schemaTotalChars += m[1].length;
  schemaDescs.push({
    chars: m[1].length,
    estimatedTokens: tokenEst(m[1].length),
    preview: m[1].slice(0, 80),
  });
}
schemaDescs.sort((a, b) => b.chars - a.chars);
toolDescs.sort((a, b) => b.descChars - a.descChars);

console.log("  Top 10 tool descriptions by length:");
for (const t of toolDescs.slice(0, 10)) {
  console.log(`    ${pad(t.descChars)} chars  ≈ ${pad(t.estimatedTokens, 5)} tokens  ${t.tool}`);
}
console.log(
  `\n  Tool descriptions total:       ${pad(toolDescTotalChars)} chars  ≈ ${pad(tokenEst(toolDescTotalChars), 5)} tokens`
);
console.log(
  `  Schema .describe() total:      ${pad(schemaTotalChars)} chars  ≈ ${pad(tokenEst(schemaTotalChars), 5)} tokens`
);
const totalToolSchema = toolDescTotalChars + schemaTotalChars;
console.log(
  `  TOOL+SCHEMA TOTAL:             ${pad(totalToolSchema)} chars  ≈ ${pad(tokenEst(totalToolSchema), 5)} tokens`
);

// ── (c) Top-10 SKILL.md files ─────────────────────────────────────────────────

console.log("\n=== (c) SKILL.md file sizes ===");

const skillsDir = join(contentRoot, "skills");
const skillFiles = [];

function walkDir(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(p);
    } else if (ent.name === "SKILL.md") {
      const text = readFileSync(p, "utf-8");
      const rel = p.replace(root + "\\", "").replace(root + "/", "");
      skillFiles.push({
        path: rel,
        id: ent.name === "SKILL.md" ? p.split(/[\\/]/).at(-2) : ent.name,
        chars: text.length,
        estimatedTokens: tokenEst(text.length),
      });
    }
  }
}

if (existsSync(skillsDir)) walkDir(skillsDir);
skillFiles.sort((a, b) => b.chars - a.chars);

console.log("  Top 10 by character count:");
for (const s of skillFiles.slice(0, 10)) {
  console.log(`    ${pad(s.chars)} chars  ≈ ${pad(s.estimatedTokens, 5)} tokens  ${s.id}`);
}

const skillTotalChars = skillFiles.reduce((sum, s) => sum + s.chars, 0);
console.log(
  `\n  Total skills: ${skillFiles.length}   all-loaded chars: ${skillTotalChars}  ≈ ${tokenEst(skillTotalChars)} tokens`
);

// ── Write ─────────────────────────────────────────────────────────────────────

const result = {
  generatedAt: new Date().toISOString(),
  alwaysApplyRules: {
    count: alwaysApplyRules.length,
    totalChars: alwaysApplyTotalChars,
    estimatedTokens: tokenEst(alwaysApplyTotalChars),
    files: alwaysApplyRules,
  },
  mcpToolSchemas: {
    toolDescCount: toolDescs.length,
    toolDescChars: toolDescTotalChars,
    schemaDescChars: schemaTotalChars,
    totalChars: totalToolSchema,
    estimatedTokens: tokenEst(totalToolSchema),
    topToolsByDescLength: toolDescs.slice(0, 10),
    topSchemaDescsByLength: schemaDescs.slice(0, 10),
  },
  skillFiles: {
    count: skillFiles.length,
    totalChars: skillTotalChars,
    estimatedTokensIfAllLoaded: tokenEst(skillTotalChars),
    top10: skillFiles.slice(0, 10),
  },
};

if (doWrite) {
  if (!existsSync(benchDir)) mkdirSync(benchDir, { recursive: true });
  const outPath = join(benchDir, "baseline-tokens.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nWritten → bench/baseline-tokens.json`);
} else {
  console.log("\nTip: run with --write to persist results to bench/baseline-tokens.json");
}
