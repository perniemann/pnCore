#!/usr/bin/env node
/**
 * Fail if tracked source/docs reintroduce pnCursor-era names or removed compat shims.
 * Wired into npm run validate via validate-parallel.mjs.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".worktrees",
  ".test-project",
  "html_outputs",
]);

/** Paths allowed to mention "cursor" without being pnCursor legacy. */
const ALLOWLIST_SUFFIXES = [
  "pn-no-cursor-commit-trailers.mdc",
  "check-commit-no-ide-trailers.mjs",
  "check-no-legacy-names.mjs",
  "docs/pn-indicator-styling.md",
  "plugins/pnCore/CHANGELOG.md",
];

const FORBIDDEN = [
  { label: "pnCursor", re: /\bpnCursor\b/i },
  { label: "pn-cursor", re: /\bpn-cursor\b/i },
  { label: "PNCURSOR", re: /\bPNCURSOR\b/ },
  { label: ".pncursor", re: /\.pncursor\b/i },
  { label: "pncoreRunId", re: /\bpncoreRunId\b/ },
  { label: "best-practice-2026-03", re: /best-practice-2026-03/ },
  { label: "legacy flat docs path", re: /legacy `docs\//i },
];

function isAllowlisted(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  if (norm.includes("/.cursor/")) return true;
  return ALLOWLIST_SUFFIXES.some((s) => norm.endsWith(s));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(repoRoot, full);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!st.isFile()) continue;
    if (isAllowlisted(rel)) continue;
    const lower = name.toLowerCase();
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".ico") ||
      lower.endsWith(".woff") ||
      lower.endsWith(".woff2") ||
      lower.endsWith(".tsbuildinfo")
    ) {
      continue;
    }
    out.push(full);
  }
  return out;
}

const hits = [];
for (const filePath of walk(repoRoot)) {
  let text;
  try {
    text = readFileSync(filePath, "utf-8");
  } catch {
    continue;
  }
  const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
  const isTestFile =
    /(?:\.test\.|\.spec\.|__tests__)/i.test(rel) || rel.includes("/scripts/__tests__/");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const patterns = isTestFile
      ? FORBIDDEN.filter(
          (p) =>
            p.label === "pnCursor" ||
            p.label === "pn-cursor" ||
            p.label === "PNCURSOR" ||
            p.label === ".pncursor"
        )
      : FORBIDDEN;
    for (const { label, re } of patterns) {
      if (re.test(lines[i])) {
        hits.push({ file: rel, line: i + 1, label, snippet: lines[i].trim().slice(0, 120) });
      }
    }
  }
}

if (hits.length > 0) {
  console.error("check-no-legacy-names: forbidden legacy identifiers found:");
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line} [${h.label}] ${h.snippet}`);
  }
  process.exit(1);
}

console.log("check-no-legacy-names: OK — no pnCursor-era legacy identifiers in tracked tree");
process.exit(0);
