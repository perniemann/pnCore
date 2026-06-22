#!/usr/bin/env node
/**
 * Verify packages/pn-core-mcp/content/ matches plugins/pnCore/ for every tree
 * copied by sync-content-to-plugin.mjs (commands → .cursor/commands).
 * Run after: npm run sync:content
 * If you edited canonical content only, sync first or this check fails.
 * Usage: node scripts/check-content-plugin-sync.mjs (from repo root)
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isCommandHiddenFromSlash } from "./command-slash-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const mcpContent = join(repoRoot, "packages", "pn-core-mcp", "content");
const pluginRoot = join(repoRoot, "plugins", "pnCore");

/** @type {Array<[string, string, string]>} [srcSubdir, destSubdir, logicalPrefix] */
const MAP = [
  ["skills", "skills", "skills"],
  ["agents", "agents", "agents"],
  ["rules", "rules", "rules"],
  ["config", "config", "config"],
  ["docs", "docs", "docs"],
  ["reference", "reference", "reference"],
  ["hooks", "hooks", "hooks"],
  ["commands", join(".cursor", "commands"), "commands"],
];

/** Single-file byte-equality checks: [canonical abs path, repo-root abs path, label] */
const SINGLE_FILE_CHECKS = [
  [
    join(mcpContent, "docs", "agents-md-guide.md"),
    join(repoRoot, "docs", "agents-md-guide.md"),
    "docs/agents-md-guide.md",
  ],
  [
    join(mcpContent, "config", "specialists.json"),
    join(repoRoot, "config", "specialists.json"),
    "config/specialists.json",
  ],
  [
    join(mcpContent, "config", "stacks.json"),
    join(repoRoot, "config", "stacks.json"),
    "config/stacks.json",
  ],
];

function* walkFiles(dir, base = "") {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    const rel = base ? join(base, name.name) : name.name;
    if (name.isDirectory()) yield* walkFiles(full, rel);
    else yield [full, rel];
  }
}

function collectMap(srcDir, logicalPrefix) {
  const m = new Map();
  for (const [abs, rel] of walkFiles(srcDir)) {
    const key = join(logicalPrefix, rel).replace(/\\/g, "/");
    // Commands with frontmatter `slash: false` are deliberately not synced
    // into plugins/pnCore/.cursor/commands/ — exclude them from both sides
    // of the comparison so the canonical tree can hold more files than the
    // plugin tree without tripping the parity check.
    if (logicalPrefix === "commands" && isCommandHiddenFromSlash(abs)) continue;
    m.set(key, readFileSync(abs));
  }
  return m;
}

function main() {
  if (!existsSync(mcpContent)) {
    console.error("check-content-plugin-sync: MCP content not found at", mcpContent);
    process.exit(1);
  }
  if (!existsSync(pluginRoot)) {
    console.error("check-content-plugin-sync: Plugin not found at", pluginRoot);
    process.exit(1);
  }

  const mismatches = [];
  const onlyCanonical = [];
  const onlyPlugin = [];

  for (const [srcSub, dstSub, logical] of MAP) {
    const srcDir = join(mcpContent, srcSub);
    const dstDir = join(pluginRoot, dstSub);
    const srcFiles = collectMap(srcDir, logical);
    const dstFiles = collectMap(dstDir, logical);

    for (const [k, buf] of srcFiles) {
      if (!dstFiles.has(k)) onlyCanonical.push(k);
      else if (!buf.equals(dstFiles.get(k))) mismatches.push(k);
    }
    for (const k of dstFiles.keys()) {
      if (!srcFiles.has(k)) onlyPlugin.push(k);
    }
  }

  if (mismatches.length || onlyCanonical.length || onlyPlugin.length) {
    console.error("check-content-plugin-sync: content/ and plugins/pnCore/ are out of sync.");
    console.error("If you edited packages/pn-core-mcp/content/, run: npm run sync:content");
    if (mismatches.length) {
      console.error("\nByte mismatch:");
      for (const k of mismatches) console.error(" ", k);
    }
    if (onlyCanonical.length) {
      console.error("\nOnly in canonical (missing under plugin):");
      for (const k of onlyCanonical) console.error(" ", k);
    }
    if (onlyPlugin.length) {
      console.error("\nOnly under plugin (missing in canonical):");
      for (const k of onlyPlugin) console.error(" ", k);
    }
    process.exit(1);
  }

  // Verify single-file copies written by sync-content-to-plugin.mjs
  const singleFileFails = [];
  for (const [canonPath, rootPath, label] of SINGLE_FILE_CHECKS) {
    if (!existsSync(canonPath)) continue; // canonical file optional
    if (!existsSync(rootPath)) {
      singleFileFails.push(`${label}: missing at repo root (run: npm run sync:content)`);
    } else {
      const canonBuf = readFileSync(canonPath);
      const rootBuf = readFileSync(rootPath);
      if (!canonBuf.equals(rootBuf)) {
        singleFileFails.push(
          `${label}: repo root differs from canonical (run: npm run sync:content)`
        );
      }
    }
  }
  if (singleFileFails.length) {
    console.error("check-content-plugin-sync: root file(s) out of sync with canonical:");
    for (const msg of singleFileFails) console.error(" ", msg);
    process.exit(1);
  }

  console.log("check-content-plugin-sync: OK (canonical content matches plugin copy).");
}

main();
