#!/usr/bin/env node
/**
 * Smoke test: npx install path connects and answers health within startup budgets.
 * Run: node scripts/smoke-npx-mcp-install.mjs
 *      npm run smoke:npx-mcp
 *
 * CI uses `file:${repoRoot}` (same as mcp-deeplink.test) — no network git clone per run.
 * Override with PNCORE_SMOKE_PACKAGE=git+https://... for a live remote smoke.
 *
 * Budgets (Cursor MCP connect ~60s):
 *   - Run 1 (cold-ish): connect + health <= COLD_MS (default 120000 on CI, 55000 locally)
 *   - Run 2 (warm cache): connect + health <= WARM_MS (default 10000)
 */
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PN_CORE_GIT_PACKAGE } from "./mcp-npx-config.mjs";
import { portableMcpServerEntryForPackage } from "./mcp-install-config.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageSpec =
  process.env.PNCORE_SMOKE_PACKAGE ?? (process.env.CI ? `file:${repoRoot}` : PN_CORE_GIT_PACKAGE);

const COLD_MS = Number(process.env.PNCORE_SMOKE_COLD_MS ?? (process.env.CI ? "120000" : "55000"));
const WARM_MS = Number(process.env.PNCORE_SMOKE_WARM_MS ?? "10000");

const entry = portableMcpServerEntryForPackage(packageSpec);
const smokeCwd = process.env.USERPROFILE || process.env.HOME || process.env.TMPDIR || process.cwd();

/**
 * @param {{ command: string; args: string[]; env?: Record<string, string> }} launchEntry
 * @param {number} budgetMs
 * @returns {Promise<number>}
 */
async function connectAndHealth(launchEntry, budgetMs) {
  const transport = new StdioClientTransport({
    command: launchEntry.command,
    args: launchEntry.args,
    env: { ...process.env, ...(launchEntry.env ?? {}) },
    cwd: smokeCwd,
    ...(process.platform === "win32" && launchEntry.command === "npx" ? { shell: true } : {}),
  });
  const client = new Client({ name: "pn-core-smoke", version: "1.0.0" }, { capabilities: {} });

  const t0 = Date.now();
  try {
    await Promise.race([
      (async () => {
        await client.connect(transport);
        const result = await client.callTool({ name: "health", arguments: {} });
        const first = result.content?.find((c) => c.type === "text" && "text" in c);
        if (!first || first.type !== "text") throw new Error("health: no text content");
        const parsed = JSON.parse(first.text);
        if (parsed.status !== "ok") throw new Error(`health status: ${parsed.status}`);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`connect + health exceeded ${budgetMs}ms`)), budgetMs)
      ),
    ]);
    return Date.now() - t0;
  } finally {
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
  }
}

console.log("smoke-npx-mcp: package", packageSpec);
console.log("smoke-npx-mcp: entry", JSON.stringify(entry));
console.log("smoke-npx-mcp: cwd", smokeCwd);
console.log(`smoke-npx-mcp: budgets cold<=${COLD_MS}ms warm<=${WARM_MS}ms`);

let failed = false;

try {
  const coldMs = await connectAndHealth(entry, COLD_MS);
  console.log(`smoke-npx-mcp: run 1 OK in ${coldMs}ms (budget ${COLD_MS}ms)`);
} catch (e) {
  console.error("smoke-npx-mcp: run 1 FAILED:", e.message);
  failed = true;
}

if (!failed) {
  try {
    const warmMs = await connectAndHealth(entry, WARM_MS);
    console.log(`smoke-npx-mcp: run 2 OK in ${warmMs}ms (budget ${WARM_MS}ms)`);
  } catch (e) {
    console.error("smoke-npx-mcp: run 2 FAILED:", e.message);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("smoke-npx-mcp: PASS");
