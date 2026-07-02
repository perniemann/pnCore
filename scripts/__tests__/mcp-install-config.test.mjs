/**
 * Unit tests for scripts/mcp-install-config.mjs and check-mcp-config classification.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portableMcpServerEntry,
  isPortablePnCoreEntry,
  isLocalDevPnCoreEntry,
  isBrokenRelativeNodePortableEntry,
  classifyPnCoreEntry,
  PNCORE_GIT_PACKAGE,
} from "../mcp-install-config.mjs";

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
});

test("isPortablePnCoreEntry detects npx git config", () => {
  assert.equal(isPortablePnCoreEntry(portableMcpServerEntry("win32")), true);
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
    }).localDev,
    true
  );
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
