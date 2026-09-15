#!/usr/bin/env node
/**
 * Installs pnCore plugin content into a project, tailored to the agent harness(es) in use.
 *
 * Usage: node scripts/install-to-project.mjs [targetDir] [--harness <list|auto>] [--with-mcp-config]
 *          [--inline-rules] [--with-shadcn] [--overwrite] [--force]
 *
 *   targetDir           Default = current working directory.
 *   --harness           Comma list of cursor | claude_code | codex | pi, or `auto` (default).
 *                       auto = PNCORE_HARNESS env > process env signals > folders already in target
 *                       (.cursor, .claude/CLAUDE.md/.mcp.json, .codex, .pi, .agents/skills). Falls back
 *                       to cursor when nothing is detected.
 *   --with-mcp-config   Also write the pn-core server entry for each harness (.cursor/mcp.json,
 *                       .mcp.json, .codex/config.toml [mcp_servers.pn-core], .pi/settings.json packages).
 *   --inline-rules      Codex / Pi: inline always-apply rule bodies into the AGENTS.md pnCore block
 *                       (default: the block points at get_rule so AGENTS.md stays small). For Codex
 *                       the whole AGENTS.md is kept under the 32 KiB chain cap (PNCORE_AGENTS_MD_CAP_BYTES
 *                       overrides): lowest-priority rules are left out and listed as get_rule pointers.
 *   --with-shadcn       Cursor only: run `npx shadcn@latest mcp init --client cursor` in target.
 *   --overwrite         Skip backups and overwrite existing harness folders.
 *   --force             Allow a target outside process.cwd() (path-containment bypass).
 *
 * Per harness (only the selected folders are created — nothing else is touched):
 *   cursor       .cursor/{commands,rules,skills,agents,hooks,scripts,docs/templates}, config/, .cursor-plugin/plugin.json
 *   claude_code  .claude/{skills/<id>,agents,rules (converted .md),commands (flat pn-*.md)}
 *   codex        .agents/skills/<id>, AGENTS.md managed pnCore block
 *   pi           .agents/skills/<id>, .pi/prompts/pn-*.md, AGENTS.md managed pnCore block
 */
import {
  cpSync,
  mkdirSync,
  existsSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  copyFileSync,
} from "fs";
import { spawnSync } from "child_process";
import { join, dirname, isAbsolute, resolve, sep, basename } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const pluginRoot = join(repoRoot, "plugins", "pnCore");
const harnessModulePath = join(repoRoot, "packages", "pn-core-mcp", "dist", "harness.js");

if (!existsSync(harnessModulePath)) {
  console.error(
    `install-to-project: missing ${harnessModulePath}. Run 'npm run build:mcp' first (source checkout).`
  );
  process.exit(1);
}
const harness = await import(pathToFileURL(harnessModulePath).href);
const {
  HARNESS_IDS,
  HARNESS_LAYOUTS,
  detectHarness,
  parseHarnessList,
  convertRule,
  parseCursorRule,
  fitInstructionsBlock,
  buildScaffoldPlan,
  applyScaffoldPlan,
} = harness;
const { agentsMdCapBytes } = await import(
  pathToFileURL(join(dirname(harnessModulePath), "context-budget.js")).href
);

const FLAGS = new Set([
  "--with-shadcn",
  "--overwrite",
  "--force",
  "--with-mcp-config",
  "--inline-rules",
]);
const argv = process.argv.slice(2);
const withShadcn = argv.includes("--with-shadcn");
const allowOverwrite = argv.includes("--overwrite");
const forcePath = argv.includes("--force");
const withMcpConfig = argv.includes("--with-mcp-config");
const inlineRules = argv.includes("--inline-rules");

let harnessArg = "auto";
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--harness") {
    harnessArg = argv[i + 1] ?? "";
    i++;
  } else if (a.startsWith("--harness=")) {
    harnessArg = a.slice("--harness=".length);
  } else if (!FLAGS.has(a)) {
    positional.push(a);
  }
}
const targetArg = positional[0];
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

// ─── Harness resolution ─────────────────────────────────────────────────────

/** @returns {string[]} */
function resolveHarnesses() {
  const trimmed = harnessArg.trim().toLowerCase();
  if (trimmed === "" || trimmed === "auto") {
    const det = detectHarness({ cwd: targetRoot, env: process.env });
    if (det.detected.length > 0) {
      const why = det.evidence.map((e) => `${e.harness} (${e.source}: ${e.detail})`).join("; ");
      console.log(`Harness auto-detect -> ${det.detected.join(", ")} [${why}]`);
      return det.detected;
    }
    console.log(
      "Harness auto-detect -> nothing detected; defaulting to cursor. Pass --harness cursor,claude_code,codex,pi to choose."
    );
    return ["cursor"];
  }
  if (trimmed === "all") return [...HARNESS_IDS];
  const list = parseHarnessList(harnessArg);
  if (list.length === 0) {
    console.error(
      `install-to-project: unknown --harness '${harnessArg}'. Use auto | all | ${HARNESS_IDS.join(" | ")} (comma list).`
    );
    process.exit(1);
  }
  return list;
}

const harnesses = resolveHarnesses();
const norm = (p) => p.replace(/\\/g, "/");
const relOf = (dest) =>
  norm(dest)
    .replace(norm(targetRoot), ".")
    .replace(/^\.\/?/, "./");

function backupDir(relDir) {
  const abs = join(targetRoot, relDir);
  if (allowOverwrite || !existsSync(abs)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = join(targetRoot, `${relDir}.bak-${ts}`);
  cpSync(abs, backup, { recursive: true });
  console.log(`Backed up ${relDir}/ -> ${relDir}.bak-${ts}/`);
}

function copyTree(src, dest) {
  if (!existsSync(src)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, errorOnExist: !allowOverwrite, force: allowOverwrite });
  console.log("Copied ->", relOf(dest));
  return true;
}

function writeText(dest, content) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
}

/** plugins/pnCore/skills/<category>/<id>/ → <skillsDir>/<id>/ (flat ids; harness skill loaders are not category-aware). */
function copySkillsFlat(skillsDir) {
  const src = join(pluginRoot, "skills");
  if (!existsSync(src)) return 0;
  const destRoot = join(targetRoot, skillsDir);
  let n = 0;
  for (const cat of readdirSync(src, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const skill of readdirSync(join(src, cat.name), { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const from = join(src, cat.name, skill.name);
      if (!existsSync(join(from, "SKILL.md"))) continue;
      const to = join(destRoot, skill.name);
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to, { recursive: true, errorOnExist: !allowOverwrite, force: allowOverwrite });
      n++;
    }
  }
  console.log(`Copied -> ./${skillsDir}/ (${n} skills, flat ids)`);
  return n;
}

function copyPromptsFlat(commandsDir) {
  const src = join(pluginRoot, "prompts");
  if (!existsSync(src)) return 0;
  const destRoot = join(targetRoot, commandsDir);
  mkdirSync(destRoot, { recursive: true });
  let n = 0;
  for (const f of readdirSync(src)) {
    if (!f.endsWith(".md")) continue;
    const to = join(destRoot, f);
    if (existsSync(to) && !allowOverwrite) continue;
    copyFileSync(join(src, f), to);
    n++;
  }
  console.log(`Copied -> ./${commandsDir}/ (${n} pn-* command templates)`);
  return n;
}

function readRules() {
  const src = join(pluginRoot, "rules");
  if (!existsSync(src)) return [];
  return readdirSync(src)
    .filter((f) => f.endsWith(".mdc"))
    .map((f) => ({ id: f.replace(/\.mdc$/, ""), raw: readFileSync(join(src, f), "utf8") }));
}

function writeConvertedRules(layout) {
  const rules = readRules();
  let written = 0;
  const skipped = [];
  for (const r of rules) {
    const conv = convertRule(r.raw, layout.rules.mode);
    if (conv.kind !== "file") {
      skipped.push(r.id);
      continue;
    }
    const dest = join(targetRoot, layout.rules.dir, `${r.id}${layout.rules.ext}`);
    if (existsSync(dest) && !allowOverwrite) continue;
    writeText(dest, conv.content);
    written++;
  }
  console.log(
    `Wrote -> ./${layout.rules.dir}/ (${written} rules converted to ${layout.rules.ext}` +
      (skipped.length
        ? `; ${skipped.length} agent-requested rules stay MCP-only: ${skipped.join(", ")}`
        : "") +
      ")"
  );
}

function writeMcpConfig(ids) {
  const plan = buildScaffoldPlan({
    harnesses: ids,
    project: { name: basename(targetRoot) || "project" },
    include: ["mcp_config"],
  });
  const applied = applyScaffoldPlan({ root: targetRoot, plan, overwrite: false });
  for (const f of applied) console.log(`MCP config -> ./${f.path} (${f.action})`);
}

function writeInstructionsBlock(ids) {
  const layout = HARNESS_LAYOUTS[ids[0]];
  const inline = inlineRules ? readRules().filter((r) => parseCursorRule(r.raw).alwaysApply) : [];
  const abs = join(targetRoot, layout.instructionsFile);
  const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  // Codex truncates the AGENTS.md chain at 32 KiB; other harnesses get the same measurement, no cap.
  const capped = ids.some((h) => HARNESS_LAYOUTS[h].instructionsCapBytes != null);
  const capBytes = capped ? agentsMdCapBytes() : Number.POSITIVE_INFINITY;
  const fitted = fitInstructionsBlock({
    harnesses: ids,
    existing,
    path: layout.instructionsFile,
    inlineRules: inline,
    capBytes,
  });
  const plan = [
    {
      path: layout.instructionsFile,
      harnesses: ids,
      kind: "project_context",
      strategy: "managed_block",
      content: fitted.block,
    },
  ];
  const [applied] = applyScaffoldPlan({ root: targetRoot, plan, overwrite: true });
  const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
  const size = capped
    ? `${kib(fitted.budget.bytes)} of ${kib(capBytes)} cap`
    : `${kib(fitted.budget.bytes)}`;
  const rules = inline.length
    ? fitted.omitted.length
      ? ` (${fitted.inlined.length} of ${inline.length} always-apply rules inlined; omitted for the cap: ${fitted.omitted.join(", ")})`
      : ` (${inline.length} always-apply rules inlined)`
    : " (rules via get_rule)";
  console.log(
    `Instructions -> ./${applied.path} pnCore block ${applied.action.replace("block_", "")} — ${size}, ≈${fitted.budget.estimatedTokens} tokens${rules}`
  );
  if (!fitted.budget.fits) console.warn(`WARNING: ${fitted.budget.warning}`);
}

// ─── Cursor ─────────────────────────────────────────────────────────────────

function installCursor() {
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
    keywords: [
      "react",
      "three.js",
      "frontend",
      "3d",
      "shader",
      "astro",
      "next.js",
      "vanilla",
      "r3f",
    ],
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

  backupDir(".cursor");
  for (const { src, dest } of copies) copyTree(src, dest);

  // Update hooks.json to use .cursor/scripts path
  const hooksPath = join(targetRoot, ".cursor", "hooks", "hooks.json");
  if (existsSync(hooksPath)) {
    const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
    if (hooks.hooks?.stop?.[0]?.command) {
      hooks.hooks.stop[0].command = "node ./.cursor/scripts/pn-continual-learning-stop.mjs";
      writeFileSync(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`);
    }
  }

  const pluginManifestPath = join(targetRoot, ".cursor-plugin", "plugin.json");
  writeText(pluginManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
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

  const stopScriptDest = join(targetRoot, ".cursor", "scripts", "pn-continual-learning-stop.mjs");
  const hooksOk = existsSync(hooksPath);
  const stopScriptOk = existsSync(stopScriptDest);
  if (!hooksOk || !stopScriptOk) {
    console.warn(
      "\nWarning: continual-learning hook files may be missing.\n" +
        `  hooks.json:  ${hooksOk ? "ok" : "MISSING — " + hooksPath}\n` +
        `  stop script: ${stopScriptOk ? "ok" : "MISSING — " + stopScriptDest}`
    );
  }
}

// ─── Claude Code ────────────────────────────────────────────────────────────

function installClaudeCode() {
  const layout = HARNESS_LAYOUTS.claude_code;
  backupDir(".claude");
  copySkillsFlat(layout.skillsDir);
  copyTree(join(pluginRoot, "agents"), join(targetRoot, layout.agentsDir));
  writeConvertedRules(layout);
  copyPromptsFlat(layout.commandsDir);
  console.log(
    "Note: the Cursor stop hook (continual learning) is not ported to .claude/settings.json; run /pn-retro or the pn-continual-learning skill manually."
  );
}

// ─── Codex / Pi (shared .agents/skills + AGENTS.md block) ───────────────────

function installAgentsSkillsOnce(done) {
  const dir = HARNESS_LAYOUTS.codex.skillsDir;
  if (done.has(dir)) return;
  done.add(dir);
  copySkillsFlat(dir);
}

function installCodex(done) {
  installAgentsSkillsOnce(done);
  console.log(
    "Codex: no project-level commands/agents slot — slash commands stay MCP prompts (get_command); skills invoke as $pn-<name>."
  );
}

function installPi(done) {
  installAgentsSkillsOnce(done);
  copyPromptsFlat(HARNESS_LAYOUTS.pi.commandsDir);
}

// ─── Run ────────────────────────────────────────────────────────────────────

console.log(`Installing pnCore for: ${harnesses.map((h) => HARNESS_LAYOUTS[h].label).join(", ")}`);
const sharedDone = new Set();
for (const h of harnesses) {
  if (h === "cursor") installCursor();
  else if (h === "claude_code") installClaudeCode();
  else if (h === "codex") installCodex(sharedDone);
  else if (h === "pi") installPi(sharedDone);
}

const sectionHarnesses = harnesses.filter(
  (h) => HARNESS_LAYOUTS[h].rules.mode === "instructions_section"
);
if (sectionHarnesses.length > 0) writeInstructionsBlock(sectionHarnesses);
if (withMcpConfig) writeMcpConfig(harnesses);

const untouched = HARNESS_IDS.filter((h) => !harnesses.includes(h))
  .map((h) => HARNESS_LAYOUTS[h].skillsDir.split("/")[0])
  .filter((top) => !harnesses.some((h) => HARNESS_LAYOUTS[h].skillsDir.startsWith(top)));
if (untouched.length > 0)
  console.log(`Untouched harness folders: ${[...new Set(untouched)].join(", ")}`);

const isWindows = process.platform === "win32";
const nextSteps = {
  cursor: "Cursor: reload the window, then run /pn-setup (existing project) or /pn-new.",
  claude_code:
    "Claude Code: restart the session; /pn-setup and /pn-new are available as commands. Accept the project trust prompt for .claude/skills.",
  codex:
    'Codex: restart; AGENTS.md carries the pnCore block, skills are $pn-<name>. Run get_command("pn-setup") via the pn-core MCP to onboard.',
  pi: "Pi: restart and trust the project; /pn-setup and /pn-new expand from .pi/prompts. Native tools: pi install git:github.com/perniemann/pnCore@main.",
};
console.log("\nDone.");
for (const h of harnesses) console.log("  " + nextSteps[h]);
if (harnesses.includes("cursor")) {
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
}
