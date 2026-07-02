#!/usr/bin/env node
/**
 * Contributor convenience: writes portable pn-core MCP entry (npx git + pn-core bin)
 * to ~/.cursor/mcp.json. MCP-first users should use the one-click deeplink or paste
 * the JSON from README instead — no clone required.
 *
 * Usage: node scripts/mcp-config-portable.mjs
 *        npm run mcp-config:portable
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { portableMcpServerEntry, warmCacheShellCommand } from "./mcp-install-config.mjs";

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

config.mcpServers["pn-core"] = portableMcpServerEntry();

mkdirSync(dirname(mcpPath), { recursive: true });
writeFileSync(mcpPath, JSON.stringify(config, null, 2), "utf8");
console.log("Wrote portable pn-core (npx git) to", mcpPath);
console.log("Reload Cursor (or restart the pn-core MCP server) for the change to take effect.");
console.log("");
console.log("First connect may exceed Cursor's MCP timeout. Pre-warm npx once:");
console.log(" ", warmCacheShellCommand());
console.log("  (Ctrl+C when it sits idle — cache is warm; then reload MCP in Cursor.)");
