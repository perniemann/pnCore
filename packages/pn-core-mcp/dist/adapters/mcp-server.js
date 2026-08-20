import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { listAgents, listCommands, getAgent, getCommand, getResource, resourceDefs, } from "../content.js";
import { loadFeatures } from "../features.js";
import { debug } from "../debug.js";
import { MCP_VERSION } from "../tools/tool-runtime.js";
import { contextArgSchema } from "../tools/schemas-zod.js";
import { PN_CORE_TOOLS } from "../tools/registry.js";
const ERROR_CODE_TO_JSON_RPC = {
    NOT_FOUND: -32004,
    INVALID_STATE: -32600,
    APPROVAL_REQUIRED: -32003,
    FILE_NOT_FOUND: -32004,
    IO_ERROR: -32603,
    PARSE_ERROR: -32700,
    PATH_TRAVERSAL: -32602,
    INVALID_GATE: -32602,
    DISPOSE_UNAVAILABLE: -32005,
    INVALID_ARGV: -32602,
};
const server = new McpServer({ name: "pn-core-mcp", version: MCP_VERSION }, { capabilities: { prompts: {}, resources: {} } });
function regTool(name, description, schema, annotations, handler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.tool(name, description, schema, annotations, handler);
}
function regPrompt(name, description, schema, handler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.prompt(name, description, schema, handler);
}
function throwMcpError(code, message, data) {
    throw new McpError(ERROR_CODE_TO_JSON_RPC[code], message, data);
}
function promptMessages(content, context) {
    const text = context ? `${content}\n\n---\n\n**User context:**\n${context}` : content;
    return {
        messages: [{ role: "user", content: { type: "text", text } }],
    };
}
for (const tool of PN_CORE_TOOLS) {
    regTool(tool.name, tool.description, tool.zodSchema, tool.annotations, tool.handler);
}
for (const def of resourceDefs) {
    server.registerResource(def.name, def.uri, {
        title: def.name,
        description: def.description,
        mimeType: def.mimeType,
    }, () => {
        const result = getResource(def.uri);
        if (result == null) {
            throwMcpError("NOT_FOUND", "Resource not found", { uri: def.uri });
        }
        return {
            contents: [{ uri: def.uri, mimeType: result.mimeType, text: result.text }],
        };
    });
}
const agentIds = new Set(listAgents().map((a) => a.id));
for (const { id, name, description } of listAgents()) {
    regPrompt(id, description || `Run the ${name} agent`, contextArgSchema, ({ context }) => {
        const content = getAgent(id);
        if (content == null)
            throwMcpError("NOT_FOUND", `Agent not found: ${id}`, { id });
        return promptMessages(content, context);
    });
}
for (const { id, name, description } of listCommands()) {
    if (agentIds.has(id))
        continue;
    regPrompt(id, description || `Run the ${name} command`, contextArgSchema, ({ context }) => {
        const content = getCommand(id);
        if (content == null)
            throwMcpError("NOT_FOUND", `Command not found: ${id}`, { id });
        return promptMessages(content, context);
    });
}
const transport = new StdioServerTransport();
await server.connect(transport);
const feats = loadFeatures();
debug("trace", `pn-core-mcp v${MCP_VERSION} ready`, {
    content: process.env.PNCORE_CONTENT_PATH ?? "(default)",
    features: feats,
});
