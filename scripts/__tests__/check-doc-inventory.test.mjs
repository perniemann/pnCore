/**
 * Unit tests for scripts/check-doc-inventory.mjs
 * Invoke with: node --test scripts/__tests__/check-doc-inventory.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  pnGuideLiveHeadlines,
  checkPnGuideLiveCounts,
  parseReadmeCatalog,
  runCheck,
} from "../check-doc-inventory.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

test("pnGuideLiveHeadlines derives submenu as visible minus stub", () => {
  const headlines = pnGuideLiveHeadlines({ visible: 31, hidden: 18 });
  assert.deepEqual(headlines, [
    "**30** leaves",
    "**31** visible palette files total",
    "**18** palette-hidden",
  ]);
});

test("checkPnGuideLiveCounts fails when headlines are stale", () => {
  const actual = { visible: 31, hidden: 18 };
  const stale = "**27** leaves. **28** visible palette files total. **18** palette-hidden";
  const missing = checkPnGuideLiveCounts(stale, actual);
  assert.ok(missing.includes("**30** leaves"));
  assert.ok(missing.includes("**31** visible palette files total"));
  assert.ok(!missing.includes("**18** palette-hidden"));
});

test("parseReadmeCatalog reads the Catalog line", () => {
  const parsed = parseReadmeCatalog(
    "**Catalog:** 171 skills, 9 public agents + 6 internal orchestration agents, 31 visible slash palette files (30 under **`pn`** submenu + **`/pn`** stub) + 18 palette-hidden surgical commands (49 command files total), 29 MCP tools, 16 workflow types, plus `pn-core://` resources and prompts."
  );
  assert.deepEqual(parsed, {
    skills: 171,
    visible: 31,
    hidden: 18,
    commands: 49,
    workflows: 16,
  });
});

test("runCheck passes on this repo", () => {
  const r = runCheck(repoRoot);
  assert.equal(r.ok, true, r.message);
});

test("check-doc-inventory CLI exits 0", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "check-doc-inventory.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /pn-guide live headlines match/);
});
