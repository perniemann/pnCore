/**
 * Unit tests for scripts/doc-links-lib.mjs and check-doc-links exit codes.
 * Invoke with: node --test scripts/__tests__/doc-links.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extractLinks, checkFile, collectValidPnCoreUris } from "../doc-links-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "..", "__fixtures__", "doc-links");
const repoRoot = join(__dirname, "..", "..");
const contentRoot = join(repoRoot, "packages", "pn-core-mcp", "content");
const contentTs = join(repoRoot, "packages", "pn-core-mcp", "src", "content.ts");

test("extractLinks finds pn-core URIs and relative markdown links", () => {
  const md = [
    "See `pn-core://reference/best-practices.md` and [rel](./x.md).",
    "Ignore https://example.com and [hash](#section).",
  ].join("\n");
  const { pnCore, relative } = extractLinks(md);
  assert.ok(pnCore.includes("pn-core://reference/best-practices.md"));
  assert.deepEqual(relative, ["./x.md"]);
});

test("extractLinks ignores markdown links inside fenced code blocks", () => {
  const md = [
    "```markdown",
    "| [../discovery/…](../discovery/) | Discovery specs |",
    "```",
    "Outside: [ok](./targets/ok.md).",
  ].join("\n");
  const { relative } = extractLinks(md);
  assert.ok(!relative.includes("../discovery/"));
  assert.deepEqual(relative, ["./targets/ok.md"]);
});

test("checkFile accepts good fixture", () => {
  const validUris = collectValidPnCoreUris(contentTs, contentRoot);
  const r = checkFile(join(fixtures, "good", "ok.md"), { validUris });
  assert.deepEqual(r.brokenPnCore, []);
  assert.deepEqual(r.brokenRelative, []);
});

test("checkFile flags broken pn-core URI", () => {
  const validUris = collectValidPnCoreUris(contentTs, contentRoot);
  const r = checkFile(join(fixtures, "bad-pncore", "broken.md"), { validUris });
  assert.ok(r.brokenPnCore.some((u) => u.includes("__does-not-exist-ever__")));
});

test("checkFile flags broken relative link", () => {
  const validUris = new Set();
  const r = checkFile(join(fixtures, "bad-relative", "broken.md"), { validUris });
  assert.ok(r.brokenRelative.includes("./no-such-file.md"));
});

test("check-doc-links CLI exits 0 when repo links are clean", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "check-doc-links.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /0 broken offline links/);
});

test("check-doc-links soft mode exits 0 even if forced (PNCORE_STRICT_LINKS=0)", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "check-doc-links.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PNCORE_STRICT_LINKS: "0" },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
