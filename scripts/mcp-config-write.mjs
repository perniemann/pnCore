#!/usr/bin/env node
/**
 * Writes pn-core MCP entry with node + path to the user's global Cursor MCP config.
 * Use when cmd+npx fails on Windows with 'pn-core' is not recognized.
 * Run from repo root after: npm run build:mcp
 * Usage: node scripts/mcp-config-write.mjs
 *
 * Picks Node matching `.nvmrc` (or root engines): current process.execPath when major matches,
 * else NVM_HOME / NVM_DIR installs, else `"node"` on PATH — unless **PNCORE_MCP_NODE** is set
 * to a full path (wins over auto-resolve).
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { resolveMcpNode } from "./mcp-node-resolve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const mcpEntryPath = resolve(repoRoot, "packages", "pn-core-mcp", "dist", "index.js");

if (!existsSync(mcpEntryPath)) {
  console.error("Run from repo root: npm run build:mcp");
  process.exit(1);
}

const home = process.env.USERPROFILE || process.env.HOME || process.env.CURSOR_USER_DATA_DIR;
if (!home) {
  console.error("Could not determine home directory (USERPROFILE/HOME)");
  process.exit(1);
}

const mcpPath = join(home, ".cursor", "mcp.json");
let config = { mcpServers: {} };
if (existsSync(mcpPath)) {
  try {
    config = JSON.parse(readFileSync(mcpPath, "utf8"));
    if (!config.mcpServers) config.mcpServers = {};
  } catch (e) {
    console.warn("Could not parse existing mcp.json, will merge:", e.message);
  }
}

const { command: nodeCmd, pinnedBy, warn } = resolveMcpNode({ repoRoot });
config.mcpServers["pn-core"] = {
  command: nodeCmd,
  args: [mcpEntryPath],
};

mkdirSync(dirname(mcpPath), { recursive: true });
writeFileSync(mcpPath, JSON.stringify(config, null, 2), "utf8");
console.log("Wrote pn-core (node + path) to", mcpPath);
console.log("Node command:", nodeCmd, `(${pinnedBy})`);
if (warn) console.warn(warn);
console.log("Reload Cursor (or the MCP server) for the change to take effect.");
