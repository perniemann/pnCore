/**
 * Tests for consumer-gating templates and scripts/install-consumer-gating.mjs.
 * Invoke with: npm run test:scripts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const installer = join(repoRoot, "scripts", "install-consumer-gating.mjs");
const repoStrip = join(repoRoot, "scripts", "strip-commit-trailers.mjs");
const templateStrip = join(
  repoRoot,
  "packages",
  "pn-core-mcp",
  "content",
  "docs",
  "templates",
  "consumer-gating",
  "strip-commit-trailers.mjs"
);

function runInstaller(args, opts = {}) {
  return spawnSync(process.execPath, [installer, ...args], {
    cwd: opts.cwd ?? repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function runStrip(script, messagePath) {
  return spawnSync(process.execPath, [script, messagePath], {
    encoding: "utf8",
  });
}

test("rejects target outside process.cwd() without --force", () => {
  const outside = mkdtempSync(join(tmpdir(), "pn-gating-outside-"));
  try {
    const r = runInstaller([outside]);
    assert.notEqual(r.status, 0);
    assert.match(`${r.stdout}\n${r.stderr}`, /outside process\.cwd|--force/i);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("installs .githooks into a contained git target", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-gating-"));
  try {
    const init = spawnSync("git", ["init"], { cwd: target, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    const r = runInstaller([target]);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.ok(existsSync(join(target, ".githooks", "prepare-commit-msg")));
    assert.ok(existsSync(join(target, ".githooks", "strip-commit-trailers.mjs")));
    assert.ok(existsSync(join(target, ".githooks", "check-commit-no-ide-trailers.mjs")));
    assert.equal(existsSync(join(target, ".github", "workflows", "no-ide-trailers.yml")), false);
    const cfg = spawnSync("git", ["config", "--get", "core.hooksPath"], {
      cwd: target,
      encoding: "utf8",
    });
    assert.equal(cfg.stdout.trim(), ".githooks");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--ci copies the trailer-only workflow", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-gating-ci-"));
  try {
    spawnSync("git", ["init"], { cwd: target, encoding: "utf8" });
    const r = runInstaller([target, "--ci"]);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    const yml = readFileSync(join(target, ".github", "workflows", "no-ide-trailers.yml"), "utf8");
    assert.match(yml, /no-ide-trailers/);
    assert.match(yml, /\.githooks\/check-commit-no-ide-trailers\.mjs/);
    assert.doesNotMatch(yml, /pn-gates|validate-changelog|automerge/);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("refuses to overwrite existing hook without --overwrite", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-gating-exists-"));
  try {
    spawnSync("git", ["init"], { cwd: target, encoding: "utf8" });
    const first = runInstaller([target, "--no-hooks-path"]);
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
    const second = runInstaller([target, "--no-hooks-path"]);
    assert.notEqual(second.status, 0);
    assert.match(`${second.stdout}\n${second.stderr}`, /exists/);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("repo and consumer strip scripts remove the same IDE trailers", () => {
  const dir = mkdtempSync(join(repoRoot, "tmp-pn-gating-strip-"));
  try {
    const sample = [
      "feat: add hook",
      "",
      "Made-with: Cursor",
      "Co-authored-by: Agent <cursoragent@cursor.com>",
      "Co-authored-by: Cursor <cursor@cursor.com>",
      "Co-authored-by: Ada Lovelace <ada@example.com>",
      "",
    ].join("\n");
    const a = join(dir, "repo.txt");
    const b = join(dir, "tmpl.txt");
    writeFileSync(a, sample);
    writeFileSync(b, sample);
    assert.equal(runStrip(repoStrip, a).status, 0);
    assert.equal(runStrip(templateStrip, b).status, 0);
    const outA = readFileSync(a, "utf8");
    const outB = readFileSync(b, "utf8");
    assert.equal(outA, outB);
    assert.match(outA, /Ada Lovelace/);
    assert.doesNotMatch(outA, /Made-with:/);
    assert.doesNotMatch(outA, /cursoragent@cursor\.com/);
    assert.doesNotMatch(outA, /cursor@cursor\.com/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installed hook strips trailers from a commit message file", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-gating-hook-"));
  try {
    spawnSync("git", ["init"], { cwd: target, encoding: "utf8" });
    const r = runInstaller([target, "--no-hooks-path"]);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    const msg = join(target, "COMMIT_EDITMSG");
    writeFileSync(msg, "fix: trailers\n\nMade-with: Cursor\n");
    chmodSync(join(target, ".githooks", "prepare-commit-msg"), 0o755);
    const hook = spawnSync(join(target, ".githooks", "prepare-commit-msg"), [msg], {
      cwd: target,
      encoding: "utf8",
    });
    assert.equal(hook.status, 0, hook.stderr);
    const body = readFileSync(msg, "utf8");
    assert.match(body, /fix: trailers/);
    assert.doesNotMatch(body, /Made-with:/);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
