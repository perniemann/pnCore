#!/usr/bin/env node
/**
 * Checks pn-core MCP in project or user mcp.json.
 * Validates portable vs dev-only config; optional live smoke test.
 *
 * Usage:
 *   node scripts/check-mcp-config.mjs [projectRoot]
 *   node scripts/check-mcp-config.mjs --smoke [projectRoot]
 *
 * Env:
 *   PNCORE_MCP_ALLOW_LOCAL=1  — do not fail on dev-only absolute paths (pnCore developers)
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { classifyPnCoreEntry, warmCacheShellCommand } from "./mcp-install-config.mjs";

const argv = process.argv.slice(2);
const smoke = argv.includes("--smoke");
const positional = argv.filter((a) => a !== "--smoke");
const projectRoot = positional[0] ? join(process.cwd(), positional[0]) : process.cwd();
const allowLocal = process.env.PNCORE_MCP_ALLOW_LOCAL === "1";

const home = process.env.USERPROFILE || process.env.HOME || process.env.CURSOR_USER_DATA_DIR;
const userMcpPath = home ? join(home, ".cursor", "mcp.json") : null;
const projectMcpPath = join(projectRoot, ".cursor", "mcp.json");

/** @param {string | null} path */
function loadMcpConfig(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** @param {string | null} path */
function getPnCoreEntry(path) {
  const config = loadMcpConfig(path);
  return config?.mcpServers?.["pn-core"] ?? null;
}

const projectEntry = getPnCoreEntry(projectMcpPath);
const userEntry = getPnCoreEntry(userMcpPath);
const entry = projectEntry ?? userEntry;
const entryPath = projectEntry ? projectMcpPath : userEntry ? userMcpPath : null;

let exitCode = 0;

if (!entry) {
  console.warn("pn-core MCP: NOT FOUND");
  console.warn("  Project rules may reference pn-core but flows will not trigger.");
  console.warn("  Add pn-core to .cursor/mcp.json (project) or ~/.cursor/mcp.json (user).");
  console.warn("  Portable install: one-click deeplink or README MCP JSON");
  console.warn("  Dev-only (this clone): npm run mcp-config:dev");
  process.exit(1);
}

console.log("pn-core MCP: configured");
if (projectEntry) console.log("  -> project:", projectMcpPath);
if (userEntry) console.log("  -> user:", userMcpPath);

const classification = classifyPnCoreEntry(entry);
console.log(`  -> mode: ${classification.reason}`);

if (classification.brokenPortable) {
  console.error("");
  console.error("pn-core MCP: BROKEN portable config (relative node path).");
  console.error(
    "  Cursor cwd is not the pnCore repo — node resolves packages/... under your home dir."
  );
  console.warn(
    "  Fix: use one-click install or README npx JSON with `-- pn-core` (not node packages/...)"
  );
  exitCode = 1;
}

if (classification.localDev && !allowLocal) {
  console.error("");
  console.error("pn-core MCP: NON-PORTABLE local path detected.");
  console.error("  Absolute paths (e.g. X:\\pnCore\\...) break on other machines.");
  console.error("  Fix: one-click install or README MCP JSON (npx + `-- pn-core`)");
  console.error("  Dev override: set PNCORE_MCP_ALLOW_LOCAL=1 when using npm run mcp-config:dev");
  exitCode = 1;
}

if (!classification.portable && !classification.localDev) {
  console.warn("");
  console.warn("pn-core MCP: unrecognized command shape — expected npx git install.");
  console.warn("  Fix: one-click install or README MCP JSON (npx + `-- pn-core`)");
  exitCode = 1;
}

if (classification.portable) {
  console.log("");
  console.log("  Pre-warm before first Cursor connect (avoids ~60s MCP timeout):");
  console.log("  ", warmCacheShellCommand());
}

if (smoke && entry && entryPath) {
  const budgetMs = Number(process.env.PNCORE_SMOKE_COLD_MS ?? "55000");
  console.log("");
  console.log(`  Smoke test (connect + health, budget ${budgetMs}ms)...`);

  const transport = new StdioClientTransport({
    command: entry.command,
    args: entry.args,
    env: process.env,
  });
  const client = new Client({ name: "check-mcp-smoke", version: "1.0.0" }, { capabilities: {} });

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
        setTimeout(() => reject(new Error(`smoke exceeded ${budgetMs}ms`)), budgetMs)
      ),
    ]);
    console.log(`  Smoke OK in ${Date.now() - t0}ms`);
  } catch (e) {
    console.error(`  Smoke FAILED: ${e.message}`);
    if (classification.portable) {
      console.error("  Try pre-warming:", warmCacheShellCommand());
    }
    exitCode = 1;
  } finally {
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
  }
}

process.exit(exitCode);
