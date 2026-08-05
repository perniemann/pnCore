#!/usr/bin/env node
/**
 * Offline markdown link checker for pn-core:// URIs and relative paths.
 *
 * Fails (exit 1) when any broken offline link is found. Set PNCORE_STRICT_LINKS=0
 * to warn-only for local WIP. External http(s) URLs are skipped — use the
 * scheduled lychee workflow for those.
 *
 * Run: node scripts/check-doc-links.mjs
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFile, collectValidPnCoreUris } from "./doc-links-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const contentRoot = join(repoRoot, "packages", "pn-core-mcp", "content");
const contentTsPath = join(repoRoot, "packages", "pn-core-mcp", "src", "content.ts");
const docsRoot = join(repoRoot, "docs");

const ROOTS = [contentRoot, docsRoot];

/**
 * @param {string} dir
 * @param {(abs: string) => void} visit
 */
function walkMd(dir, visit) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkMd(abs, visit);
    } else if (entry.isFile() && /\.(md|mdc)$/i.test(entry.name)) {
      visit(abs);
    }
  }
}

function main() {
  const validUris = collectValidPnCoreUris(contentTsPath, contentRoot);
  /** @type {string[]} */
  const warnings = [];
  let files = 0;

  for (const root of ROOTS) {
    walkMd(root, (abs) => {
      files++;
      const { brokenPnCore, brokenRelative } = checkFile(abs, { validUris });
      const rel = abs.slice(repoRoot.length + 1).replace(/\\/g, "/");
      for (const uri of brokenPnCore) {
        warnings.push(`${rel}: broken pn-core URI ${uri}`);
      }
      for (const link of brokenRelative) {
        warnings.push(`${rel}: broken relative link ${link}`);
      }
    });
  }

  const soft = process.env.PNCORE_STRICT_LINKS === "0";

  if (warnings.length) {
    const label = soft ? "warning(s)" : "error(s)";
    console[soft ? "warn" : "error"](
      `check-doc-links: ${warnings.length} ${label} in ${files} files:`
    );
    const max = 50;
    for (const w of warnings.slice(0, max)) {
      console[soft ? "warn" : "error"](soft ? `  WARN: ${w}` : `  ERR: ${w}`);
    }
    if (warnings.length > max) {
      console[soft ? "warn" : "error"](`  … and ${warnings.length - max} more`);
    }
    process.exit(soft ? 0 : 1);
  }

  console.log(`check-doc-links: OK (${files} files, 0 broken offline links)`);
  process.exit(0);
}

main();
