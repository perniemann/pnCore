#!/usr/bin/env node
/**
 * Validates all plugins listed in .cursor-plugin/marketplace.json.
 * Uses shared logic from validate-plugin-lib.mjs.
 * Run from repo root: node scripts/validate-template.mjs
 * Exit 0 if all pass; non-zero on first failure.
 */

import fs from "fs";
import path from "path";
import { runValidation } from "./validate-plugin-lib.mjs";

const repoRoot = process.cwd();
const marketplacePath = path.join(repoRoot, ".cursor-plugin", "marketplace.json");

if (!fs.existsSync(marketplacePath)) {
  console.error("Missing .cursor-plugin/marketplace.json");
  process.exit(1);
}

let marketplace;
try {
  marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
} catch (e) {
  console.error("Invalid marketplace.json:", e.message);
  process.exit(1);
}

const plugins = marketplace.plugins || [];
if (plugins.length === 0) {
  console.log("No plugins listed in marketplace.json.");
  process.exit(0);
}

let failed = 0;
for (const plugin of plugins) {
  const source = plugin.source;
  if (!source) {
    console.error(`Plugin "${plugin.name}" has no "source" in marketplace.json`);
    failed++;
    continue;
  }
  const pluginPath = path.resolve(repoRoot, source);
  const code = runValidation(pluginPath);
  if (code !== 0) failed++;
}

process.exit(failed > 0 ? 1 : 0);
