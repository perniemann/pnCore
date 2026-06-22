#!/usr/bin/env node
/**
 * Sync version from root package.json to plugin manifest, MCP package, marketplace, README,
 * and prose that says "pnCore X.Y.Z" (plugin README, select docs/, MCP package README).
 * Single source of truth: package.json at repo root.
 * Run as part of prepare or before release.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const rootPkgPath = join(repoRoot, "package.json");

if (!existsSync(rootPkgPath)) {
  console.error("Root package.json not found");
  process.exit(1);
}

const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
const version = rootPkg.version;
if (!version) {
  console.error("No version in root package.json");
  process.exit(1);
}

const pluginManifestPath = join(repoRoot, "plugins", "pnCore", ".cursor-plugin", "plugin.json");
if (existsSync(pluginManifestPath)) {
  const manifest = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
  manifest.version = version;
  writeFileSync(pluginManifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Synced version to plugins/pnCore/.cursor-plugin/plugin.json");
}

const rootManifestPath = join(repoRoot, ".cursor-plugin", "plugin.json");
if (existsSync(rootManifestPath)) {
  const manifest = JSON.parse(readFileSync(rootManifestPath, "utf8"));
  manifest.version = version;
  writeFileSync(rootManifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Synced version to .cursor-plugin/plugin.json");
}

const mcpPkgPath = join(repoRoot, "packages", "pn-core-mcp", "package.json");
if (existsSync(mcpPkgPath)) {
  const mcpPkg = JSON.parse(readFileSync(mcpPkgPath, "utf8"));
  mcpPkg.version = version;
  writeFileSync(mcpPkgPath, JSON.stringify(mcpPkg, null, 2) + "\n", "utf8");
  console.log("Synced version to packages/pn-core-mcp/package.json");
}

const marketplacePath = join(repoRoot, ".cursor-plugin", "marketplace.json");
if (existsSync(marketplacePath)) {
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  if (marketplace.metadata) marketplace.metadata.version = version;
  writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");
  console.log("Synced version to .cursor-plugin/marketplace.json");
}

const readmePath = join(repoRoot, "README.md");
if (existsSync(readmePath)) {
  let readme = readFileSync(readmePath, "utf8");
  readme = readme.replace(/^(# pnCore\s*—\s*v)\d+\.\d+\.\d+/m, `$1${version}`);
  writeFileSync(readmePath, readme, "utf8");
  console.log("Synced version to README.md");
}

/** pnCore X.Y.Z in plugin README and repo docs */
const pnCoreVersionFiles = [
  join(repoRoot, "plugins", "pnCore", "README.md"),
  join(repoRoot, "docs", "mcp-usage-guide.md"),
  join(repoRoot, "docs", "plugin-reference.md"),
  join(repoRoot, "docs", "companion-mcp-catalog.md"),
];
for (const p of pnCoreVersionFiles) {
  if (!existsSync(p)) continue;
  let text = readFileSync(p, "utf8");
  const next = text.replace(/pnCore (\d+\.\d+\.\d+)/g, `pnCore ${version}`);
  if (next !== text) {
    writeFileSync(p, next, "utf8");
    console.log("Synced pnCore version in", relative(repoRoot, p));
  }
}

const mcpReadmePath = join(repoRoot, "packages", "pn-core-mcp", "README.md");
if (existsSync(mcpReadmePath)) {
  let mcpReadme = readFileSync(mcpReadmePath, "utf8");
  const next = mcpReadme.replace(
    /(\[pnCore\]\([^)]+\)\s)\*\*\d+\.\d+\.\d+\*\*/,
    `$1**${version}**`
  );
  if (next !== mcpReadme) {
    writeFileSync(mcpReadmePath, next, "utf8");
    console.log("Synced version to packages/pn-core-mcp/README.md");
  }
}
