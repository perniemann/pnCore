#!/usr/bin/env node
/**
 * Checks if pn-core MCP is configured in project or user mcp.json.
 * Warns if not found. Use when project-context references pn-core but flows don't trigger.
 * Usage: node scripts/check-mcp-config.mjs [projectRoot]
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const projectRoot = process.argv[2] ? join(process.cwd(), process.argv[2]) : process.cwd();

const home = process.env.USERPROFILE || process.env.HOME || process.env.CURSOR_USER_DATA_DIR;
const userMcpPath = home ? join(home, ".cursor", "mcp.json") : null;
const projectMcpPath = join(projectRoot, ".cursor", "mcp.json");

function hasPnCore(path) {
  if (!path || !existsSync(path)) return false;
  try {
    const config = JSON.parse(readFileSync(path, "utf8"));
    return config?.mcpServers && "pn-core" in config.mcpServers;
  } catch {
    return false;
  }
}

const inProject = hasPnCore(projectMcpPath);
const inUser = userMcpPath && hasPnCore(userMcpPath);

if (inProject || inUser) {
  console.log("pn-core MCP: configured");
  if (inProject) console.log("  -> project:", projectMcpPath);
  if (inUser) console.log("  -> user:", userMcpPath);
} else {
  console.warn("pn-core MCP: NOT FOUND");
  console.warn("  Project rules may reference pn-core but flows will not trigger.");
  console.warn("  Add pn-core to .cursor/mcp.json (project) or ~/.cursor/mcp.json (user).");
  console.warn("  From pnCore repo: npm run mcp-config");
  process.exit(1);
}
