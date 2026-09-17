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
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
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
    env: opts.env ?? process.env,
  });
}

/** Environment with every harness signal removed so auto-detect depends only on the target folder. */
function cleanEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CURSOR_|CLAUDE|CODEX_|PI_|PNCORE_HARNESS)/.test(k)) continue;
    env[k] = v;
  }
  return { ...env, ...extra };
}

function listTop(dir) {
  return readdirSync(dir).sort();
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

// ─── Harness-aware install ─────────────────────────────────────────────────

test("--harness claude_code writes only .claude/ (no .cursor/, no .agents/)", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-claude-"));
  try {
    const r = runInstaller([target, "--harness", "claude_code"], { env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(listTop(target), [".claude"]);
    assert.deepEqual(listTop(join(target, ".claude")), ["agents", "commands", "rules", "skills"]);
    assert.ok(existsSync(join(target, ".claude", "skills", "pn-writing-plans", "SKILL.md")));
    assert.ok(existsSync(join(target, ".claude", "commands", "pn-setup.md")));
    const react = readFileSync(join(target, ".claude", "rules", "pn-react.md"), "utf8");
    assert.match(react, /^---\ndescription: /, "converted rule keeps description");
    assert.match(react, /paths:\n {2}- "\*\*\/\*\.tsx"/, "globs become Claude paths");
    assert.doesNotMatch(react, /alwaysApply/);
    assert.equal(
      existsSync(join(target, ".claude", "rules", "pn-communication-contract.md")),
      false,
      "agent-requested rule stays MCP-only"
    );
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--harness codex writes .agents/skills + AGENTS.md block and nothing Cursor-specific", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-codex-"));
  try {
    writeFileSync(join(target, "AGENTS.md"), "# Team\n\n- keep this\n");
    const r = runInstaller([target, "--harness", "codex", "--with-mcp-config"], {
      env: cleanEnv(),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(listTop(target), [".agents", ".codex", "AGENTS.md"]);
    assert.ok(existsSync(join(target, ".agents", "skills", "pn-writing-plans", "SKILL.md")));
    const agents = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.ok(agents.startsWith("# Team\n\n- keep this\n"), "user text preserved");
    assert.match(
      agents,
      /<!-- pncore:start -->[\s\S]*## pnCore \(Codex\)[\s\S]*<!-- pncore:end -->/
    );
    assert.match(agents, /\$skill-name/);
    const toml = readFileSync(join(target, ".codex", "config.toml"), "utf8");
    assert.match(toml, /\[mcp_servers\.pn-core\]/);

    // Re-run is idempotent: block replaced in place, not appended twice.
    const r2 = runInstaller([target, "--harness", "codex", "--overwrite"], { env: cleanEnv() });
    assert.equal(r2.status, 0, r2.stderr);
    const again = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.equal((again.match(/<!-- pncore:start -->/g) ?? []).length, 1);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--harness codex,pi shares .agents/skills and writes .pi/prompts once", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-codex-pi-"));
  try {
    const r = runInstaller([target, "--harness", "codex,pi", "--with-mcp-config"], {
      env: cleanEnv(),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(listTop(target), [".agents", ".codex", ".pi", "AGENTS.md"]);
    assert.deepEqual(listTop(join(target, ".pi")), ["prompts", "settings.json"]);
    assert.ok(existsSync(join(target, ".pi", "prompts", "pn-new.md")));
    const settings = JSON.parse(readFileSync(join(target, ".pi", "settings.json"), "utf8"));
    assert.deepEqual(settings.packages, ["git:github.com/perniemann/pnCore@main"]);
    const agents = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.match(agents, /## pnCore \(Codex \+ Pi\)/);
    assert.match(r.stdout, /171 skills, flat ids/);
    assert.equal((r.stdout.match(/flat ids/g) ?? []).length, 1, "skills copied once for both");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--inline-rules inlines always-apply rule bodies into the AGENTS.md block", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-inline-"));
  try {
    const r = runInstaller([target, "--harness", "pi", "--inline-rules"], { env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    const agents = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.match(agents, /### Always-on pnCore rules \(inlined\)/);
    assert.match(agents, /<!-- rule: pn-build-gate -->/);
    assert.doesNotMatch(agents, /alwaysApply:/);
    assert.match(
      r.stdout,
      /Instructions -> \.\/AGENTS\.md pnCore block created — [\d.]+ KiB, ≈\d+ tokens \(\d+ always-apply rules inlined\)/
    );
    assert.doesNotMatch(r.stdout, /of 32\.0 KiB cap/, "Pi has no instructions cap");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--harness codex --inline-rules keeps AGENTS.md under the 32 KiB cap by omitting low-priority rules (ADR-0021)", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-cap-"));
  try {
    const existing =
      "# Team notes\n\n" + "Existing guidance that must survive untouched.\n".repeat(260);
    writeFileSync(join(target, "AGENTS.md"), existing);
    const r = runInstaller([target, "--harness", "codex", "--inline-rules"], { env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    const agents = readFileSync(join(target, "AGENTS.md"), "utf8");
    assert.ok(
      Buffer.byteLength(agents) <= 32768,
      `AGENTS.md is ${Buffer.byteLength(agents)} bytes`
    );
    assert.ok(agents.startsWith(existing), "content outside the pnCore block is untouched");
    assert.match(agents, /<!-- rule: pn-mcp-proactive -->/, "highest-priority rule is inlined");
    assert.match(agents, /- Not inlined \(instructions-file byte cap\): `pn-[a-z-]+`/);
    assert.match(
      r.stdout,
      /of 32\.0 KiB cap, ≈\d+ tokens \(\d+ of \d+ always-apply rules inlined; omitted for the cap: pn-/
    );
    assert.doesNotMatch(r.stderr, /WARNING/);

    // Re-running is idempotent for the block.
    const again = runInstaller([target, "--harness", "codex", "--inline-rules", "--overwrite"], {
      env: cleanEnv(),
    });
    assert.equal(again.status, 0, again.stderr);
    assert.equal(readFileSync(join(target, "AGENTS.md"), "utf8"), agents);
    assert.match(again.stdout, /pnCore block unchanged/);

    // Over the cap with nothing inlined: block still written, loud warning, exit 0.
    const over = mkdtempSync(join(repoRoot, "tmp-pn-install-over-"));
    try {
      writeFileSync(join(over, "AGENTS.md"), "x".repeat(40_000) + "\n");
      const r2 = runInstaller([over, "--harness", "codex", "--inline-rules"], { env: cleanEnv() });
      assert.equal(r2.status, 0, r2.stderr);
      assert.match(r2.stdout, /0 of \d+ always-apply rules inlined/);
      assert.match(
        r2.stderr,
        /WARNING: AGENTS\.md is \d+ bytes, over the 32768-byte cap by \d+ with no pnCore rules inlined/
      );
      // A larger cap via env lets everything in.
      const r3 = runInstaller([over, "--harness", "codex", "--inline-rules", "--overwrite"], {
        env: cleanEnv({ PNCORE_AGENTS_MD_CAP_BYTES: "131072" }),
      });
      assert.equal(r3.status, 0, r3.stderr);
      assert.match(r3.stdout, /of 128\.0 KiB cap, ≈\d+ tokens \(\d+ always-apply rules inlined\)/);
    } finally {
      rmSync(over, { recursive: true, force: true });
    }
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("--harness auto detects from target folders and falls back to cursor", () => {
  const detected = mkdtempSync(join(repoRoot, "tmp-pn-install-auto-"));
  const empty = mkdtempSync(join(repoRoot, "tmp-pn-install-auto-empty-"));
  try {
    mkdirSync(join(detected, ".claude"));
    const r = runInstaller([detected], { env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Harness auto-detect -> claude_code/);
    assert.equal(existsSync(join(detected, ".cursor")), false, "no .cursor/ for a Claude project");

    const r2 = runInstaller([empty], { env: cleanEnv() });
    assert.equal(r2.status, 0, r2.stderr);
    assert.match(r2.stdout, /nothing detected; defaulting to cursor/);
    assert.ok(existsSync(join(empty, ".cursor", "rules")));

    const r3 = runInstaller([empty, "--harness", "emacs"], { env: cleanEnv() });
    assert.notEqual(r3.status, 0);
    assert.match(r3.stderr, /unknown --harness/);
  } finally {
    rmSync(detected, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test("PNCORE_HARNESS env drives auto-detect", () => {
  const target = mkdtempSync(join(repoRoot, "tmp-pn-install-env-"));
  try {
    const r = runInstaller([target], { env: cleanEnv({ PNCORE_HARNESS: "pi" }) });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Harness auto-detect -> pi/);
    assert.deepEqual(listTop(target), [".agents", ".pi", "AGENTS.md"]);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
