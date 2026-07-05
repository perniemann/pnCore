#!/usr/bin/env node
/** Before loading @modelcontextprotocol/sdk: fix incomplete nested zod (npm layout quirk). */
import "./fix-sdk-zod-runtime.js";

/** Re-export workflowTypeEnum for repo validators that scan the MCP entry surface. */
export { workflowTypeEnum } from "./tools/schemas-zod.js";

await import("./adapters/mcp-server.js");
