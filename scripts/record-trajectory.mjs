#!/usr/bin/env node
/**
 * Turn one recorded workflow run from `.pncore/workflow-runs.jsonl` into a replay fixture
 * under packages/pn-core-mcp/src/fixtures/trajectories/ (ADR-0019).
 *
 *   npm run trajectory:record -- --list [--log <path>]
 *   npm run trajectory:record -- --run-id <id> --name <fixture-name> [--log <path>] [--out <file>] [--force]
 *   npm run trajectory:record -- --latest --name <fixture-name>
 *
 * The run must have been recorded with PNCORE_RUN_LOG_STATE=1 in the MCP server env, otherwise
 * entries carry only state key names and replay cannot verify value-based routing.
 *
 * Exit codes: 0 ok, 1 usage / not found / missing state, 2 fixture exists (use --force).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distTrajectory = join(repoRoot, "packages", "pn-core-mcp", "dist", "trajectory.js");
const fixturesDir = join(repoRoot, "packages", "pn-core-mcp", "src", "fixtures", "trajectories");

function usage(code = 1) {
  console.error(
    [
      "record-trajectory: build a replay fixture from .pncore/workflow-runs.jsonl",
      "",
      "  --list                 list recorded runs (runId, workflow, steps, first ts)",
      "  --run-id <id>          run to export",
      "  --latest               export the most recently started run",
      "  --name <fixture-name>  fixture file name (kebab-case, no extension)",
      "  --log <path>           run log (default .pncore/workflow-runs.jsonl or $PNCORE_RUN_LOG)",
      "  --out <file>           output path (default packages/pn-core-mcp/src/fixtures/trajectories/<name>.json)",
      "  --force                overwrite an existing fixture",
    ].join("\n")
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = { list: false, latest: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) usage();
      i++;
      return v;
    };
    if (a === "--list") out.list = true;
    else if (a === "--latest") out.latest = true;
    else if (a === "--force") out.force = true;
    else if (a === "--run-id") out.runId = next();
    else if (a === "--name") out.name = next();
    else if (a === "--log") out.log = next();
    else if (a === "--out") out.out = next();
    else if (a === "--help" || a === "-h") usage(0);
    else usage();
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(distTrajectory)) {
    console.error(`record-trajectory: ${distTrajectory} missing — run npm run build:mcp first.`);
    process.exit(1);
  }
  const lib = await import(pathToFileURL(distTrajectory).href);

  const logPath = resolve(
    process.cwd(),
    args.log ?? (process.env.PNCORE_RUN_LOG || ".pncore/workflow-runs.jsonl")
  );
  if (!existsSync(logPath)) {
    console.error(`record-trajectory: run log not found: ${logPath}`);
    process.exit(1);
  }
  const { entries, skipped } = lib.parseRunLog(readFileSync(logPath, "utf-8"));
  const groups = lib.groupRunLogByRun(entries);
  if (skipped > 0) console.error(`record-trajectory: skipped ${skipped} malformed line(s)`);

  const runs = [...groups.entries()]
    .map(([runId, list]) => ({
      runId,
      workflowType: list[0].workflowType,
      steps: list.length,
      firstTs: list[0].ts,
      withState: list.every((e) => e.state),
    }))
    .sort((a, b) => a.firstTs.localeCompare(b.firstTs));

  if (args.list) {
    if (runs.length === 0) {
      console.log(`No runs in ${logPath}`);
      return;
    }
    console.log(`Runs in ${logPath}:`);
    for (const r of runs) {
      console.log(
        `  ${r.runId}  ${r.workflowType.padEnd(24)} ${String(r.steps).padStart(3)} steps  ${r.firstTs || "(no ts)"}  ${r.withState ? "state ✓" : "state ✗ (set PNCORE_RUN_LOG_STATE=1)"}`
      );
    }
    return;
  }

  let runId = args.runId;
  if (args.latest) {
    if (runs.length === 0) {
      console.error(`record-trajectory: no runs in ${logPath}`);
      process.exit(1);
    }
    runId = runs[runs.length - 1].runId;
  }
  if (!runId || !args.name) usage();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.name)) {
    console.error("record-trajectory: --name must be kebab-case (a-z, 0-9, -)");
    process.exit(1);
  }
  const list = groups.get(runId);
  if (!list) {
    console.error(`record-trajectory: run ${runId} not found in ${logPath} (use --list)`);
    process.exit(1);
  }

  let trajectory;
  try {
    trajectory = lib.trajectoryFromRunLog(list, { name: args.name, runId });
  } catch (err) {
    console.error(`record-trajectory: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  const problems = lib.checkTrajectoryContinuity(trajectory);
  if (problems.length > 0) {
    console.error("record-trajectory: recorded run is not a continuous trajectory:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const outPath = args.out
    ? isAbsolute(args.out)
      ? args.out
      : resolve(process.cwd(), args.out)
    : join(fixturesDir, `${args.name}.json`);
  if (existsSync(outPath) && !args.force) {
    console.error(`record-trajectory: ${outPath} exists (pass --force to overwrite)`);
    process.exit(2);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(trajectory, null, 2) + "\n", "utf-8");

  const replay = lib.replayTrajectory(trajectory);
  console.log(`Wrote ${outPath}`);
  console.log(`  ${lib.describeTrajectory(trajectory)}`);
  console.log(
    replay.ok
      ? `  replay against current engine: OK (${replay.stepsReplayed} steps)`
      : `  replay against current engine: ${replay.mismatches.length} mismatch(es) — engine already drifted from this recording`
  );
  for (const m of replay.mismatches) {
    console.log(
      `    #${m.index} step ${m.step} ${m.field}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)}`
    );
  }
}

main().catch((err) => {
  console.error(`record-trajectory: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
