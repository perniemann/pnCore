import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * Build the pn-core MCP server with every tool, resource and prompt registered, unconnected.
 * stdio (`startStdioServer`) and in-process tests (InMemoryTransport) share this one surface.
 */
export declare function createPnCoreServer(): McpServer;
/** Connect a fresh server to stdio; the `pn-core` bin entry. */
export declare function startStdioServer(): Promise<McpServer>;
