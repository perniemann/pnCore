#!/usr/bin/env node
/**
 * Rank skills missing EVAL.yaml for local-agent backfill batches.
 *
 * Priority: discipline → orchestration → ci → review → backend → frontend → other,
 * then recent git mtime of SKILL.md (newer first), then id.
 *
 * Usage:
 *   node scripts/list-eval-backfill.mjs
 *   node scripts/list-eval-backfill.mjs --limit 20
 *   node scripts/list-eval-backfill.mjs --batch-size 5 --batches 4
 *   node scripts/list-eval-backfill.mjs --json
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillsRoot = join(repoRoot, "packages", "pn-core-mcp", "content", "skills");

const TIER = {
  discipline: 0,
  orchestration: 1,
  ci: 2,
  review: 3,
  backend: 4,
  frontend: 5,
};

function parseArgs(argv) {
  let limit = 0;
  let batchSize = 5;
  let batches = 0;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--limit") limit = Number(argv[++i]) || 0;
    else if (a === "--batch-size") batchSize = Number(argv[++i]) || 5;
    else if (a === "--batches") batches = Number(argv[++i]) || 0;
  }
  return { limit, batchSize, batches, json };
}

function gitMtime(relPath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", relPath], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

function listMissing() {
  /** @type {{ id: string, category: string, tier: number, mtime: number, path: string }[]} */
  const missing = [];
  if (!existsSync(skillsRoot)) return missing;
  for (const catEnt of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!catEnt.isDirectory()) continue;
    const cat = catEnt.name;
    const catDir = join(skillsRoot, cat);
    for (const skillEnt of readdirSync(catDir, { withFileTypes: true })) {
      if (!skillEnt.isDirectory()) continue;
      const id = skillEnt.name;
      const skillDir = join(catDir, id);
      const skillMd = join(skillDir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      if (existsSync(join(skillDir, "EVAL.yaml"))) continue;
      const rel = join("packages/pn-core-mcp/content/skills", cat, id, "SKILL.md").replace(
        /\\/g,
        "/"
      );
      missing.push({
        id,
        category: cat,
        tier: TIER[cat] ?? 9,
        mtime: gitMtime(rel),
        path: rel,
      });
    }
  }
  missing.sort((a, b) => a.tier - b.tier || b.mtime - a.mtime || a.id.localeCompare(b.id));
  return missing;
}

function main() {
  const { limit, batchSize, batches, json } = parseArgs(process.argv.slice(2));
  let missing = listMissing();
  const total = missing.length;
  if (limit > 0) missing = missing.slice(0, limit);

  /** @type {string[][]} */
  const batchList = [];
  const nBatches = batches > 0 ? batches : Math.ceil(missing.length / Math.max(1, batchSize));
  for (let i = 0; i < nBatches; i++) {
    const slice = missing.slice(i * batchSize, (i + 1) * batchSize);
    if (slice.length) batchList.push(slice.map((s) => s.id));
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          totalMissing: total,
          shown: missing.length,
          priority: "discipline→orchestration→ci→review→backend→frontend→other, then recent mtime",
          skills: missing,
          batches: batchList,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    `list-eval-backfill: ${total} skill(s) missing EVAL.yaml (showing ${missing.length})`
  );
  console.log(
    "Priority: discipline → orchestration → ci → review → backend → frontend → other; then recent SKILL.md commit.\n"
  );
  for (const [i, row] of missing.entries()) {
    console.log(`${String(i + 1).padStart(3)}. ${row.id}  [${row.category}]`);
  }
  if (batchList.length) {
    console.log("\nSuggested local-agent batches:");
    for (const [i, ids] of batchList.entries()) {
      console.log(`  Batch ${i + 1}: ${ids.join(", ")}`);
    }
  }
  console.log("\nContract: pn-core://reference/eval-backfill.md");
  console.log('Command:  /pn-backfill-evals  (or get_command("pn-backfill-evals"))');
}

main();
