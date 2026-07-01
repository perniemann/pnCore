/**
 * Validates pn-core MCP one-click install config and npx launch path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeMcpConfig, mcpConfigNpx, npxPnCoreArgsForPackage } from "../mcp-npx-config.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("one-click config uses pn-core bin, not cwd-relative node path", () => {
  assert.equal(mcpConfigNpx.command, "npx");
  assert.deepEqual(mcpConfigNpx.args.slice(-1), ["pn-core"]);
  assert.ok(!mcpConfigNpx.args.includes("node"));
  assert.ok(!mcpConfigNpx.args.some((a) => a.includes("packages/pn-core-mcp/dist")));
});

test("encoded config round-trips", () => {
  const encoded = encodeMcpConfig(mcpConfigNpx);
  const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  assert.deepEqual(decoded, mcpConfigNpx);
});

test("npx --package local file install launches pn-core MCP", () => {
  const dir = mkdtempSync(join(tmpdir(), "pn-mcp-npx-"));
  const packageSpec = `file:${repoRoot}`;
  try {
    const init = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    const result = spawnSync("npx", npxPnCoreArgsForPackage(packageSpec), {
      cwd: dir,
      input: `${init}\n`,
      encoding: "utf8",
      timeout: 120_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const line = result.stdout
      .trim()
      .split("\n")
      .find((l) => l.startsWith("{"));
    assert.ok(line, "expected JSON-RPC response on stdout");
    const parsed = JSON.parse(line);
    assert.equal(parsed.result?.serverInfo?.name, "pn-core-mcp");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
