#!/usr/bin/env node
/**
 * Installs portable consumer git/CI trailer gates into a target project.
 * Usage: node scripts/install-consumer-gating.mjs [targetDir] [--ci] [--overwrite] [--force] [--no-hooks-path]
 *        Default targetDir = current working directory.
 *        --ci: also copy no-ide-trailers.yml to .github/workflows/
 *        --overwrite: replace existing hook / workflow files
 *        --force: allow target outside process.cwd()
 *        --no-hooks-path: write files only; do not run git config core.hooksPath
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
const FLAGS = new Set(["--ci", "--overwrite", "--force", "--no-hooks-path"]);
const withCi = argv.includes("--ci");
const allowOverwrite = argv.includes("--overwrite");
const forcePath = argv.includes("--force");
const skipHooksPath = argv.includes("--no-hooks-path");
const targetArg = argv.find((a) => !FLAGS.has(a));

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
  const r = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: targetRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.warn(
      "install-consumer-gating: git config core.hooksPath failed — run it in the clone:",
      (r.stderr || r.stdout || "").trim() || `exit ${r.status}`
    );
  } else {
    console.log("install-consumer-gating: git core.hooksPath = .githooks");
  }
}

console.log(
  "\nDone. Cursor rule pn-no-cursor-commit-trailers is still required (alwaysApply)." +
    (withCi ? "" : " Add --ci to copy the trailer-only GitHub Actions workflow.")
);
