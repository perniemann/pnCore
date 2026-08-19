/**
 * Unit tests for scripts/mcp-install-config.mjs and check-mcp-config classification.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  portableMcpServerEntry,
  repoWorkspaceMcpServerEntry,
  isPortablePnCoreEntry,
  isLocalDevPnCoreEntry,
  isRepoWorkspacePnCoreEntry,
  isBrokenRelativeNodePortableEntry,
  classifyPnCoreEntry,
  PNCORE_GIT_PACKAGE,
  PNCORE_MCP_SERVER_REL,
} from "../mcp-install-config.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("portableMcpServerEntry windows uses cmd + npx git + pn-core bin", () => {
  const entry = portableMcpServerEntry("win32");
  assert.equal(entry.command, "cmd");
  assert.ok(entry.args.includes("/c"));
  assert.ok(entry.args.some((a) => a.includes(PNCORE_GIT_PACKAGE)));
  assert.ok(entry.args.includes("pn-core"));
  assert.ok(!entry.args.includes("node"));
});

test("portableMcpServerEntry unix uses npx directly", () => {
  const entry = portableMcpServerEntry("linux");
  assert.equal(entry.command, "npx");
  assert.ok(!entry.args.includes("/c"));
  assert.ok(entry.args.includes("pn-core"));
  assert.equal(entry.env.GIT_TERMINAL_PROMPT, "0");
  assert.equal(entry.env.GIT_ASKPASS, "echo");
});

test("repo workspace entry is node + packages dist, not npx", () => {
  const entry = repoWorkspaceMcpServerEntry();
  assert.equal(entry.command, "node");
  assert.deepEqual(entry.args, [PNCORE_MCP_SERVER_REL]);
  assert.equal(isRepoWorkspacePnCoreEntry(entry), true);
  assert.equal(classifyPnCoreEntry(entry).repoWorkspace, true);
  assert.equal(isPortablePnCoreEntry(entry), false);
  assert.equal(isBrokenRelativeNodePortableEntry(entry), false);
});

test("isPortablePnCoreEntry detects npx git config", () => {
  assert.equal(isPortablePnCoreEntry(portableMcpServerEntry("win32")), true);
});

test("isLocalDevPnCoreEntry does not treat the git package URL as a local path", () => {
  assert.equal(isLocalDevPnCoreEntry(portableMcpServerEntry("linux")), false);
  assert.ok(PNCORE_GIT_PACKAGE.includes("pnCore"));
  assert.equal(PNCORE_GIT_PACKAGE.includes("/pnCore/"), false);
});

test("isLocalDevPnCoreEntry detects drive-letter paths", () => {
  assert.equal(
    isLocalDevPnCoreEntry({
      command: "node",
      args: ["X:\\pnCore\\packages\\pn-core-mcp\\dist\\index.js"],
    }),
    true
  );
  assert.equal(isLocalDevPnCoreEntry(portableMcpServerEntry("win32")), false);
});

test("classifyPnCoreEntry labels portable vs dev", () => {
  assert.equal(classifyPnCoreEntry(portableMcpServerEntry("win32")).portable, true);
  assert.equal(
    classifyPnCoreEntry({
      command: "node",
      args: ["X:\\pnCore\\packages\\pn-core-mcp\\dist\\index.js"],
    }).repoWorkspace,
    true
  );
  assert.equal(
    classifyPnCoreEntry({
      command: "node",
      args: ["X:\\pnCore\\some-other-entry.js"],
    }).localDev,
    true
  );
});

test("committed .cursor/mcp.json is repo-workspace node dist", () => {
  const raw = JSON.parse(readFileSync(resolve(repoRoot, ".cursor", "mcp.json"), "utf8"));
  const entry = raw.mcpServers["pn-core"];
  assert.equal(classifyPnCoreEntry(entry).repoWorkspace, true);
  assert.equal(isRepoWorkspacePnCoreEntry(entry), true);
});

test("isBrokenRelativeNodePortableEntry flags relative node path after npx git", () => {
  const broken = {
    command: "cmd",
    args: [
      "/c",
      "npx",
      "-y",
      `--package=${PNCORE_GIT_PACKAGE}`,
      "--",
      "node",
      "packages/pn-core-mcp/dist/index.js",
    ],
  };
  assert.equal(isBrokenRelativeNodePortableEntry(broken), true);
  assert.equal(classifyPnCoreEntry(broken).brokenPortable, true);
});
