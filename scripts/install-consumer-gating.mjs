#!/usr/bin/env node
/**
 * Installs portable consumer git/CI trailer gates into a target project.
 * Usage: node scripts/install-consumer-gating.mjs [targetDir] [--ci] [--overwrite] [--force] [--no-hooks-path] [--replace-hooks-path]
 *        Default targetDir = current working directory.
 *        --ci: also copy no-ide-trailers.yml to .github/workflows/
 *        --overwrite: replace existing hook / workflow files
 *        --force: allow target outside process.cwd()
 *        --no-hooks-path: write files only; do not run git config core.hooksPath
 *        --replace-hooks-path: set core.hooksPath=.githooks even when another manager is already configured
 *
 * Does not copy pnCore release CI (pn-gates, version/CHANGELOG, automerge).
 * See pn-core://reference/consumer-gating.md and docs/adr/0015-consumer-project-gating.md.
 */
import { copyFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, isAbsolute, join, resolve, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const templateDir = join(
  repoRoot,
  "packages",
  "pn-core-mcp",
  "content",
  "docs",
  "templates",
  "consumer-gating"
);

const argv = process.argv.slice(2);
const FLAGS = new Set([
  "--ci",
  "--overwrite",
  "--force",
  "--no-hooks-path",
  "--replace-hooks-path",
]);
const withCi = argv.includes("--ci");
const allowOverwrite = argv.includes("--overwrite");
const forcePath = argv.includes("--force");
const skipHooksPath = argv.includes("--no-hooks-path");
const replaceHooksPath = argv.includes("--replace-hooks-path");
const targetArg = argv.find((a) => !FLAGS.has(a));

function gitConfig(cwd, args) {
  return spawnSync("git", ["config", ...args], { cwd, encoding: "utf8" });
}

/** Resolve a hooksPath value relative to the target clone. */
function resolveHooksPath(value, root) {
  const trimmed = String(value ?? "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!trimmed) return "";
  return resolve(isAbsolute(trimmed) ? trimmed : join(root, trimmed));
}

function isPncoreHooksPath(value, root) {
  const got = resolveHooksPath(value, root);
  return Boolean(got) && got === resolveHooksPath(".githooks", root);
}

function readExistingHooksPath(cwd) {
  const r = gitConfig(cwd, ["--get", "core.hooksPath"]);
  if (r.status !== 0) return "";
  return (r.stdout || "").trim();
}

let targetRoot = targetArg
  ? isAbsolute(targetArg)
    ? targetArg
    : join(process.cwd(), targetArg)
  : process.cwd();

if (!forcePath) {
  const safeCwd = resolve(process.cwd());
  const resolvedTarget = resolve(targetRoot);
  const isContained = resolvedTarget === safeCwd || resolvedTarget.startsWith(safeCwd + sep);
  if (!isContained) {
    console.error(
      `install-consumer-gating: target '${resolvedTarget}' is outside process.cwd() '${safeCwd}'.`,
      "Pass --force to allow targets outside the working directory."
    );
    process.exit(1);
  }
}

if (!existsSync(templateDir)) {
  console.error("install-consumer-gating: templates missing at", templateDir);
  process.exit(1);
}

const files = [
  {
    src: "prepare-commit-msg",
    dest: join(targetRoot, ".githooks", "prepare-commit-msg"),
    mode: 0o755,
  },
  {
    src: "strip-commit-trailers.mjs",
    dest: join(targetRoot, ".githooks", "strip-commit-trailers.mjs"),
  },
  {
    src: "check-commit-no-ide-trailers.mjs",
    dest: join(targetRoot, ".githooks", "check-commit-no-ide-trailers.mjs"),
  },
];

if (withCi) {
  files.push({
    src: "no-ide-trailers.yml",
    dest: join(targetRoot, ".github", "workflows", "no-ide-trailers.yml"),
  });
}

for (const { src, dest, mode } of files) {
  if (existsSync(dest) && !allowOverwrite) {
    console.error(
      `install-consumer-gating: ${dest} exists. Pass --overwrite to replace, or leave the existing file.`
    );
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(templateDir, src), dest);
  if (mode) {
    try {
      chmodSync(dest, mode);
    } catch {
      // Windows and some FS ignore chmod; the hook still runs via `node` shebang-less exec.
    }
  }
  console.log("Wrote", dest.replace(resolve(targetRoot), "."));
}

if (!skipHooksPath) {
  const existing = readExistingHooksPath(targetRoot);
  const ours = isPncoreHooksPath(existing, targetRoot);
  if (existing && !ours && !replaceHooksPath) {
    console.warn(`install-consumer-gating: left core.hooksPath = ${existing} (not overwritten).`);
    console.warn(
      'Compose: add this line to the existing prepare-commit-msg hook:\n  node .githooks/strip-commit-trailers.mjs "$1"'
    );
    console.warn(
      "Or pass --replace-hooks-path to point Git at .githooks (replaces the current hook manager)."
    );
  } else {
    const r = gitConfig(targetRoot, ["core.hooksPath", ".githooks"]);
    if (r.status !== 0) {
      console.warn(
        "install-consumer-gating: git config core.hooksPath failed — run it in the clone:",
        (r.stderr || r.stdout || "").trim() || `exit ${r.status}`
      );
    } else if (existing && !ours && replaceHooksPath) {
      console.log(`install-consumer-gating: replaced core.hooksPath ${existing} → .githooks`);
    } else {
      console.log("install-consumer-gating: git core.hooksPath = .githooks");
    }
  }
}

console.log(
  "\nDone. Cursor rule pn-no-cursor-commit-trailers is still required (alwaysApply)." +
    (withCi ? "" : " Add --ci to copy the trailer-only GitHub Actions workflow.")
);
