#!/usr/bin/env node
/**
 * Voice gate for public surfaces (README, docs/, ADRs, CHANGELOG, CONTRIBUTING, SECURITY):
 * no em dash, no spaced hyphen used as one, none of the banned words of the voice spec.
 * Fenced code blocks and inline code are exempt (they hold commands and quoted output), and
 * so are CHANGELOG version headings, whose "## [x.y.z] - date" format validate-changelog owns.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const BANNED = /\b(leverag\w*|seamless\w*|cutting-edge|empower\w*|elevat(?:e|es|ed|ing)|robust\w*)\b/i;
const SPACED_HYPHEN = /(?<=[A-Za-z0-9)\]*_]) - (?=[A-Za-z0-9(\[*_])/;
const CHANGELOG_HEADING = /^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}\s*$/;

/** Findings for one text. @param {string} text @param {{ html?: boolean }} [opts] */
export function voiceFindings(text, opts = {}) {
  const out = [];
  let fence = false;
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    if (!opts.html && /^\s*```/.test(raw)) {
      fence = !fence;
      continue;
    }
    if (fence || CHANGELOG_HEADING.test(raw)) continue;
    let line = raw.replace(/`[^`]*`/g, "``");
    if (opts.html) line = line.replace(/<(script|style)[\s\S]*$/i, "").replace(/<[^>]+>/g, " ");
    if (line.includes("—")) out.push(`${i + 1}: em dash`);
    if (!opts.html && SPACED_HYPHEN.test(line)) out.push(`${i + 1}: spaced hyphen used as a dash`);
    const m = BANNED.exec(line);
    if (m) out.push(`${i + 1}: banned word "${m[1]}"`);
  }
  return out;
}

const PUBLIC_FILES = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "packages/pn-core-mcp/README.md",
  "plugins/pnCore/README.md",
  "plugins/pnCore/CHANGELOG.md",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(md|html|svg)$/.test(name)) yield p;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const files = PUBLIC_FILES.map((f) => join(root, f)).filter((f) => existsSync(f));
  files.push(...walk(join(root, "docs")));
  const errors = [];
  for (const file of files) {
    const html = /\.(html|svg)$/.test(file);
    for (const f of voiceFindings(readFileSync(file, "utf8"), { html })) {
      errors.push(`${relative(root, file)}:${f}`);
    }
  }
  if (errors.length) {
    console.error("check-public-voice: public surfaces follow voice-and-tone (technical register):");
    for (const e of errors.slice(0, 80)) console.error(`  ${e}`);
    if (errors.length > 80) console.error(`  … ${errors.length - 80} more`);
    process.exit(1);
  }
  console.log(`check-public-voice: OK (${files.length} files)`);
}
