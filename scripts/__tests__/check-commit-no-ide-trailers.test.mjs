/**
 * Tests for scripts/check-commit-no-ide-trailers.mjs (trailers + Author/Committer).
 * Invoke with: npm run test:scripts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const checker = join(repoRoot, "scripts", "check-commit-no-ide-trailers.mjs");

function git(cwd, args, env = {}) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      ...env,
    },
  });
  assert.equal(r.status, 0, `${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout.trim();
}

function runChecker(cwd, env) {
  return spawnSync(process.execPath, [checker], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      ...env,
    },
  });
}

function initRepo() {
  const dir = mkdtempSync(join(repoRoot, "tmp-pn-trailers-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.name", "perniemann"]);
  git(dir, ["config", "user.email", "69075531+perniemann@users.noreply.github.com"]);
  writeFileSync(join(dir, "README.md"), "ok\n");
  git(dir, ["add", "README.md"]);
  git(dir, ["commit", "-m", "init"]);
  const base = git(dir, ["rev-parse", "HEAD"]);
  return { dir, base };
}

test("passes a human-authored commit without trailers", () => {
  const { dir, base } = initRepo();
  try {
    writeFileSync(join(dir, "a.txt"), "a\n");
    git(dir, ["add", "a.txt"]);
    git(dir, ["commit", "-m", "feat: human"]);
    const after = git(dir, ["rev-parse", "HEAD"]);
    const r = runChecker(dir, {
      GITHUB_EVENT_NAME: "push",
      BEFORE: base,
      AFTER: after,
    });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails when Author is Cursor Agent", () => {
  const { dir, base } = initRepo();
  try {
    writeFileSync(join(dir, "b.txt"), "b\n");
    git(dir, ["add", "b.txt"]);
    git(dir, ["commit", "-m", "feat: agent"], {
      GIT_AUTHOR_NAME: "Cursor Agent",
      GIT_AUTHOR_EMAIL: "cursoragent@cursor.com",
      GIT_COMMITTER_NAME: "Cursor Agent",
      GIT_COMMITTER_EMAIL: "cursoragent@cursor.com",
    });
    const after = git(dir, ["rev-parse", "HEAD"]);
    const r = runChecker(dir, {
      GITHUB_EVENT_NAME: "push",
      BEFORE: base,
      AFTER: after,
    });
    assert.equal(r.status, 1);
    assert.match(`${r.stdout}\n${r.stderr}`, /author email/);
    assert.match(`${r.stdout}\n${r.stderr}`, /cursoragent@cursor\.com/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails when Co-authored-by cursoragent trailer is present", () => {
  const { dir, base } = initRepo();
  try {
    writeFileSync(join(dir, "c.txt"), "c\n");
    git(dir, ["add", "c.txt"]);
    git(dir, [
      "commit",
      "-m",
      "feat: squash\n\nCo-authored-by: Cursor Agent <cursoragent@cursor.com>\n",
    ]);
    const after = git(dir, ["rev-parse", "HEAD"]);
    const r = runChecker(dir, {
      GITHUB_EVENT_NAME: "push",
      BEFORE: base,
      AFTER: after,
    });
    assert.equal(r.status, 1);
    assert.match(`${r.stdout}\n${r.stderr}`, /Co-authored-by cursoragent/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
