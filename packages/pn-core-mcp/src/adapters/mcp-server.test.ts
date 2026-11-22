/**
 * The adapter in process: resources, agent and command prompts, their not-found envelopes, and
 * the stdio entry with a stub transport. Tool calls are covered by index.tools.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const GONE_AGENT = "pn-skeptic";
const GONE_COMMAND = "pn-build";
const GONE_URI = "pn-core://config/stacks.json";

vi.mock("../content.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../content.js")>();
  return {
    ...real,
    getAgent: (id: string) => (id === GONE_AGENT ? null : real.getAgent(id)),
    getCommand: (id: string) => (id === GONE_COMMAND ? null : real.getCommand(id)),
    getResource: (uri: string) => (uri === GONE_URI ? null : real.getResource(uri)),
  };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class {
    onclose?: () => void;
    async start() {}
    async send() {}
    async close() {
      this.onclose?.();
    }
  },
}));

const { createPnCoreServer, startStdioServer } = await import("./mcp-server.js");

describe("pn-core MCP adapter", () => {
  let client: Client;
  let server: ReturnType<typeof createPnCoreServer>;

  beforeAll(async () => {
    const [c, s] = InMemoryTransport.createLinkedPair();
    server = createPnCoreServer();
    await server.connect(s);
    client = new Client({ name: "adapter-test", version: "1.0.0" }, { capabilities: {} });
    await client.connect(c);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it("serves resources and answers a missing one with NOT_FOUND", async () => {
    const { resources } = await client.listResources();
    const features = resources.find((r) => r.uri === "pn-core://config/features.json");
    expect(features).toBeDefined();
    const read = await client.readResource({ uri: features!.uri });
    expect(read.contents[0]).toMatchObject({ uri: features!.uri });
    await expect(client.readResource({ uri: GONE_URI })).rejects.toThrow(/Resource not found/);
  });

  it("serves agent and command prompts, with and without user context", async () => {
    const { prompts } = await client.listPrompts();
    const anAgent = prompts.find((p) => p.name === "pn-backend-developer")!;
    const plain = await client.getPrompt({ name: anAgent.name });
    expect(plain.messages[0]!.content).toMatchObject({ type: "text" });
    const withCtx = await client.getPrompt({ name: "pn-guide", arguments: { context: "my app" } });
    expect((withCtx.messages[0]!.content as { text: string }).text).toMatch(
      /\*\*User context:\*\*\nmy app/
    );
  });

  it("answers a prompt whose content vanished with NOT_FOUND", async () => {
    await expect(client.getPrompt({ name: GONE_AGENT })).rejects.toThrow(/Agent not found/);
    await expect(client.getPrompt({ name: GONE_COMMAND })).rejects.toThrow(/Command not found/);
  });

  it("startStdioServer connects a fresh server to stdio", async () => {
    const s = await startStdioServer();
    expect(s.isConnected()).toBe(true);
    await s.close();
  });
});
