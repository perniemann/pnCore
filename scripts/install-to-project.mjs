#!/usr/bin/env node
/**
 * Installs pnCore plugin content into a project so it works fully in that workspace.
 * Usage: node scripts/install-to-project.mjs [targetDir] [--with-shadcn] [--overwrite] [--force]
 *        Default targetDir = current working directory.
 *        --with-shadcn: run npx shadcn@latest mcp init --client cursor in target.
 *        --overwrite: skip backup and overwrite existing .cursor/ (opt-in to old behavior).
 *        --force: allow target outside process.cwd() (path-containment bypass).
 * Copies: commands, rules, skills, agents, config, hooks, scripts.
 * Creates: .cursor-plugin/plugin.json manifest.
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import { join, dirname, isAbsolute, resolve, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const pluginRoot = join(repoRoot, "plugins", "pnCore");

const argv = process.argv.slice(2);
const withShadcn = argv.includes("--with-shadcn");
const allowOverwrite = argv.includes("--overwrite");
const forcePath = argv.includes("--force");
const targetArg = argv.find((a) => !["--with-shadcn", "--overwrite", "--force"].includes(a));
let targetRoot = targetArg
  ? isAbsolute(targetArg)
    ? targetArg
    : join(process.cwd(), targetArg)
  : process.cwd();

// When installed as a dep, we're in node_modules/pn-core; target should be project root
if (!targetArg && repoRoot.includes("node_modules") && targetRoot === repoRoot) {
  targetRoot = join(repoRoot, "..", "..");
}

// Path-containment check: resolved targetRoot must be under process.cwd() unless --force
if (!forcePath) {
  const safeCwd = resolve(process.cwd());
  const resolvedTarget = resolve(targetRoot);
  const isContained = resolvedTarget === safeCwd || resolvedTarget.startsWith(safeCwd + sep);
  if (!isContained) {
    console.error(
      `install-to-project: target '${resolvedTarget}' is outside process.cwd() '${safeCwd}'.`,
      "Pass --force to allow targets outside the working directory."
    );
    process.exit(1);
  }
}

// Skip when npx/MCP fetches package to run — copying into our own dir is unnecessary and slows startup
if (targetRoot === repoRoot) {
  // Root workspace: point .cursor-plugin at plugins/pnCore so one source of truth (no duplicate root .cursor content)
  const pluginManifestPath = join(pluginRoot, ".cursor-plugin", "plugin.json");
  const rootManifestPath = join(repoRoot, ".cursor-plugin", "plugin.json");
  if (existsSync(pluginManifestPath)) {
    const pluginManifest = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
    const rootManifest = {
      ...pluginManifest,
      skills: "./plugins/pnCore/skills/",
      agents: "./plugins/pnCore/agents/",
      rules: "./plugins/pnCore/rules/",
      commands: "./plugins/pnCore/.cursor/commands/",
      hooks: "./plugins/pnCore/hooks/hooks.json",
    };
    delete rootManifest.logo;
    mkdirSync(dirname(rootManifestPath), { recursive: true });
    writeFileSync(rootManifestPath, `${JSON.stringify(rootManifest, null, 2)}\n`);
    console.log("Synced .cursor-plugin/plugin.json (root points at plugins/pnCore)");
  }
  process.exit(0);
}

if (!existsSync(pluginRoot)) {
  console.error("Plugin not found at", pluginRoot);
  process.exit(1);
}

const rootPkgPath = join(repoRoot, "package.json");
const version = existsSync(rootPkgPath)
  ? (JSON.parse(readFileSync(rootPkgPath, "utf8")).version ?? "0.6.23")
  : "0.6.23";

const manifest = {
  name: "pn-core",
  displayName: "pnCore",
  version,
  description:
    "Rules, skills, and agents for frontend (React, Astro, Next, vanilla) and 3D (Three.js, shaders, R3F). Includes CI, n8n, web3, Blender, Unreal.",
  author: { name: "perniemann", email: "io@perniemann.com" },
  license: "MIT",
  repository: "https://github.com/perniemann/pnCore.git",
  keywords: ["react", "three.js", "frontend", "3d", "shader", "astro", "next.js", "vanilla", "r3f"],
  skills: "./.cursor/skills/",
  agents: "./.cursor/agents/",
  rules: "./.cursor/rules/",
  commands: "./.cursor/commands/",
  hooks: "./.cursor/hooks/hooks.json",
};

const copies = [
  { src: join(pluginRoot, ".cursor", "commands"), dest: join(targetRoot, ".cursor", "commands") },
  { src: join(pluginRoot, "rules"), dest: join(targetRoot, ".cursor", "rules") },
  { src: join(pluginRoot, "skills"), dest: join(targetRoot, ".cursor", "skills") },
  { src: join(pluginRoot, "agents"), dest: join(targetRoot, ".cursor", "agents") },
  { src: join(pluginRoot, "hooks"), dest: join(targetRoot, ".cursor", "hooks") },
  { src: join(pluginRoot, "scripts"), dest: join(targetRoot, ".cursor", "scripts") },
  { src: join(pluginRoot, "config"), dest: join(targetRoot, "config") },
  {
    src: join(pluginRoot, "docs", "templates"),
    dest: join(targetRoot, ".cursor", "docs", "templates"),
  },
];

// Backup existing .cursor/ before overwrite (skip with --overwrite)
const cursorDir = join(targetRoot, ".cursor");
if (!allowOverwrite && existsSync(cursorDir)) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(targetRoot, `.cursor.bak-${ts}`);
  cpSync(cursorDir, backupDir, { recursive: true });
  console.log(`Backed up .cursor/ -> .cursor.bak-${ts}/`);
}

for (const { src, dest } of copies) {
  if (!existsSync(src)) continue;
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, errorOnExist: !allowOverwrite, force: allowOverwrite });
  const norm = (p) => p.replace(/\\/g, "/");
  const rel = norm(dest)
    .replace(norm(targetRoot), ".")
    .replace(/^\.\/?/, "./");
  console.log("Copied ->", rel);
}

// Update hooks.json to use .cursor/scripts path
const hooksPath = join(targetRoot, ".cursor", "hooks", "hooks.json");
if (existsSync(hooksPath)) {
  const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
  if (hooks.hooks?.stop?.[0]?.command) {
    hooks.hooks.stop[0].command = "node ./.cursor/scripts/pn-continual-learning-stop.mjs";
    writeFileSync(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`);
  }
}

// Create .cursor-plugin/plugin.json
const pluginManifestPath = join(targetRoot, ".cursor-plugin", "plugin.json");
mkdirSync(dirname(pluginManifestPath), { recursive: true });
writeFileSync(pluginManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Created .cursor-plugin/plugin.json");

if (withShadcn) {
  console.log("Running npx shadcn@latest mcp init --client cursor...");
  const r = spawnSync("npx", ["shadcn@latest", "mcp", "init", "--client", "cursor"], {
    cwd: targetRoot,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn(
      "shadcn mcp init exited with",
      r.status,
      "- add manually: npx shadcn@latest mcp init --client cursor"
    );
  } else {
    console.log("Added shadcn MCP to .cursor/mcp.json");
  }
}

// Verify hooks and stop script landed
const stopScriptDest = join(targetRoot, ".cursor", "scripts", "pn-continual-learning-stop.mjs");
const hooksDest = join(targetRoot, ".cursor", "hooks", "hooks.json");
const hooksOk = existsSync(hooksDest);
const stopScriptOk = existsSync(stopScriptDest);
if (!hooksOk || !stopScriptOk) {
  console.warn(
    "\nWarning: continual-learning hook files may be missing.\n" +
      `  hooks.json:  ${hooksOk ? "ok" : "MISSING — " + hooksDest}\n` +
      `  stop script: ${stopScriptOk ? "ok" : "MISSING — " + stopScriptDest}`
  );
}

const isWindows = process.platform === "win32";
console.log(
  "\nDone. Open this project in Cursor and reload the window. Use /pn-new or /pn-build and other commands."
);
if (isWindows) {
  console.log(
    "\n[pnCore] Windows note: Cursor stop hooks may not fire reliably on all Windows builds.\n" +
      "  If AGENTS.md does not update automatically between sessions:\n" +
      "  • Run pn-continual-learning manually, or accept the offer at the end of /pn-retro\n" +
      "  • For active projects, set CONTINUAL_LEARNING_TRIAL_MODE=1 to lower the trigger threshold\n" +
      "  See docs/agents-md-guide.md#active-profile for details."
  );
} else {
  console.log(
    "\n[pnCore] Tip: For active projects, set CONTINUAL_LEARNING_TRIAL_MODE=1 to trigger\n" +
      "  AGENTS.md updates after shorter sessions (3 turns / 15 min instead of 10 / 120)."
  );
}
