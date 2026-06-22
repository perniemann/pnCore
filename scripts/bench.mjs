#!/usr/bin/env node
/**
 * M1: CPU / wall-time baseline.
 *
 * Times:
 *   1. Each validate sub-step individually (same steps as npm run validate)
 *   2. Cold + warm MCP content calls: list_skills, get_skill, list_agents,
 *      list_commands, get_resource, workflow_step
 *   3. Full sync:content run
 *   4. Clean tsc build + repeat build (measures incremental saving)
 *
 * Usage:
 *   node scripts/bench.mjs           # print only
 *   node scripts/bench.mjs --write   # persist bench/baseline-cpu.json
 */
import { spawnSync } from "child_process";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { performance } from "node:perf_hooks";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const benchDir = join(root, "bench");
const doWrite = process.argv.includes("--write");
const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";

// ── helpers ──────────────────────────────────────────────────────────────────

function spawnTimed(label, cmd, args, useShell = false, cwd = root) {
  const t0 = performance.now();
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf-8",
    timeout: 180_000,
    env: process.env,
    shell: useShell || (isWin && cmd === npm),
  });
  const ms = Math.round(performance.now() - t0);
  const ok = (r.status ?? -1) === 0;
  return { label, ms, ok, exitCode: r.status ?? -1 };
}

function pad(n, w = 5) {
  return String(n).padStart(w);
}

// ── 1. Validate sub-steps ─────────────────────────────────────────────────────

console.log("\n=== validate sub-steps ===");

const validateScripts = [
  "validate-version.mjs",
  "validate-template.mjs",
  "validate-specialists.mjs",
  "validate-stacks.mjs",
  "validate-mcp-proactive-ids.mjs",
  "validate-skill-references.mjs",
  "validate-workflow-skill-refs.mjs",
  "validate-workflow-contract.mjs",
  "validate-workflow-enums.mjs",
  "check-context-index.mjs",
  "check-ac-traceability.mjs",
  "check-commit-no-ide-trailers.mjs",
  "check-content-plugin-sync.mjs",
  "validate-integration-skill-sections.mjs",
];

const validateResults = [];

// format:check via npm (must come first, as it does in npm run validate)
{
  const r = spawnTimed("format:check", npm, ["run", "format:check"]);
  validateResults.push(r);
  console.log(`  ${pad(r.ms)}ms  ${r.ok ? "✓" : "✗"}  format:check`);
}

for (const s of validateScripts) {
  const r = spawnTimed(s, "node", [join("scripts", s)]);
  validateResults.push(r);
  console.log(`  ${pad(r.ms)}ms  ${r.ok ? "✓" : "✗"}  ${s}`);
}

const validateTotalMs = validateResults.reduce((sum, r) => sum + r.ms, 0);
console.log(`\n  sequential total: ${validateTotalMs}ms`);

// W1: wall-time for the full `npm run validate` (uses validate-parallel.mjs)
const validateWall = spawnTimed("validate (wall)", npm, ["run", "validate"]);
console.log(`  wall time (npm run validate): ${validateWall.ms}ms`);

// ── 2. MCP content calls (cold + warm) ───────────────────────────────────────

const distContent = join(root, "packages", "pn-core-mcp", "dist", "content.js");
const distWorkflows = join(root, "packages", "pn-core-mcp", "dist", "workflows.js");

const contentResults = [];

if (!existsSync(distContent)) {
  console.warn(
    "\n⚠ dist/content.js not found — skipping content bench (run npm run build:mcp first)"
  );
} else {
  console.log("\n=== MCP content calls (cold=first, warm=avg 10 reps) ===");

  const { listSkills, getSkill, listAgents, listCommands, getResource } = await import(
    pathToFileURL(distContent).href
  );
  const { getWorkflowStep } = await import(pathToFileURL(distWorkflows).href);

  const WARM_REPS = 10;

  function benchContent(label, fn) {
    const tc = performance.now();
    fn();
    const cold_ms = Math.round(performance.now() - tc);

    const tw = performance.now();
    for (let i = 0; i < WARM_REPS; i++) fn();
    const warm_ms = Math.round((performance.now() - tw) / WARM_REPS);

    console.log(`  cold ${pad(cold_ms, 4)}ms  warm ${pad(warm_ms, 3)}ms  ${label}`);
    return { label, cold_ms, warm_ms };
  }

  contentResults.push(benchContent("list_skills(no filter)", () => listSkills()));
  contentResults.push(
    benchContent("list_skills(category=orchestration)", () => listSkills("orchestration"))
  );
  contentResults.push(
    benchContent("get_skill(pn-discovery-questionnaire)", () =>
      getSkill("pn-discovery-questionnaire")
    )
  );
  contentResults.push(
    benchContent("get_skill(pn-writing-plans)", () => getSkill("pn-writing-plans"))
  );
  contentResults.push(benchContent("list_agents", () => listAgents()));
  contentResults.push(benchContent("list_commands", () => listCommands()));
  contentResults.push(
    benchContent("get_resource(reference/best-practices.md)", () =>
      getResource("pn-core://reference/best-practices.md")
    )
  );
  contentResults.push(
    benchContent("workflow_step(full_dev,1)", () => getWorkflowStep("full_dev", 1, {}))
  );
  contentResults.push(
    benchContent("workflow_step(full_dev,3)", () => getWorkflowStep("full_dev", 3, {}))
  );
}

// ── 3. sync:content ───────────────────────────────────────────────────────────

console.log("\n=== sync:content ===");
const syncResult = spawnTimed("sync:content", npm, ["run", "sync:content"]);
console.log(`  ${syncResult.ms}ms  ${syncResult.ok ? "✓" : "✗"}`);

// ── 4. tsc build ──────────────────────────────────────────────────────────────

console.log("\n=== tsc build ===");
const buildClean = spawnTimed("tsc_clean", npm, ["run", "build:mcp"]);
const buildRepeat = spawnTimed("tsc_repeat", npm, ["run", "build:mcp"]);
console.log(
  `  clean: ${buildClean.ms}ms  repeat: ${buildRepeat.ms}ms  savings: ${buildClean.ms - buildRepeat.ms}ms`
);

// W3: tsc-only incremental (excludes npm install overhead in build:mcp)
const mcpDir = join(root, "packages", "pn-core-mcp");
// Delete .tsbuildinfo so first run is truly clean
const tsBuildInfo = join(mcpDir, ".tsbuildinfo");
if (existsSync(tsBuildInfo)) {
  const { unlinkSync } = await import("fs");
  unlinkSync(tsBuildInfo);
}
const tscOnly = spawnTimed("tsc_only_clean", npm, ["exec", "tsc"], false, mcpDir);
const tscOnlyRepeat = spawnTimed("tsc_only_incremental", npm, ["exec", "tsc"], false, mcpDir);
console.log(
  `  tsc-only clean: ${tscOnly.ms}ms  tsc-only incremental: ${tscOnlyRepeat.ms}ms  savings: ${tscOnly.ms - tscOnlyRepeat.ms}ms (${Math.round(((tscOnly.ms - tscOnlyRepeat.ms) / tscOnly.ms) * 100)}%)`
);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n=== Summary ===");
console.log(`  validate total (sequential):  ${validateTotalMs}ms`);
console.log(`  validate wall (npm run validate): ${validateWall.ms}ms`);
console.log(
  `  validate slowest step:        ${[...validateResults].sort((a, b) => b.ms - a.ms)[0]?.label} (${[...validateResults].sort((a, b) => b.ms - a.ms)[0]?.ms}ms)`
);
console.log(`  tsc clean: ${buildClean.ms}ms  tsc repeat: ${buildRepeat.ms}ms`);
console.log(`  tsc-only clean: ${tscOnly.ms}ms  tsc-only incremental: ${tscOnlyRepeat.ms}ms`);
console.log(`  sync:content: ${syncResult.ms}ms`);

// ── Write ─────────────────────────────────────────────────────────────────────

const result = {
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  validate: validateResults,
  validateTotalMs,
  validateWallMs: validateWall.ms,
  content: contentResults,
  sync: syncResult,
  build: {
    tsc_clean_ms: buildClean.ms,
    tsc_clean_ok: buildClean.ok,
    tsc_repeat_ms: buildRepeat.ms,
    tsc_repeat_ok: buildRepeat.ok,
    incremental_saving_ms: buildClean.ms - buildRepeat.ms,
    tsc_only_clean_ms: tscOnly.ms,
    tsc_only_clean_ok: tscOnly.ok,
    tsc_only_incremental_ms: tscOnlyRepeat.ms,
    tsc_only_incremental_ok: tscOnlyRepeat.ok,
    tsc_only_saving_ms: tscOnly.ms - tscOnlyRepeat.ms,
    tsc_only_saving_pct: Math.round(((tscOnly.ms - tscOnlyRepeat.ms) / tscOnly.ms) * 100),
  },
};

if (doWrite) {
  if (!existsSync(benchDir)) mkdirSync(benchDir, { recursive: true });
  const outPath = join(benchDir, "baseline-cpu.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nWritten → bench/baseline-cpu.json`);
} else {
  console.log("\nTip: run with --write to persist results to bench/baseline-cpu.json");
}
