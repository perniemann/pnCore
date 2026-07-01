#!/usr/bin/env node
/**
 * Generate MCP install deeplinks for pn-core.
 * Run from repo root. Outputs URLs for README and docs.
 */
import {
  mcpConfigNpx,
  mcpConfigWindowsCmd,
  mcpInstallUrls,
} from "./mcp-npx-config.mjs";

const primary = mcpInstallUrls(mcpConfigNpx);
const windows = mcpInstallUrls(mcpConfigWindowsCmd);

console.log("MCP install links (default: npx --package + pn-core bin):\n");
console.log("HTTPS (badge):", primary.https);
console.log("cursor://", primary.cursor);
console.log("\nPrimary config:", JSON.stringify(mcpConfigNpx, null, 2));
console.log("\nWindows cmd fallback:", windows.https);
console.log("\nBadge URL only:", primary.https);
console.log("\nBase64 (primary):", primary.configBase64);
