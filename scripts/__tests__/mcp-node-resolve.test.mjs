/**
 * Unit tests for scripts/mcp-node-resolve.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readNvmrcMajor, readEnginesMinMajor, resolveMcpNode } from "../mcp-node-resolve.mjs";

test("readNvmrcMajor parses first line", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-mcp-nvmrc-"));
  try {
    writeFileSync(join(root, ".nvmrc"), "22\n", "utf8");
    assert.equal(readNvmrcMajor(root), 22);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readEnginesMinMajor reads package.json engines.node", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-mcp-eng-"));
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ engines: { node: ">=22" } }),
      "utf8"
    );
    assert.equal(readEnginesMinMajor(root), 22);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveMcpNode uses PNCORE_MCP_NODE when set", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-mcp-env-"));
  try {
    writeFileSync(join(root, ".nvmrc"), "99\n", "utf8");
    const r = resolveMcpNode({
      repoRoot: root,
      env: { PNCORE_MCP_NODE: "C:\\nvm\\v22.x\\node.exe" },
      currentExecPath: process.execPath,
      platform: "win32",
    });
    assert.equal(r.command, "C:\\nvm\\v22.x\\node.exe");
    assert.equal(r.pinnedBy, "PNCORE_MCP_NODE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveMcpNode prefers currentExecPath when major matches .nvmrc", () => {
  const root = mkdtempSync(join(tmpdir(), "pn-mcp-execpath-"));
  try {
    const major = Number(process.version.slice(1).split(".")[0]);
    writeFileSync(join(root, ".nvmrc"), `${major}\n`, "utf8");
    const r = resolveMcpNode({
      repoRoot: root,
      env: {},
      currentExecPath: process.execPath,
      platform: process.platform,
    });
    assert.equal(r.command, process.execPath);
    assert.match(r.pinnedBy, /\.nvmrc\/engines \(major/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
