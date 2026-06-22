/**
 * Unit tests for scripts/install-to-project.mjs.
 * Covers:
 *   1. path-containment rejection: target outside process.cwd() exits 1 without --force
 *   2. backup creation: an existing .cursor/ in the target is copied to .cursor.bak-<ISO>/ before overwrite
 *
 * Runs via node:test (built-in). Invoke with: npm run test:scripts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const installer = join(repoRoot, "scripts", "install-to-project.mjs");

function runInstaller(args, opts = {}) {
  return spawnSync(process.execPath, [installer, ...args], {
    cwd: opts.cwd ?? repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

test("rejects target outside process.cwd() without --force", () => {
  // Pick a path guaranteed to be outside repoRoot.
  const outside = mkdtempSync(join(tmpdir(), "pn-core-outside-"));
  try {
    const r = runInstaller([outside]);
    assert.notEqual(r.status, 0, "expected non-zero exit when target is outside cwd");
    const combined = `${r.stdout}\n${r.stderr}`;
    assert.match(
      combined,
      /outside process\.cwd|--force/i,
      "expected error message to mention containment / --force"
    );
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("--force allows target outside process.cwd()", () => {
  const outside = mkdtempSync(join(tmpdir(), "pn-core-outside-force-"));
  try {
    const r = runInstaller([outside, "--force"]);
    // We don't require exit 0 — copying may still fail if plugins/pnCore is missing — but
    // the path-containment check itself must not be the reason for failure.
    const combined = `${r.stdout}\n${r.stderr}`;
    assert.doesNotMatch(
      combined,
      /outside process\.cwd/i,
      "containment error must not fire when --force is passed"
    );
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("backs up existing .cursor/ to .cursor.bak-<ts>/ before overwrite", () => {
  // Place the target inside repoRoot so containment passes without --force.
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-"));
  try {
    const cursorDir = join(target, ".cursor");
    mkdirSync(join(cursorDir, "rules"), { recursive: true });
    writeFileSync(join(cursorDir, "rules", "sentinel.md"), "# pre-existing\n");

    const r = runInstaller([target]);
    // Installer should have created a backup, regardless of whether the full copy succeeded.
    const backups = readdirSync(target).filter((n) => n.startsWith(".cursor.bak-"));
    assert.equal(
      backups.length,
      1,
      `expected exactly one .cursor.bak-* dir, got ${backups.length}`
    );
    const sentinel = join(target, backups[0], "rules", "sentinel.md");
    assert.ok(
      existsSync(sentinel),
      `expected backup to contain pre-existing file, missing ${sentinel}`
    );
    // Surface installer output on failure to make CI logs useful.
    if (r.status !== 0) {
      // Don't fail the test on non-zero exit — we only assert backup behavior here.
      // (full install behavior is exercised end-to-end elsewhere)
    }
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--overwrite skips backup creation", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-overwrite-"));
  try {
    const cursorDir = join(target, ".cursor");
    mkdirSync(cursorDir, { recursive: true });
    writeFileSync(join(cursorDir, "marker.txt"), "before\n");

    runInstaller([target, "--overwrite"]);
    const backups = readdirSync(target).filter((n) => n.startsWith(".cursor.bak-"));
    assert.equal(backups.length, 0, "no backup should be created when --overwrite is set");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
