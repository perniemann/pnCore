/**
 * Harness adapters: one canonical layout table for every agent surface pnCore supports
 * (Cursor, Claude Code, Codex, Pi), detection of the active harness, and the file plan
 * used by `harness_scaffold` and `scripts/install-to-project.mjs`.
 *
 * The MCP engine is harness-neutral. This module is the only place that knows where
 * each harness reads instructions, rules, skills, commands, agents, and MCP config.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve, sep } from "path";
import { CODEX_AGENTS_MD_CAP_BYTES, estimateTokens, utf8Bytes } from "./context-budget.js";

export const HARNESS_IDS = ["cursor", "claude_code", "codex", "pi"] as const;
export type HarnessId = (typeof HARNESS_IDS)[number];

export function isHarnessId(v: unknown): v is HarnessId {
  return typeof v === "string" && (HARNESS_IDS as readonly string[]).includes(v);
}

/** Accept common aliases (`claude`, `claude-code`, `openai-codex`, `pi-agent`). */
export function normalizeHarnessId(v: string): HarnessId | null {
  const s = v
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (isHarnessId(s)) return s;
  if (s === "claude" || s === "claudecode" || s === "claude_code_cli") return "claude_code";
  if (s === "openai_codex" || s === "codex_cli") return "codex";
  if (s === "pi_agent" || s === "pi_coding_agent" || s === "pi.dev" || s === "pidev") return "pi";
  if (s === "cursor_ide") return "cursor";
  return null;
}

export type RuleMode =
  /** Cursor `.mdc` with `alwaysApply` / `globs` frontmatter. */
  | "cursor_mdc"
  /** Claude Code `.claude/rules/*.md`; optional `paths:` frontmatter scopes the rule. */
  | "claude_rules"
  /** No rules directory — always-on guidance lives in the instructions file (AGENTS.md). */
  | "instructions_section";

export type McpConfigFormat =
  /** `{ "mcpServers": { "pn-core": {...} } }` JSON (Cursor `.cursor/mcp.json`, Claude `.mcp.json`). */
  | "json_mcp_servers"
  /** Codex `.codex/config.toml` `[mcp_servers.pn-core]` table. */
  | "toml_mcp_servers"
  /** Pi `.pi/settings.json` `packages` array (native tools; no MCP subprocess). */
  | "pi_packages";

export type HarnessLayout = {
  id: HarnessId;
  label: string;
  /** Always-loaded project instructions file at the repository root. */
  instructionsFile: "AGENTS.md" | "CLAUDE.md";
  /** Byte cap the harness enforces on the instructions chain, when it has one (Codex: 32 KiB). */
  instructionsCapBytes: number | null;
  rules: { mode: RuleMode; dir: string | null; ext: ".mdc" | ".md" | null };
  /** Directory holding `<id>/SKILL.md` folders. */
  skillsDir: string;
  /** Flat `*.md` prompt / command templates, or null when the harness has no project-level slot. */
  commandsDir: string | null;
  /** Subagent definitions, or null when the harness has no project-level slot. */
  agentsDir: string | null;
  mcpConfig: { path: string; format: McpConfigFormat };
  hooks: { path: string } | null;
  /** Harness-specific caveats surfaced by `harness_detect`. */
  notes: string[];
};

export const HARNESS_LAYOUTS: Record<HarnessId, HarnessLayout> = {
  cursor: {
    id: "cursor",
    label: "Cursor",
    instructionsFile: "AGENTS.md",
    instructionsCapBytes: null,
    rules: { mode: "cursor_mdc", dir: ".cursor/rules", ext: ".mdc" },
    skillsDir: ".cursor/skills",
    commandsDir: ".cursor/commands",
    agentsDir: ".cursor/agents",
    mcpConfig: { path: ".cursor/mcp.json", format: "json_mcp_servers" },
    hooks: { path: ".cursor/hooks/hooks.json" },
    notes: [
      "Rules support alwaysApply / globs / agent-requested modes via .mdc frontmatter.",
      "Slash palette reads .cursor/commands (nested pn/ submenu supported).",
    ],
  },
  claude_code: {
    id: "claude_code",
    label: "Claude Code",
    instructionsFile: "CLAUDE.md",
    instructionsCapBytes: null,
    rules: { mode: "claude_rules", dir: ".claude/rules", ext: ".md" },
    skillsDir: ".claude/skills",
    commandsDir: ".claude/commands",
    agentsDir: ".claude/agents",
    mcpConfig: { path: ".mcp.json", format: "json_mcp_servers" },
    hooks: { path: ".claude/settings.json" },
    notes: [
      "Rules without `paths:` frontmatter load every session; `paths:` globs scope them. There is no agent-requested rule mode — such rules stay MCP-only (get_rule).",
      "Project MCP servers live in root .mcp.json (not under .claude/); one-time approval prompt on first load.",
      "Commands and skills are the same mechanism (/name); .claude/commands/*.md is the single-file form.",
    ],
  },
  codex: {
    id: "codex",
    label: "Codex",
    instructionsFile: "AGENTS.md",
    instructionsCapBytes: CODEX_AGENTS_MD_CAP_BYTES,
    rules: { mode: "instructions_section", dir: null, ext: null },
    skillsDir: ".agents/skills",
    commandsDir: null,
    agentsDir: null,
    mcpConfig: { path: ".codex/config.toml", format: "toml_mcp_servers" },
    hooks: null,
    notes: [
      "AGENTS.md is the only always-on instructions slot; Codex truncates the chain at project_doc_max_bytes (32 KiB default; override the pnCore check with PNCORE_AGENTS_MD_CAP_BYTES). harness_scaffold and the installer report the file's bytes against the cap and drop inlined rules lowest-priority first to fit.",
      "Skills are discovered from .agents/skills (cwd up to repo root) and invoked as $skill-name; no project-level commands or agents directory.",
      "MCP servers: [mcp_servers.pn-core] in .codex/config.toml or ~/.codex/config.toml.",
    ],
  },
  pi: {
    id: "pi",
    label: "Pi",
    instructionsFile: "AGENTS.md",
    instructionsCapBytes: null,
    rules: { mode: "instructions_section", dir: null, ext: null },
    skillsDir: ".agents/skills",
    commandsDir: ".pi/prompts",
    agentsDir: null,
    mcpConfig: { path: ".pi/settings.json", format: "pi_packages" },
    hooks: null,
    notes: [
      "Pi reads skills from .pi/skills and .agents/skills; pnCore writes the shared .agents/skills so a Codex + Pi project has one copy.",
      "Prompt templates in .pi/prompts/*.md expand as /name; native pn-core tools come from `pi install git:github.com/perniemann/pnCore@main` or a `packages` entry in .pi/settings.json (no MCP subprocess).",
      "Project resources load only after the project is trusted on first interactive start.",
    ],
  },
};

export type HarnessEvidence = {
  harness: HarnessId;
  source: "explicit" | "env" | "workspace";
  detail: string;
};

export type HarnessDetection = {
  /** Harnesses ordered by confidence: explicit > env > workspace. */
  detected: HarnessId[];
  primary: HarnessId | null;
  evidence: HarnessEvidence[];
  /** True when PNCORE_HARNESS decided the result. */
  explicit: boolean;
};

const ENV_SIGNALS: Array<{ harness: HarnessId; vars: string[] }> = [
  { harness: "claude_code", vars: ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"] },
  {
    harness: "cursor",
    vars: ["CURSOR_TRACE_ID", "CURSOR_AGENT", "CURSOR_CONVERSATION_ID", "CURSOR_SESSION_ID"],
  },
  {
    harness: "codex",
    vars: ["CODEX_SANDBOX", "CODEX_SANDBOX_NETWORK_DISABLED", "CODEX_THREAD_ID", "CODEX_CI"],
  },
  { harness: "pi", vars: ["PI_CODING_AGENT", "PI_AGENT_SESSION"] },
];

const WORKSPACE_SIGNALS: Array<{ harness: HarnessId; paths: string[] }> = [
  { harness: "cursor", paths: [".cursor", ".cursor-plugin"] },
  { harness: "claude_code", paths: [".claude", "CLAUDE.md", ".mcp.json"] },
  { harness: "codex", paths: [".codex"] },
  { harness: "pi", paths: [".pi"] },
];

/** `.agents/skills` is shared by Codex and Pi; it counts for both when no other signal disambiguates. */
const SHARED_SKILLS_DIR = ".agents/skills";

export function parseHarnessList(raw: string | undefined): HarnessId[] {
  if (!raw) return [];
  const out: HarnessId[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    if (!part) continue;
    const id = normalizeHarnessId(part);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export function detectHarness(
  opts: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
): HarnessDetection {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  const evidence: HarnessEvidence[] = [];

  const explicitList = parseHarnessList(env.PNCORE_HARNESS);
  if (explicitList.length > 0) {
    for (const h of explicitList) {
      evidence.push({
        harness: h,
        source: "explicit",
        detail: `PNCORE_HARNESS=${env.PNCORE_HARNESS}`,
      });
    }
    return { detected: explicitList, primary: explicitList[0], evidence, explicit: true };
  }

  const envHits: HarnessId[] = [];
  for (const { harness, vars } of ENV_SIGNALS) {
    const hit = vars.find((v) => typeof env[v] === "string" && env[v] !== "");
    if (hit) {
      envHits.push(harness);
      evidence.push({ harness, source: "env", detail: `process env ${hit} is set` });
    }
  }

  const wsHits: HarnessId[] = [];
  for (const { harness, paths } of WORKSPACE_SIGNALS) {
    const hit = paths.find((p) => existsSync(join(cwd, p)));
    if (hit) {
      wsHits.push(harness);
      evidence.push({ harness, source: "workspace", detail: `${hit} exists in workspace` });
    }
  }
  if (existsSync(join(cwd, SHARED_SKILLS_DIR))) {
    for (const h of ["codex", "pi"] as HarnessId[]) {
      if (!wsHits.includes(h)) {
        wsHits.push(h);
        evidence.push({
          harness: h,
          source: "workspace",
          detail: `${SHARED_SKILLS_DIR} exists in workspace (shared Codex/Pi skills dir)`,
        });
      }
    }
  }

  const detected: HarnessId[] = [];
  for (const h of [...envHits, ...wsHits]) if (!detected.includes(h)) detected.push(h);
  return { detected, primary: detected[0] ?? null, evidence, explicit: false };
}

// ─── Rule conversion ────────────────────────────────────────────────────────

export type ParsedRule = {
  description: string | null;
  alwaysApply: boolean;
  globs: string[];
  body: string;
};

function parseYamlList(raw: string): string[] {
  const t = raw.trim();
  if (t.startsWith("[")) {
    return (t.match(/"([^"]*)"|'([^']*)'/g) ?? []).map((s) => s.slice(1, -1));
  }
  return t ? [t.replace(/^["']|["']$/g, "")] : [];
}

/** Parse Cursor `.mdc` frontmatter into a neutral shape. Body excludes the frontmatter block. */
export function parseCursorRule(raw: string): ParsedRule {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { description: null, alwaysApply: false, globs: [], body: raw };
  const fm = m[1];
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const alwaysApply = /^alwaysApply:\s*true\s*$/m.test(fm);
  const globsRaw = fm.match(/^globs:\s*(.+)$/m)?.[1];
  return {
    description,
    alwaysApply,
    globs: globsRaw ? parseYamlList(globsRaw) : [],
    body: raw.slice(m[0].length),
  };
}

export type ConvertedRule =
  | { kind: "file"; content: string }
  /** Agent-requested rule with no harness slot: stays reachable through MCP get_rule. */
  | { kind: "skip"; reason: string };

/**
 * Convert a Cursor rule to the target harness rule format.
 * - cursor_mdc: pass-through.
 * - claude_rules: alwaysApply → no `paths`; globs → `paths:`; agent-requested → skip.
 * - instructions_section: body only (caller embeds it in AGENTS.md).
 */
export function convertRule(raw: string, mode: RuleMode): ConvertedRule {
  if (mode === "cursor_mdc") return { kind: "file", content: raw };
  const parsed = parseCursorRule(raw);
  if (mode === "claude_rules") {
    if (!parsed.alwaysApply && parsed.globs.length === 0) {
      return {
        kind: "skip",
        reason:
          "agent-requested rule (alwaysApply: false, no globs) has no Claude Code rule mode; load via get_rule",
      };
    }
    const fm: string[] = [];
    if (parsed.description) fm.push(`description: ${parsed.description}`);
    if (!parsed.alwaysApply && parsed.globs.length > 0) {
      fm.push(`paths:`);
      for (const g of parsed.globs) fm.push(`  - "${g}"`);
    }
    const head = fm.length > 0 ? `---\n${fm.join("\n")}\n---\n\n` : "";
    return { kind: "file", content: head + parsed.body.replace(/^\n+/, "") };
  }
  return { kind: "file", content: parsed.body.replace(/^\n+/, "") };
}

// ─── Managed blocks in AGENTS.md / CLAUDE.md ─────────────────────────────────

export const MANAGED_BLOCK_ID = "pncore";

export function managedBlockMarkers(id: string = MANAGED_BLOCK_ID): { start: string; end: string } {
  return { start: `<!-- ${id}:start -->`, end: `<!-- ${id}:end -->` };
}

/**
 * Insert or replace a managed block (idempotent). Returns the new file text and whether it changed.
 * Content outside the markers is never touched.
 */
export function upsertManagedBlock(
  existing: string | null,
  block: string,
  id: string = MANAGED_BLOCK_ID
): { text: string; changed: boolean; action: "created" | "replaced" | "appended" | "unchanged" } {
  const { start, end } = managedBlockMarkers(id);
  const wrapped = `${start}\n${block.trim()}\n${end}\n`;
  if (existing == null) return { text: wrapped, changed: true, action: "created" };
  const si = existing.indexOf(start);
  const ei = existing.indexOf(end);
  if (si !== -1 && ei !== -1 && ei > si) {
    const before = existing.slice(0, si);
    const after = existing.slice(ei + end.length).replace(/^\n/, "");
    const text = `${before}${wrapped}${after}`;
    return text === existing
      ? { text: existing, changed: false, action: "unchanged" }
      : { text, changed: true, action: "replaced" };
  }
  const sepText = existing.endsWith("\n") ? (existing.endsWith("\n\n") ? "" : "\n") : "\n\n";
  return { text: `${existing}${sepText}${wrapped}`, changed: true, action: "appended" };
}

// ─── Scaffold plan ──────────────────────────────────────────────────────────

export type ScaffoldProject = {
  name: string;
  goal?: string;
  stack?: string;
  scope?: string;
  constraints?: string[];
};

export type ScaffoldInclude =
  "project_context" | "project_skill" | "no_trailers_rule" | "mcp_config";

export const SCAFFOLD_INCLUDE_DEFAULT: ScaffoldInclude[] = [
  "project_context",
  "project_skill",
  "no_trailers_rule",
];

export type PlannedFile = {
  /** Workspace-relative POSIX path. */
  path: string;
  harnesses: HarnessId[];
  kind: ScaffoldInclude;
  /** `write` replaces the file; `managed_block` upserts between markers; `merge_json` / `merge_toml` add the pn-core entry. */
  strategy: "write" | "managed_block" | "merge_json" | "merge_toml";
  content: string;
};

export const PN_CORE_GIT_PACKAGE = "git+https://github.com/perniemann/pnCore.git#main";
export const PI_PACKAGE_SPEC = "git:github.com/perniemann/pnCore@main";

export function portableMcpServerEntry(): {
  command: string;
  args: string[];
  env: Record<string, string>;
} {
  return {
    command: "npx",
    args: ["-y", `--package=${PN_CORE_GIT_PACKAGE}`, "--", "pn-core"],
    env: { GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "echo" },
  };
}

const TRIANGLE_LINE =
  "Begin every response in this project with the appropriate context tag and 🔺 (Unicode U+1F53A). Default `[pn-default] 🔺`; use `[pn-command] 🔺` / `[pn-agent] 🔺` / `[pn-skill] 🔺` / `[pn-plan] 🔺` when a pn command, agent, skill, or plan mode is active. See pnCore rule `pn-visual-indicator`.";

const MCP_BOOTSTRAP_LINE =
  'When pn-core MCP (or Pi native pn-core tools) is available: call `project_context` at session start; load `get_rule("pn-build-gate")` and `get_rule("pn-mcp-proactive")` and follow them; for verbose replies or the aliases `scr`/`eli`/`foc`/`ref`/`scp` load `get_rule("pn-communication-contract")` and `get_skill("pn-response-aliases")`.';

const PHASE_GATE_LINE =
  "After each plan phase: verify → run pn-reviewer (read-only) on the phase diff → fix → wait for the user's `continue`. See `pn-build-gate` § Phase-complete gate.";

const COMMIT_HYGIENE_LINE =
  "Commits: never add `Made-with:` or IDE-generated `Co-authored-by:` trailers (rule `pn-no-cursor-commit-trailers`).";

function projectLines(p: ScaffoldProject): string[] {
  const lines: string[] = [];
  lines.push(`- **Goal:** ${p.goal?.trim() || "(fill in one sentence)"}`);
  lines.push(`- **Stack:** ${p.stack?.trim() || "(fill in)"}`);
  lines.push(`- **Scope:** ${p.scope?.trim() || "(fill in)"}`);
  const cons = (p.constraints ?? []).map((c) => c.trim()).filter(Boolean);
  lines.push(`- **Constraints:** ${cons.length ? cons.join("; ") : "(none recorded)"}`);
  return lines;
}

/** Shared project-context body — identical guidance on every harness. */
export function projectContextBody(p: ScaffoldProject, opts: { heading?: boolean } = {}): string {
  const out: string[] = [];
  if (opts.heading !== false) out.push(`# Project context — ${p.name}`, "");
  out.push(TRIANGLE_LINE, "", "## Project", ...projectLines(p), "", "## pnCore bootstrap");
  out.push(`- ${MCP_BOOTSTRAP_LINE}`, `- ${PHASE_GATE_LINE}`, `- ${COMMIT_HYGIENE_LINE}`);
  return out.join("\n") + "\n";
}

export function projectSkillContent(p: ScaffoldProject): string {
  const cons = (p.constraints ?? []).map((c) => c.trim()).filter(Boolean);
  return [
    "---",
    "name: project",
    `description: "Project-specific domain guidance for ${p.name.replace(/"/g, "'")}."`,
    "---",
    "",
    `# ${p.name} — project skill`,
    "",
    "## Purpose",
    p.goal?.trim() || "(what this project does — from README, entry points, domain)",
    "",
    "## Key constraints",
    ...(cons.length
      ? cons.map((c) => `- ${c}`)
      : ["- (stack-specific patterns, auth model, data layer, API style)"]),
    "",
    "## Patterns",
    `- Stack: ${p.stack?.trim() || "(fill in)"}`,
    `- Scope: ${p.scope?.trim() || "(fill in)"}`,
    "- (file layout, naming, testing approach observed in the codebase)",
    "",
  ].join("\n");
}

/** Short AGENTS.md block for harnesses without a rules directory (Codex, Pi). */
export function instructionsBlock(p: ScaffoldProject, harnesses: HarnessId[]): string {
  const surfaces = harnesses.map((h) => HARNESS_LAYOUTS[h].label).join(" + ");
  const out: string[] = [
    `## pnCore (${surfaces})`,
    "",
    ...projectLines(p),
    "",
    TRIANGLE_LINE,
    "",
    `- ${MCP_BOOTSTRAP_LINE}`,
    `- ${PHASE_GATE_LINE}`,
    `- ${COMMIT_HYGIENE_LINE}`,
  ];
  if (harnesses.includes("codex")) {
    out.push(
      '- Codex: pnCore skills in `.agents/skills/` are invoked as `$skill-name`; slash commands are MCP prompts — load with `get_command("pn-<name>")`.'
    );
  }
  if (harnesses.includes("pi")) {
    out.push(
      "- Pi: `/pn` opens the pnCore command menu when the package is installed; prompt templates in `.pi/prompts/` expand as `/pn-<name>`."
    );
  }
  return out.join("\n") + "\n";
}

/**
 * Project-agnostic pnCore bootstrap block for the instructions file of harnesses without a
 * rules directory (installer use). Optionally inlines always-apply rule bodies.
 */
export function bootstrapBlock(
  harnesses: HarnessId[],
  opts: { inlineRules?: Array<{ id: string; raw: string }>; omittedRules?: string[] } = {}
): string {
  const surfaces = harnesses.map((h) => HARNESS_LAYOUTS[h].label).join(" + ");
  const out: string[] = [
    `## pnCore (${surfaces})`,
    "",
    "pnCore skills, agents, commands, and rules are served by the pn-core MCP engine (or Pi native pn-core tools).",
    "",
    TRIANGLE_LINE,
    "",
    `- ${MCP_BOOTSTRAP_LINE}`,
    `- ${PHASE_GATE_LINE}`,
    `- ${COMMIT_HYGIENE_LINE}`,
    "- Always-on rules to load with `get_rule` when the MCP is connected: `pn-build-gate`, `pn-mcp-proactive`, `pn-aesthetics-baseline`, `pn-current-date`, `pn-agents-md`, `pn-orchestrator-lead`, `pn-visual-indicator`, `pn-tool-risk-policy`.",
  ];
  if (harnesses.includes("codex")) {
    out.push(
      '- Codex: pnCore skills in `.agents/skills/` are invoked as `$skill-name`; slash commands are MCP prompts — load with `get_command("pn-<name>")` (`pn-build`, `pn-setup`, `pn-new`, `pn-design`, `pn-deliver`, …).'
    );
  }
  if (harnesses.includes("pi")) {
    out.push(
      "- Pi: `/pn` opens the pnCore command menu when the package is installed; prompt templates in `.pi/prompts/` expand as `/pn-<name>`."
    );
  }
  const omitted = opts.omittedRules ?? [];
  if (omitted.length > 0) {
    out.push(
      `- Not inlined (instructions-file byte cap): ${omitted.map((id) => `\`${id}\``).join(", ")} — load with \`get_rule\` at session start.`
    );
  }
  const inline = opts.inlineRules ?? [];
  if (inline.length > 0) {
    out.push("", "### Always-on pnCore rules (inlined)", "");
    for (const r of inline) {
      const parsed = parseCursorRule(r.raw);
      out.push(`<!-- rule: ${r.id} -->`, parsed.body.trim(), "");
    }
  }
  return out.join("\n") + "\n";
}

// ─── Instructions-file budget (ADR-0021) ────────────────────────────────────

/**
 * Inline order for always-on rules when a byte cap forces a choice: the first entries are the
 * ones the engine cannot work without; the last are dropped first. Unknown ids sort after.
 */
export const ALWAYS_ON_RULE_PRIORITY: readonly string[] = [
  "pn-mcp-proactive",
  "pn-build-gate",
  "pn-current-date",
  "pn-agents-md",
  "pn-tool-risk-policy",
  "pn-orchestrator-lead",
  "pn-aesthetics-baseline",
  "pn-visual-indicator",
  "pn-no-cursor-commit-trailers",
];

export function sortRulesByPriority<T extends { id: string }>(rules: T[]): T[] {
  const rank = (id: string) => {
    const i = ALWAYS_ON_RULE_PRIORITY.indexOf(id);
    return i === -1 ? ALWAYS_ON_RULE_PRIORITY.length : i;
  };
  return [...rules].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

export type InstructionsBudget = {
  path: string;
  /** Size of the whole instructions file after the block is applied. */
  bytes: number;
  capBytes: number;
  estimatedTokens: number;
  fits: boolean;
  /** Bytes the file was over the cap before packing, when packing happened. */
  warning?: string;
};

export type FittedInstructionsBlock = {
  block: string;
  /** Full file text after upserting the block into `existing`. */
  text: string;
  inlined: string[];
  omitted: string[];
  budget: InstructionsBudget;
};

/**
 * Build the pnCore bootstrap block for an instructions file so that the *whole file* stays under
 * `capBytes`: inlined rules are removed one at a time, lowest priority first, and listed as
 * `get_rule` pointers instead. Content outside the managed block is never touched, so when the
 * file is over the cap with nothing inlined the result reports `fits: false` with a warning.
 */
export function fitInstructionsBlock(opts: {
  harnesses: HarnessId[];
  existing: string | null;
  path: string;
  inlineRules?: Array<{ id: string; raw: string }>;
  capBytes: number;
}): FittedInstructionsBlock {
  const ordered = sortRulesByPriority(opts.inlineRules ?? []);
  const build = (inline: typeof ordered, omitted: string[]) => {
    const block = bootstrapBlock(opts.harnesses, { inlineRules: inline, omittedRules: omitted });
    const text = upsertManagedBlock(opts.existing, block).text;
    return { block, text, bytes: utf8Bytes(text) };
  };
  let inline = ordered;
  const omitted: string[] = [];
  let cur = build(inline, omitted);
  const initialBytes = cur.bytes;
  while (cur.bytes > opts.capBytes && inline.length > 0) {
    omitted.unshift(inline[inline.length - 1].id);
    inline = inline.slice(0, -1);
    cur = build(inline, omitted);
  }
  const fits = cur.bytes <= opts.capBytes;
  const budget: InstructionsBudget = {
    path: opts.path,
    bytes: cur.bytes,
    capBytes: opts.capBytes,
    estimatedTokens: estimateTokens(cur.text),
    fits,
  };
  if (!fits) {
    budget.warning = `${opts.path} is ${cur.bytes} bytes, over the ${opts.capBytes}-byte cap by ${cur.bytes - opts.capBytes} with no pnCore rules inlined; the harness truncates the file. Shorten content outside the pnCore block.`;
  } else if (omitted.length > 0) {
    budget.warning = `${omitted.length} rule(s) not inlined to keep ${opts.path} under ${opts.capBytes} bytes (was ${initialBytes}): ${omitted.join(", ")}.`;
  }
  return { block: cur.block, text: cur.text, inlined: inline.map((r) => r.id), omitted, budget };
}

/** Measure an existing instructions file against the harness cap (read-only). */
export function instructionsBudgetFor(
  path: string,
  text: string | null,
  capBytes: number
): InstructionsBudget {
  const bytes = text ? utf8Bytes(text) : 0;
  const fits = bytes <= capBytes;
  return {
    path,
    bytes,
    capBytes,
    estimatedTokens: text ? estimateTokens(text) : 0,
    fits,
    ...(fits
      ? {}
      : {
          warning: `${path} is ${bytes} bytes, over the ${capBytes}-byte cap by ${bytes - capBytes}; the harness truncates the file.`,
        }),
  };
}

function ruleFileContent(rawRule: string, layout: HarnessLayout): string | null {
  const conv = convertRule(rawRule, layout.rules.mode);
  return conv.kind === "file" ? conv.content : null;
}

function mcpConfigPlan(layout: HarnessLayout): PlannedFile {
  const entry = portableMcpServerEntry();
  if (layout.mcpConfig.format === "toml_mcp_servers") {
    const args = entry.args.map((a) => JSON.stringify(a)).join(", ");
    const content = [
      "[mcp_servers.pn-core]",
      `command = ${JSON.stringify(entry.command)}`,
      `args = [${args}]`,
      "",
      "[mcp_servers.pn-core.env]",
      ...Object.entries(entry.env).map(([k, v]) => `${k} = ${JSON.stringify(v)}`),
      "",
    ].join("\n");
    return {
      path: layout.mcpConfig.path,
      harnesses: [layout.id],
      kind: "mcp_config",
      strategy: "merge_toml",
      content,
    };
  }
  if (layout.mcpConfig.format === "pi_packages") {
    return {
      path: layout.mcpConfig.path,
      harnesses: [layout.id],
      kind: "mcp_config",
      strategy: "merge_json",
      content: JSON.stringify({ packages: [PI_PACKAGE_SPEC] }, null, 2) + "\n",
    };
  }
  return {
    path: layout.mcpConfig.path,
    harnesses: [layout.id],
    kind: "mcp_config",
    strategy: "merge_json",
    content: JSON.stringify({ mcpServers: { "pn-core": entry } }, null, 2) + "\n",
  };
}

export type ScaffoldPlanOpts = {
  harnesses: HarnessId[];
  project: ScaffoldProject;
  include?: ScaffoldInclude[];
  /** Raw content of rule `pn-no-cursor-commit-trailers` (Cursor .mdc). Required when include has no_trailers_rule. */
  noTrailersRule?: string | null;
};

/** Build the deduplicated file plan for the selected harnesses. Pure: no filesystem access. */
export function buildScaffoldPlan(opts: ScaffoldPlanOpts): PlannedFile[] {
  const include = opts.include && opts.include.length > 0 ? opts.include : SCAFFOLD_INCLUDE_DEFAULT;
  const harnesses = [...new Set(opts.harnesses)];
  const byPath = new Map<string, PlannedFile>();
  const add = (f: PlannedFile) => {
    const prev = byPath.get(f.path);
    if (prev) {
      for (const h of f.harnesses) if (!prev.harnesses.includes(h)) prev.harnesses.push(h);
      return;
    }
    byPath.set(f.path, f);
  };

  const sectionHarnesses = harnesses.filter(
    (h) => HARNESS_LAYOUTS[h].rules.mode === "instructions_section"
  );

  for (const h of harnesses) {
    const layout = HARNESS_LAYOUTS[h];
    if (include.includes("project_context")) {
      if (layout.rules.mode === "cursor_mdc") {
        add({
          path: `${layout.rules.dir}/project-context${layout.rules.ext}`,
          harnesses: [h],
          kind: "project_context",
          strategy: "write",
          content:
            `---\ndescription: Project context for ${opts.project.name} (generated by pnCore harness_scaffold)\nalwaysApply: true\n---\n\n` +
            projectContextBody(opts.project),
        });
      } else if (layout.rules.mode === "claude_rules") {
        add({
          path: `${layout.rules.dir}/project-context${layout.rules.ext}`,
          harnesses: [h],
          kind: "project_context",
          strategy: "write",
          content:
            `---\ndescription: Project context for ${opts.project.name} (generated by pnCore harness_scaffold)\n---\n\n` +
            projectContextBody(opts.project),
        });
      } else {
        add({
          path: layout.instructionsFile,
          harnesses: [h],
          kind: "project_context",
          strategy: "managed_block",
          content: instructionsBlock(opts.project, sectionHarnesses),
        });
      }
    }
    if (include.includes("project_skill")) {
      add({
        path: `${layout.skillsDir}/project/SKILL.md`,
        harnesses: [h],
        kind: "project_skill",
        strategy: "write",
        content: projectSkillContent(opts.project),
      });
    }
    if (include.includes("no_trailers_rule") && layout.rules.dir && opts.noTrailersRule) {
      const content = ruleFileContent(opts.noTrailersRule, layout);
      if (content) {
        add({
          path: `${layout.rules.dir}/pn-no-cursor-commit-trailers${layout.rules.ext}`,
          harnesses: [h],
          kind: "no_trailers_rule",
          strategy: "write",
          content,
        });
      }
    }
    if (include.includes("mcp_config")) add(mcpConfigPlan(layout));
  }
  return [...byPath.values()];
}

// ─── Apply ──────────────────────────────────────────────────────────────────

export type AppliedFile = {
  path: string;
  harnesses: HarnessId[];
  kind: ScaffoldInclude;
  action:
    | "written"
    | "skipped_exists"
    | "block_created"
    | "block_replaced"
    | "block_appended"
    | "block_unchanged"
    | "merged"
    | "already_present"
    | "planned";
  bytes: number;
};

function containedIn(root: string, rel: string): string | null {
  const base = resolve(root);
  const abs = resolve(base, rel);
  if (abs !== base && !abs.startsWith(base + sep)) return null;
  return abs;
}

function mergeJsonFile(abs: string, addition: unknown): "merged" | "already_present" {
  let existing: Record<string, unknown> = {};
  if (existsSync(abs)) {
    try {
      const parsed = JSON.parse(readFileSync(abs, "utf-8")) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existing = parsed as Record<string, unknown>;
      }
    } catch {
      existing = {};
    }
  }
  const add = addition as Record<string, unknown>;
  let changed = false;
  if (Array.isArray(add.packages)) {
    const cur = Array.isArray(existing.packages) ? (existing.packages as unknown[]) : [];
    for (const p of add.packages) {
      if (!cur.includes(p)) {
        cur.push(p);
        changed = true;
      }
    }
    existing.packages = cur;
  }
  if (add.mcpServers && typeof add.mcpServers === "object") {
    const cur =
      existing.mcpServers && typeof existing.mcpServers === "object"
        ? (existing.mcpServers as Record<string, unknown>)
        : {};
    for (const [k, v] of Object.entries(add.mcpServers as Record<string, unknown>)) {
      if (!(k in cur)) {
        cur[k] = v;
        changed = true;
      }
    }
    existing.mcpServers = cur;
  }
  if (!changed && existsSync(abs)) return "already_present";
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  return "merged";
}

function mergeTomlFile(abs: string, block: string): "merged" | "already_present" {
  const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : "";
  if (/^\[mcp_servers\.pn-core\]/m.test(existing)) return "already_present";
  const sepText =
    existing.length === 0 || existing.endsWith("\n\n")
      ? ""
      : existing.endsWith("\n")
        ? "\n"
        : "\n\n";
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${existing}${sepText}${block}`, "utf-8");
  return "merged";
}

export type ApplyScaffoldOpts = {
  root: string;
  plan: PlannedFile[];
  overwrite?: boolean;
  dryRun?: boolean;
};

/** Apply a plan under `root`. Paths escaping `root` throw; existing files are skipped unless `overwrite`. */
export function applyScaffoldPlan(opts: ApplyScaffoldOpts): AppliedFile[] {
  const out: AppliedFile[] = [];
  for (const f of opts.plan) {
    const abs = containedIn(opts.root, f.path);
    if (!abs) throw new Error(`harness_scaffold: path escapes workspace: ${f.path}`);
    const bytes = Buffer.byteLength(f.content, "utf-8");
    if (opts.dryRun) {
      out.push({ path: f.path, harnesses: f.harnesses, kind: f.kind, action: "planned", bytes });
      continue;
    }
    if (f.strategy === "write") {
      if (existsSync(abs) && !opts.overwrite) {
        out.push({
          path: f.path,
          harnesses: f.harnesses,
          kind: f.kind,
          action: "skipped_exists",
          bytes: 0,
        });
        continue;
      }
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, f.content, "utf-8");
      out.push({ path: f.path, harnesses: f.harnesses, kind: f.kind, action: "written", bytes });
      continue;
    }
    if (f.strategy === "managed_block") {
      const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
      const res = upsertManagedBlock(existing, f.content);
      if (res.changed) {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, res.text, "utf-8");
      }
      const action = `block_${res.action}` as AppliedFile["action"];
      out.push({
        path: f.path,
        harnesses: f.harnesses,
        kind: f.kind,
        action,
        bytes: res.changed ? bytes : 0,
      });
      continue;
    }
    if (f.strategy === "merge_json") {
      const action = mergeJsonFile(abs, JSON.parse(f.content));
      out.push({
        path: f.path,
        harnesses: f.harnesses,
        kind: f.kind,
        action,
        bytes: action === "merged" ? bytes : 0,
      });
      continue;
    }
    const action = mergeTomlFile(abs, f.content);
    out.push({
      path: f.path,
      harnesses: f.harnesses,
      kind: f.kind,
      action,
      bytes: action === "merged" ? bytes : 0,
    });
  }
  return out;
}

/** Compact layout table for tool output and docs. */
export function layoutTable(ids: HarnessId[] = [...HARNESS_IDS]): Record<HarnessId, HarnessLayout> {
  const out = {} as Record<HarnessId, HarnessLayout>;
  for (const id of ids) out[id] = HARNESS_LAYOUTS[id];
  return out;
}
