#!/usr/bin/env node
/**
 * Runs all independent validators in parallel.
 * Called by: npm run validate (between format:check and validate-workflow-contract).
 *
 * Scripts listed here are file-only validators with no build-artifact dependencies.
 * validate-workflow-contract.mjs is excluded — it requires packages/pn-core-mcp/dist/.
 */
import { spawn } from "child_process";
import { performance } from "node:perf_hooks";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

const PARALLEL_SCRIPTS = [
  "scripts/validate-version.mjs",
  "scripts/validate-template.mjs",
  "scripts/validate-specialists.mjs",
  "scripts/validate-stacks.mjs",
  "scripts/validate-mcp-proactive-ids.mjs",
  "scripts/validate-skill-references.mjs",
  "scripts/validate-workflow-skill-refs.mjs",
  "scripts/validate-workflow-enums.mjs",
  "scripts/check-context-index.mjs",
  "scripts/check-ac-traceability.mjs",
  "scripts/check-commit-no-ide-trailers.mjs",
  "scripts/check-content-plugin-sync.mjs",
  "scripts/validate-integration-skill-sections.mjs",
  "scripts/validate-assets.mjs",
  "scripts/validate-contracts.mjs",
  "scripts/validate-id-uniqueness.mjs",
];

/** Runs a single script and resolves with its result (buffered output). */
function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, scriptPath)], {
      cwd: root,
      env: process.env,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });

    child.on("close", (code) => {
      resolve({ scriptPath, code: code ?? -1, stdout, stderr });
    });
  });
}

const t0 = performance.now();
const results = await Promise.all(PARALLEL_SCRIPTS.map(runScript));
const elapsed = Math.round(performance.now() - t0);

let failures = 0;
for (const { scriptPath, code, stdout, stderr } of results) {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (code !== 0) {
    console.error(`\n✗ ${scriptPath} exited with code ${code}`);
    failures++;
  }
}

const label = `validate-parallel (${PARALLEL_SCRIPTS.length} scripts, ${elapsed} ms wall)`;
if (failures > 0) {
  console.error(`\n${label}: ${failures} failed`);
  process.exit(1);
} else {
  console.log(`${label}: all passed`);
}
