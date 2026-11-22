#!/usr/bin/env node
/**
 * Fails when canonical content tells an agent to fetch and run third-party code from a moving
 * ref: `npx github:owner/repo` without `#<ref>`, `pip install git+URL` without `@<ref>`, or a
 * `curl … | sh` pipe. Pinning keeps a skill from executing whatever a branch holds today.
 * pnCore's own install line is exempt: consumers install pnCore from this repository.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const SELF = /github:perniemann\/pnCore\b/i;

/** Findings for one text. @param {string} text @returns {string[]} */
export function unpinnedInstalls(text) {
  const out = [];
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    for (const m of line.matchAll(/\bgithub:([\w.-]+\/[\w.-]+)(#\S+)?/g)) {
      if (!m[2] && !SELF.test(m[0])) out.push(`${i + 1}: github:${m[1]} has no #<commit-or-tag>`);
    }
    for (const m of line.matchAll(/\bgit\+https?:\/\/[^\s`'")]+/g)) {
      const url = m[0];
      const tail = url.slice(url.lastIndexOf("/") + 1);
      if (!tail.includes("@")) out.push(`${i + 1}: ${url} has no @<commit-or-tag>`);
    }
    if (/\bcurl\b[^|`]*\|\s*(ba|z)?sh\b/.test(line)) out.push(`${i + 1}: curl piped into a shell`);
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(md|mdc|json|ya?ml)$/.test(name)) yield p;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const content = join(root, "packages", "pn-core-mcp", "content");
  const errors = [];
  for (const file of walk(content)) {
    for (const f of unpinnedInstalls(readFileSync(file, "utf8"))) {
      errors.push(`${relative(root, file)}:${f}`);
    }
  }
  if (errors.length) {
    console.error("check-unpinned-installs: pin third-party code to a reviewed commit or tag:");
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("check-unpinned-installs: OK");
}
