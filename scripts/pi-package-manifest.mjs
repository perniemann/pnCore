#!/usr/bin/env node
/**
 * Shared pi.dev package manifest helpers (ADR-0008).
 * Git/npm installs use the monorepo root package.json; skills live under plugins/pnCore/.
 * Slash commands: single /pn via extension (not flat pi.prompts in main menu).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/** Paths relative to repo root for pi install git:github.com/.../pnCore */
export const ROOT_PI_PROMPTS_DIR = "./plugins/pnCore/prompts";
export const ROOT_PI_COMMAND_INDEX = "./plugins/pnCore/pi-command-index.json";
export const ROOT_PI_SKILLS = "./plugins/pnCore/skills";
export const ROOT_PI_EXTENSIONS = "./packages/pn-core-mcp/extensions/pn-core.ts";

/** @deprecated use ROOT_PI_PROMPTS_DIR */
export const ROOT_PI_PROMPTS = ROOT_PI_PROMPTS_DIR;

/**
 * @param {Record<string, unknown>} pkg
 * @returns {Record<string, unknown>}
 */
export function applyRootPiManifest(pkg) {
  const keywords = new Set([...(Array.isArray(pkg.keywords) ? pkg.keywords : []), "pi-package"]);
  return {
    ...pkg,
    keywords: [...keywords],
    pi: {
      skills: [ROOT_PI_SKILLS],
      extensions: [ROOT_PI_EXTENSIONS],
    },
  };
}

/**
 * Ensure repo root package.json exposes pi manifest for `pi install git:.../pnCore`.
 * @param {string} repoRoot
 */
export function ensureRootPiManifest(repoRoot) {
  const pkgPath = join(repoRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const next = applyRootPiManifest(pkg);
  const prevPi = JSON.stringify(pkg.pi ?? null);
  const nextPi = JSON.stringify(next.pi);
  const prevKw = JSON.stringify(pkg.keywords ?? []);
  const nextKw = JSON.stringify(next.keywords);
  if (prevPi !== nextPi || prevKw !== nextKw) {
    writeFileSync(pkgPath, JSON.stringify(next, null, 2) + "\n");
    console.log("Updated root package.json pi-package manifest (git install entry point)");
  }
}

/**
 * @param {string} repoRoot
 * @returns {string[]} errors
 */
export function validateRootPiManifest(repoRoot) {
  const errors = [];
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) {
    errors.push("Missing root package.json");
    return errors;
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (e) {
    errors.push(`Invalid root package.json: ${e.message}`);
    return errors;
  }
  if (!Array.isArray(pkg.keywords) || !pkg.keywords.includes("pi-package")) {
    errors.push('Root package.json must include keywords: ["pi-package"] for pi install discovery');
  }
  const pi = pkg.pi;
  if (!pi || typeof pi !== "object") {
    errors.push("Root package.json missing pi manifest (required for pi install git:.../pnCore)");
    return errors;
  }
  if (Array.isArray(pi.prompts) && pi.prompts.length > 0) {
    errors.push(
      "Root pi.prompts must be omitted — pn slash commands use /pn extension menu, not flat prompt templates"
    );
  }
  if (!Array.isArray(pi.skills) || pi.skills[0] !== ROOT_PI_SKILLS) {
    errors.push(`Root pi.skills must be ["${ROOT_PI_SKILLS}"]`);
  }
  if (!Array.isArray(pi.extensions) || pi.extensions[0] !== ROOT_PI_EXTENSIONS) {
    errors.push(`Root pi.extensions must be ["${ROOT_PI_EXTENSIONS}"]`);
  }
  const promptsDir = join(repoRoot, ROOT_PI_PROMPTS_DIR.replace(/^\.\//, ""));
  const indexFile = join(repoRoot, ROOT_PI_COMMAND_INDEX.replace(/^\.\//, ""));
  const skillsDir = join(repoRoot, ROOT_PI_SKILLS.replace(/^\.\//, ""));
  const extensionsFile = join(repoRoot, ROOT_PI_EXTENSIONS.replace(/^\.\//, ""));
  if (!existsSync(promptsDir)) {
    errors.push(`Pi command templates missing: ${ROOT_PI_PROMPTS_DIR} (run: npm run sync:content)`);
  }
  if (!existsSync(indexFile)) {
    errors.push(`Pi command index missing: ${ROOT_PI_COMMAND_INDEX} (run: npm run sync:content)`);
  }
  if (!existsSync(skillsDir)) {
    errors.push(`Pi skills directory missing: ${ROOT_PI_SKILLS}`);
  }
  if (!existsSync(extensionsFile)) {
    errors.push(
      `Pi extension missing: ${ROOT_PI_EXTENSIONS} (run: npm run build:mcp after adding extension)`
    );
  }
  const registryDist = join(repoRoot, "packages/pn-core-mcp/dist/tools/registry.js");
  if (!existsSync(registryDist)) {
    errors.push(
      "Pi extension requires built registry at packages/pn-core-mcp/dist/tools/registry.js — run: npm run build:mcp"
    );
  }
  return errors;
}

/**
 * @param {Record<string, unknown>} pluginPkg
 */
export function applyPluginPiManifest(pluginPkg) {
  return {
    ...pluginPkg,
    keywords: ["pi-package"],
    pi: {
      skills: ["./skills"],
    },
  };
}
