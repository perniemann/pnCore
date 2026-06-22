#!/usr/bin/env node
/**
 * Removes IDE-injected lines from commit message files (prepare-commit-msg hook).
 * Keeps legitimate Co-authored-by lines from humans; strips Cursor marketing trailers.
 */
import { readFileSync, writeFileSync } from "fs";

const path = process.argv[2];
if (!path) process.exit(0);

let text = readFileSync(path, "utf8");
const lines = text.split(/\r?\n/);
const out = lines.filter((line) => {
  if (/^Made-with:/i.test(line)) return false;
  if (/^Co-authored-by:.*cursoragent@cursor\.com/i.test(line)) return false;
  if (/^Co-authored-by:.*Cursor\s*<cursor@cursor\.com>/i.test(line)) return false;
  return true;
});

const next = out
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/\s+$/, "");
writeFileSync(path, next ? next + "\n" : "\n", "utf8");
