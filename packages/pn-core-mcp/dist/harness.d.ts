/**
 * Harness adapters: one canonical layout table for every agent surface pnCore supports
 * (Cursor, Claude Code, Codex, Pi), detection of the active harness, and the file plan
 * used by `harness_scaffold` and `scripts/install-to-project.mjs`.
 *
 * The MCP engine is harness-neutral. This module is the only place that knows where
 * each harness reads instructions, rules, skills, commands, agents, and MCP config.
 */
export declare const HARNESS_IDS: readonly ["cursor", "claude_code", "codex", "pi"];
export type HarnessId = (typeof HARNESS_IDS)[number];
export declare function isHarnessId(v: unknown): v is HarnessId;
/** Accept common aliases (`claude`, `claude-code`, `openai-codex`, `pi-agent`). */
export declare function normalizeHarnessId(v: string): HarnessId | null;
export type RuleMode = 
/** Cursor `.mdc` with `alwaysApply` / `globs` frontmatter. */
"cursor_mdc"
/** Claude Code `.claude/rules/*.md`; optional `paths:` frontmatter scopes the rule. */
 | "claude_rules"
/** No rules directory — always-on guidance lives in the instructions file (AGENTS.md). */
 | "instructions_section";
export type McpConfigFormat = 
/** `{ "mcpServers": { "pn-core": {...} } }` JSON (Cursor `.cursor/mcp.json`, Claude `.mcp.json`). */
"json_mcp_servers"
/** Codex `.codex/config.toml` `[mcp_servers.pn-core]` table. */
 | "toml_mcp_servers"
/** Pi `.pi/settings.json` `packages` array (native tools; no MCP subprocess). */
 | "pi_packages";
export type HarnessLayout = {
    id: HarnessId;
    label: string;
    /** Always-loaded project instructions file at the repository root. */
    instructionsFile: "AGENTS.md" | "CLAUDE.md";
    rules: {
        mode: RuleMode;
        dir: string | null;
        ext: ".mdc" | ".md" | null;
    };
    /** Directory holding `<id>/SKILL.md` folders. */
    skillsDir: string;
    /** Flat `*.md` prompt / command templates, or null when the harness has no project-level slot. */
    commandsDir: string | null;
    /** Subagent definitions, or null when the harness has no project-level slot. */
    agentsDir: string | null;
    mcpConfig: {
        path: string;
        format: McpConfigFormat;
    };
    hooks: {
        path: string;
    } | null;
    /** Harness-specific caveats surfaced by `harness_detect`. */
    notes: string[];
};
export declare const HARNESS_LAYOUTS: Record<HarnessId, HarnessLayout>;
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
export declare function parseHarnessList(raw: string | undefined): HarnessId[];
export declare function detectHarness(opts?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}): HarnessDetection;
export type ParsedRule = {
    description: string | null;
    alwaysApply: boolean;
    globs: string[];
    body: string;
};
/** Parse Cursor `.mdc` frontmatter into a neutral shape. Body excludes the frontmatter block. */
export declare function parseCursorRule(raw: string): ParsedRule;
export type ConvertedRule = {
    kind: "file";
    content: string;
}
/** Agent-requested rule with no harness slot: stays reachable through MCP get_rule. */
 | {
    kind: "skip";
    reason: string;
};
/**
 * Convert a Cursor rule to the target harness rule format.
 * - cursor_mdc: pass-through.
 * - claude_rules: alwaysApply → no `paths`; globs → `paths:`; agent-requested → skip.
 * - instructions_section: body only (caller embeds it in AGENTS.md).
 */
export declare function convertRule(raw: string, mode: RuleMode): ConvertedRule;
export declare const MANAGED_BLOCK_ID = "pncore";
export declare function managedBlockMarkers(id?: string): {
    start: string;
    end: string;
};
/**
 * Insert or replace a managed block (idempotent). Returns the new file text and whether it changed.
 * Content outside the markers is never touched.
 */
export declare function upsertManagedBlock(existing: string | null, block: string, id?: string): {
    text: string;
    changed: boolean;
    action: "created" | "replaced" | "appended" | "unchanged";
};
export type ScaffoldProject = {
    name: string;
    goal?: string;
    stack?: string;
    scope?: string;
    constraints?: string[];
};
export type ScaffoldInclude = "project_context" | "project_skill" | "no_trailers_rule" | "mcp_config";
export declare const SCAFFOLD_INCLUDE_DEFAULT: ScaffoldInclude[];
export type PlannedFile = {
    /** Workspace-relative POSIX path. */
    path: string;
    harnesses: HarnessId[];
    kind: ScaffoldInclude;
    /** `write` replaces the file; `managed_block` upserts between markers; `merge_json` / `merge_toml` add the pn-core entry. */
    strategy: "write" | "managed_block" | "merge_json" | "merge_toml";
    content: string;
};
export declare const PN_CORE_GIT_PACKAGE = "git+https://github.com/perniemann/pnCore.git#main";
export declare const PI_PACKAGE_SPEC = "git:github.com/perniemann/pnCore@main";
export declare function portableMcpServerEntry(): {
    command: string;
    args: string[];
    env: Record<string, string>;
};
/** Shared project-context body — identical guidance on every harness. */
export declare function projectContextBody(p: ScaffoldProject, opts?: {
    heading?: boolean;
}): string;
export declare function projectSkillContent(p: ScaffoldProject): string;
/** Short AGENTS.md block for harnesses without a rules directory (Codex, Pi). */
export declare function instructionsBlock(p: ScaffoldProject, harnesses: HarnessId[]): string;
/**
 * Project-agnostic pnCore bootstrap block for the instructions file of harnesses without a
 * rules directory (installer use). Optionally inlines always-apply rule bodies.
 */
export declare function bootstrapBlock(harnesses: HarnessId[], opts?: {
    inlineRules?: Array<{
        id: string;
        raw: string;
    }>;
}): string;
export type ScaffoldPlanOpts = {
    harnesses: HarnessId[];
    project: ScaffoldProject;
    include?: ScaffoldInclude[];
    /** Raw content of rule `pn-no-cursor-commit-trailers` (Cursor .mdc). Required when include has no_trailers_rule. */
    noTrailersRule?: string | null;
};
/** Build the deduplicated file plan for the selected harnesses. Pure: no filesystem access. */
export declare function buildScaffoldPlan(opts: ScaffoldPlanOpts): PlannedFile[];
export type AppliedFile = {
    path: string;
    harnesses: HarnessId[];
    kind: ScaffoldInclude;
    action: "written" | "skipped_exists" | "block_created" | "block_replaced" | "block_appended" | "block_unchanged" | "merged" | "already_present" | "planned";
    bytes: number;
};
export type ApplyScaffoldOpts = {
    root: string;
    plan: PlannedFile[];
    overwrite?: boolean;
    dryRun?: boolean;
};
/** Apply a plan under `root`. Paths escaping `root` throw; existing files are skipped unless `overwrite`. */
export declare function applyScaffoldPlan(opts: ApplyScaffoldOpts): AppliedFile[];
/** Compact layout table for tool output and docs. */
export declare function layoutTable(ids?: HarnessId[]): Record<HarnessId, HarnessLayout>;
