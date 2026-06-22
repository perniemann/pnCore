#!/usr/bin/env node
/**
 * Validate that required assets exist before landing/app is declared complete.
 * Run: node scripts/validate-assets.mjs <project-path> [--quality]
 *
 * Reads .validate-assets.json or package.json "validateAssets" for required paths.
 * Default when no config: public/logo.svg, public/hero-placeholder.svg
 * Exit 0 if all exist; exit 1 with list of missing paths.
 *
 * --quality: Enforce pn-logo parity for logos (defs with gradients/filters).
 * For files matching logo*.svg or favicon*.svg: must have linearGradient,
 * radialGradient, or filter. Reject flat rect + text only.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const DEFAULT_REQUIRED = ["public/logo.svg", "public/hero-placeholder.svg"];

function isLogoOrFavicon(rel) {
  const base = rel.split("/").pop() ?? rel;
  return /^logo.*\.svg$/i.test(base) || /^favicon.*\.svg$/i.test(base);
}

function checkSvgQuality(fullPath, rel) {
  const content = readFileSync(fullPath, "utf-8");
  const hasDefs = /<defs[\s>]/.test(content);
  const hasGradient = /linearGradient|radialGradient/.test(content);
  const hasFilter = /<filter[\s>]/.test(content);
  const hasQuality = hasGradient || hasFilter;

  if (!hasDefs) {
    return { ok: false, reason: "missing <defs>" };
  }
  if (isLogoOrFavicon(rel) && !hasQuality) {
    return {
      ok: false,
      reason: "logo/favicon must have gradient or filter (pn-logo parity)",
    };
  }
  return { ok: true };
}

function loadConfig(projectPath) {
  const pkgPath = join(projectPath, "package.json");
  const validatePath = join(projectPath, ".validate-assets.json");

  if (existsSync(validatePath)) {
    try {
      const data = JSON.parse(readFileSync(validatePath, "utf-8"));
      return data.required ?? DEFAULT_REQUIRED;
    } catch {
      console.error("Invalid .validate-assets.json");
      process.exit(1);
    }
  }

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const assets = pkg.validateAssets?.required ?? pkg.validateAssets;
      if (Array.isArray(assets) && assets.length > 0) return assets;
    } catch {
      // ignore
    }
  }

  return null;
}

function main() {
  const args = process.argv.slice(2);
  const qualityMode = args.includes("--quality");
  const pathArg = args.find((a) => a !== "--quality") ?? ".";
  const projectPath = resolve(pathArg);
  const required = loadConfig(projectPath);

  if (required === null) {
    console.log(
      "validate-assets: no config found (.validate-assets.json or validateAssets in package.json); skipping."
    );
    process.exit(0);
  }

  const missing = [];
  for (const rel of required) {
    const full = join(projectPath, rel);
    if (!existsSync(full)) {
      missing.push(rel);
    }
  }

  if (missing.length > 0) {
    console.error("Asset validation FAILED. Missing:");
    missing.forEach((p) => console.error("  -", p));
    console.error("\nCreate assets via pn-assets-manager or add to .validate-assets.json.");
    process.exit(1);
  }

  if (qualityMode) {
    const qualityFails = [];
    for (const rel of required) {
      if (!rel.endsWith(".svg")) continue;
      const full = join(projectPath, rel);
      const result = checkSvgQuality(full, rel);
      if (!result.ok) {
        qualityFails.push({ path: rel, reason: result.reason });
      }
    }
    if (qualityFails.length > 0) {
      console.error("Asset quality validation FAILED:");
      qualityFails.forEach(({ path, reason }) => console.error(`  - ${path}: ${reason}`));
      console.error("\nReference plugins/pnCore/assets/pn-logo.svg for quality benchmark.");
      process.exit(1);
    }
  }

  console.log("Asset validation PASSED.");
  process.exit(0);
}

main();
