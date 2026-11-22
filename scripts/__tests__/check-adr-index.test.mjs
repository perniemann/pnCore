import { test } from "node:test";
import assert from "node:assert/strict";
import { adrIndexFindings } from "../check-adr-index.mjs";

const idx = (...f) => f.map((x) => `- [x](./${x}): y`).join("\n");

test("passes a contiguous, fully indexed set", () => {
  const files = ["0001-a.md", "0002-b.md", "README.md"];
  assert.deepEqual(adrIndexFindings(files, idx("0001-a.md", "0002-b.md")), []);
});

test("flags duplicates, gaps, bad names and index drift", () => {
  const files = ["0001-a.md", "0001-b.md", "0003-c.md", "Notes.md", "README.md"];
  const out = adrIndexFindings(files, idx("0001-a.md", "0001-b.md", "0003-c.md", "0009-gone.md"));
  assert.ok(out.some((e) => /0001-b\.md: number 0001 already used/.test(e)));
  assert.ok(out.some((e) => /^0002: missing/.test(e)));
  assert.ok(out.some((e) => /Notes\.md: name/.test(e)));
  assert.ok(out.some((e) => /links missing file 0009-gone\.md/.test(e)));
  assert.ok(out.some((e) => /Notes\.md/.test(e)));
});

test("flags an ADR absent from the index", () => {
  assert.match(adrIndexFindings(["0001-a.md", "README.md"], "")[0], /not listed/);
});
