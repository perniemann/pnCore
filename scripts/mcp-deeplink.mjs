#!/usr/bin/env node
/**
 * Generate MCP install deeplinks for pn-core.
 * Run from repo root. Outputs URLs for README and docs.
 */
const mcpConfig = {
  command: "cmd",
  args: [
    "/c",
    "npx",
    "-y",
    "--package=git+https://github.com/perniemann/pnCore.git#main",
    "--",
    "node",
    "packages/pn-core-mcp/dist/index.js",
  ],
};
const configBase64 = Buffer.from(JSON.stringify(mcpConfig), "utf-8").toString("base64");
const httpsUrl = `https://cursor.com/en/install-mcp?name=pn-core&config=${configBase64}`;
const cursorProto = `cursor://anysphere.cursor-deeplink/mcp/install?name=pn-core&config=${configBase64}`;

console.log("MCP install links (Windows: cmd + npx --package + node path):\n");
console.log("HTTPS:", httpsUrl);
console.log("cursor://", cursorProto);
console.log("\nConfig:", JSON.stringify(mcpConfig, null, 2));
