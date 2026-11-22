#!/usr/bin/env node
/**
 * ADR numbering gate. Every file in docs/adr/ is NNNN-slug.md, numbers run 0001..max with no
 * duplicate and no gap (a retired number keeps a stub), every file has a line in
 * docs/adr/README.md and every index link points at a real file. Numbers are never reused, so
 * a duplicate or a gap is always a mistake, never a choice.
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/** @param {string[]} files names in docs/adr @param {string} index README.md text */
export function adrIndexFindings(files, index) {
  const out = [];
  const adrs = files.filter((f) => f !== "README.md" && f.endsWith(".md"));
  const byNum = new Map();
  for (const f of adrs) {
    const m = /^(\d{4})-[a-z0-9][a-z0-9-]*\.md$/.exec(f);
    if (!m) {
      out.push(`${f}: name is not NNNN-kebab-slug.md`);
      continue;
    }
    if (byNum.has(m[1])) out.push(`${f}: number ${m[1]} already used by ${byNum.get(m[1])}`);
    else byNum.set(m[1], f);
  }
  const nums = [...byNum.keys()].map(Number).sort((a, b) => a - b);
  const max = nums.length ? nums[nums.length - 1] : 0;
  for (let n = 1; n <= max; n++) {
    const id = String(n).padStart(4, "0");
    if (!byNum.has(id)) out.push(`${id}: missing (keep a stub for a retired number)`);
  }
  const linked = new Set([...index.matchAll(/\]\(\.\/([^)#]+\.md)\)/g)].map((m) => m[1]));
  for (const f of adrs) if (!linked.has(f)) out.push(`${f}: not listed in docs/adr/README.md`);
  for (const f of linked) if (!adrs.includes(f)) out.push(`README.md: links missing file ${f}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "adr");
  const files = readdirSync(dir);
  const errors = adrIndexFindings(files, readFileSync(join(dir, "README.md"), "utf8"));
  if (errors.length) {
    console.error("check-adr-index: FAIL\n" + errors.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log(`check-adr-index: OK (${files.length - 1} ADRs)`);
}
