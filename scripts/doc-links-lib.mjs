/**
 * Offline markdown link extraction and checking for pn-core:// URIs and relative paths.
 * External http(s) links are intentionally ignored (covered by optional lychee CI).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PN_CORE_URI_RE = /pn-core:\/\/[^\s)\]>'"`]+/g;
const MD_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

/**
 * Strip fenced code blocks so example markdown (e.g. sample README tables) is not checked.
 * @param {string} markdown
 */
export function stripFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

/**
 * @param {string} markdown
 * @returns {{ pnCore: string[], relative: string[] }}
 */
export function extractLinks(markdown) {
  /** @type {Set<string>} */
  const pnCore = new Set();
  /** @type {Set<string>} */
  const relative = new Set();
  const body = stripFencedCode(markdown);

  for (const m of body.matchAll(PN_CORE_URI_RE)) {
    // Strip trailing markdown/punctuation (e.g. bold ** or list punctuation).
    const uri = m[0].replace(/[.,;:!?*)\]]+$/, "");
    if (uri.startsWith("pn-core://")) pnCore.add(uri);
  }

  for (const m of body.matchAll(MD_LINK_RE)) {
    let target = m[1].trim();
    if (!target) continue;
    // Strip optional title: url "title"
    const spaceIdx = target.search(/\s/);
    if (spaceIdx > 0) target = target.slice(0, spaceIdx);
    target = target.replace(/^<|>$/g, "");
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#") ||
      target.startsWith("pn-core://")
    ) {
      continue;
    }
    // Drop fragment for filesystem check
    const pathOnly = target.split("#")[0];
    if (!pathOnly) continue;
    // Only check explicit relative paths. Bare names (e.g. PRD.md) are often
    // project-output placeholders documented in skills, not repo files.
    if (!(pathOnly.startsWith("./") || pathOnly.startsWith("../"))) continue;
    relative.add(pathOnly);
  }

  return { pnCore: [...pnCore], relative: [...relative] };
}

/**
 * Collect registered pn-core:// URIs from content.ts plus on-disk content files.
 * Also accepts pn-core://skills|reference|rules|commands|agents/... paths that exist on disk.
 * @param {string} contentTsPath
 * @param {string} contentRoot
 * @returns {Set<string>}
 */
export function collectValidPnCoreUris(contentTsPath, contentRoot) {
  /** @type {Set<string>} */
  const uris = new Set();
  if (existsSync(contentTsPath)) {
    const src = readFileSync(contentTsPath, "utf8");
    for (const m of src.matchAll(/pn-core:\/\/[^"'\s]+/g)) {
      uris.add(m[0]);
    }
  }
  for (const top of [
    "reference",
    "skills",
    "rules",
    "commands",
    "agents",
    "agents-internal",
    "docs",
    "config",
    "hooks",
  ]) {
    const root = join(contentRoot, top);
    if (!existsSync(root)) continue;
    walkFiles(root, (abs) => {
      const rel = abs.slice(contentRoot.length + 1).replace(/\\/g, "/");
      uris.add(`pn-core://${rel}`);
    });
  }
  return uris;
}

/**
 * @param {string} dir
 * @param {(abs: string) => void} visit
 */
function walkFiles(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, visit);
    else if (entry.isFile()) visit(abs);
  }
}

/**
 * @param {string} absPath
 * @param {{ validUris: Set<string> }} ctx
 * @returns {{ brokenPnCore: string[], brokenRelative: string[] }}
 */
export function checkFile(absPath, ctx) {
  const markdown = readFileSync(absPath, "utf8");
  const { pnCore, relative } = extractLinks(markdown);
  /** @type {string[]} */
  const brokenPnCore = [];
  /** @type {string[]} */
  const brokenRelative = [];

  for (const uri of pnCore) {
    if (!ctx.validUris.has(uri)) brokenPnCore.push(uri);
  }

  const baseDir = dirname(absPath);
  for (const rel of relative) {
    const resolved = resolve(baseDir, rel);
    if (!existsSync(resolved)) {
      brokenRelative.push(rel);
      continue;
    }
    try {
      if (!statSync(resolved).isFile() && !statSync(resolved).isDirectory()) {
        brokenRelative.push(rel);
      }
    } catch {
      brokenRelative.push(rel);
    }
  }

  return { brokenPnCore, brokenRelative };
}
