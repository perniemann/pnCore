#!/usr/bin/env node
/**
 * DEV ONLY — writes pn-core MCP with absolute local node + dist path (not portable).
 * For end users use the one-click deeplink or README MCP JSON.
 *
 * Run from repo root after: npm run build:mcp
 * Usage: node scripts/mcp-config-write.mjs
 *        npm run mcp-config:dev
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
console.log("Wrote pn-core DEV entry (local node + path) to", mcpPath);
console.log("Node command:", nodeCmd, `(${pinnedBy})`);
console.warn("This path is machine-specific — do not copy to other PCs.");
console.warn("Portable install: one-click deeplink or README MCP JSON (npx + `-- pn-core`).");
if (warn) console.warn(warn);
console.log("Reload Cursor (or the MCP server) for the change to take effect.");
