/**
 * Smoke test: spawn MCP server, call health tool, verify response.
 * Ensures server starts and health tool returns expected shape.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "dist", "index.js");

describe("MCP server smoke", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });
    client = new Client({ name: "pn-core-smoke-test", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
  }, 15000);

  afterAll(async () => {
    await transport.close();
  });

  it("health tool returns status ok and version", async () => {
    const result = await client.callTool({
      name: "health",
      arguments: {},
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    const textPart = result.content?.find((c) => c.type === "text" && "text" in c);
    expect(textPart).toBeDefined();

    const parsed = JSON.parse((textPart as { text: string }).text);
    expect(parsed.status).toBe("ok");
    expect(parsed.calendarDateUtc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.timestampUtc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.version).toBeDefined();
    expect(typeof parsed.version).toBe("string");
    expect(parsed.capabilities).toBeDefined();
    expect(parsed.capabilities).toContain("skills");
    expect(parsed.capabilities).toContain("workflow_step");
    expect(parsed.capabilities).toContain("approval_checkpoint");
    expect(parsed.capabilities).toContain("gate_log_append");
    expect(parsed.capabilities).toContain("workflow_usage_totals");
    expect(parsed.capabilities).toContain("workflow_handoff_append");
    expect(parsed.capabilities).toContain("workflow_handoff_read");
    expect(parsed.capabilities).toContain("workflow_verify");
    expect(parsed.capabilities).toContain("workflow_run_query");
  });
});
