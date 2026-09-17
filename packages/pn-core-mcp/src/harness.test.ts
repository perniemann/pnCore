import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  HARNESS_IDS,
  HARNESS_LAYOUTS,
  applyScaffoldPlan,
  buildScaffoldPlan,
  convertRule,
  detectHarness,
  normalizeHarnessId,
  parseCursorRule,
  parseHarnessList,
  upsertManagedBlock,
  bootstrapBlock,
  fitInstructionsBlock,
  instructionsBudgetFor,
  sortRulesByPriority,
  ALWAYS_ON_RULE_PRIORITY,
  layoutTable,
  projectContextBody,
  projectSkillContent,
  portableMcpServerEntry,
  managedBlockMarkers,
} from "./harness.js";

const CLEAN_ENV: NodeJS.ProcessEnv = { PATH: "/usr/bin" };

const TRAILERS_RULE = `---
description: Do not add Cursor IDE lines to git commit messages (Made-with, Co-authored-by).
alwaysApply: true
---

# No Cursor commit trailers

- Do **not** include \`Made-with: Cursor\`.
`;

describe("harness ids", () => {
  it("normalizes aliases", () => {
    expect(normalizeHarnessId("claude")).toBe("claude_code");
    expect(normalizeHarnessId("Claude-Code")).toBe("claude_code");
    expect(normalizeHarnessId("openai-codex")).toBe("codex");
    expect(normalizeHarnessId("pi-agent")).toBe("pi");
    expect(normalizeHarnessId("cursor")).toBe("cursor");
    expect(normalizeHarnessId("Cursor IDE")).toBe("cursor");
    expect(normalizeHarnessId("codex-cli")).toBe("codex");
    expect(normalizeHarnessId("pi.dev")).toBe("pi");
    expect(normalizeHarnessId("vim")).toBeNull();
  });

  it("parses comma / space lists and dedupes", () => {
    expect(parseHarnessList("codex, pi,codex claude")).toEqual(["codex", "pi", "claude_code"]);
    expect(parseHarnessList(undefined)).toEqual([]);
    expect(parseHarnessList("")).toEqual([]);
    expect(parseHarnessList(" , vim ,")).toEqual([]);
  });

  it("layoutTable returns all layouts by default and a subset on request", () => {
    const all = layoutTable();
    expect(Object.keys(all).sort()).toEqual([...HARNESS_IDS].sort());
    const one = layoutTable(["pi"]);
    expect(Object.keys(one)).toEqual(["pi"]);
    expect(one.pi).toBe(HARNESS_LAYOUTS.pi);
  });

  it("portable MCP entry pins the git package and disables git prompts", () => {
    const e = portableMcpServerEntry();
    expect(e.command).toBe("npx");
    expect(e.args.at(-1)).toBe("pn-core");
    expect(e.env.GIT_TERMINAL_PROMPT).toBe("0");
    expect(managedBlockMarkers("x")).toEqual({ start: "<!-- x:start -->", end: "<!-- x:end -->" });
  });

  it("every harness has a layout with a skills dir and mcp config", () => {
    for (const id of HARNESS_IDS) {
      const l = HARNESS_LAYOUTS[id];
      expect(l.id).toBe(id);
      expect(l.skillsDir.length).toBeGreaterThan(0);
      expect(l.mcpConfig.path.length).toBeGreaterThan(0);
    }
    expect(HARNESS_LAYOUTS.codex.skillsDir).toBe(HARNESS_LAYOUTS.pi.skillsDir);
  });
});

describe("detectHarness", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "pn-harness-"));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it("returns empty when nothing signals", () => {
    const d = detectHarness({ cwd, env: CLEAN_ENV });
    expect(d.detected).toEqual([]);
    expect(d.primary).toBeNull();
    expect(d.explicit).toBe(false);
  });

  it("PNCORE_HARNESS wins over env and workspace", () => {
    mkdirSync(join(cwd, ".cursor"));
    const d = detectHarness({
      cwd,
      env: { ...CLEAN_ENV, PNCORE_HARNESS: "pi,codex", CLAUDECODE: "1" },
    });
    expect(d.explicit).toBe(true);
    expect(d.detected).toEqual(["pi", "codex"]);
    expect(d.evidence.every((e) => e.source === "explicit")).toBe(true);
  });

  it("env signals outrank workspace folders", () => {
    mkdirSync(join(cwd, ".cursor"));
    const d = detectHarness({ cwd, env: { ...CLEAN_ENV, CLAUDECODE: "1" } });
    expect(d.primary).toBe("claude_code");
    expect(d.detected).toEqual(["claude_code", "cursor"]);
    expect(d.evidence.find((e) => e.harness === "cursor")?.source).toBe("workspace");
  });

  it("workspace folders map to harnesses; .agents/skills counts for codex and pi", () => {
    mkdirSync(join(cwd, ".agents", "skills"), { recursive: true });
    writeFileSync(join(cwd, "CLAUDE.md"), "# x\n");
    const d = detectHarness({ cwd, env: CLEAN_ENV });
    expect(d.detected.sort()).toEqual(["claude_code", "codex", "pi"]);
  });

  it(".agents/skills does not duplicate an explicit .codex / .pi folder hit", () => {
    mkdirSync(join(cwd, ".agents", "skills"), { recursive: true });
    mkdirSync(join(cwd, ".codex"));
    mkdirSync(join(cwd, ".pi"));
    const d = detectHarness({ cwd, env: CLEAN_ENV });
    expect(d.detected).toEqual(["codex", "pi"]);
    expect(d.evidence.filter((e) => e.harness === "codex")).toHaveLength(1);
    expect(d.evidence.filter((e) => e.harness === "pi")).toHaveLength(1);
  });

  it("ignores empty env values and dedupes env + workspace hits for the same harness", () => {
    mkdirSync(join(cwd, ".codex"));
    const d = detectHarness({
      cwd,
      env: { ...CLEAN_ENV, CLAUDECODE: "", CODEX_SANDBOX: "seatbelt" },
    });
    expect(d.detected).toEqual(["codex"]);
    expect(d.evidence.map((e) => e.source)).toEqual(["env", "workspace"]);
  });

  it("defaults to process.cwd() and process.env", () => {
    const d = detectHarness();
    expect(Array.isArray(d.detected)).toBe(true);
    expect(typeof d.explicit).toBe("boolean");
    expect(d.primary === null || HARNESS_IDS.includes(d.primary)).toBe(true);
  });
});

describe("rule conversion", () => {
  it("parses Cursor frontmatter", () => {
    const p = parseCursorRule(
      `---\ndescription: React\nalwaysApply: false\nglobs: ["**/*.tsx", "**/*.jsx"]\n---\n\n# Body\n`
    );
    expect(p.description).toBe("React");
    expect(p.alwaysApply).toBe(false);
    expect(p.globs).toEqual(["**/*.tsx", "**/*.jsx"]);
    expect(p.body.trim()).toBe("# Body");
  });

  it("parses a bare (non-list) glob and a rule without frontmatter", () => {
    const single = parseCursorRule(`---\nglobs: "src/**/*.ts"\n---\n# T\n`);
    expect(single.globs).toEqual(["src/**/*.ts"]);
    expect(single.description).toBeNull();
    const none = parseCursorRule("# Just a body\n");
    expect(none).toEqual({
      description: null,
      alwaysApply: false,
      globs: [],
      body: "# Just a body\n",
    });
  });

  it("claude_rules: alwaysApply without description emits no frontmatter", () => {
    const c = convertRule(`---\nalwaysApply: true\n---\n\n# Bare\n`, "claude_rules");
    expect(c).toEqual({ kind: "file", content: "# Bare\n" });
  });

  it("cursor_mdc passes through unchanged", () => {
    const c = convertRule(TRAILERS_RULE, "cursor_mdc");
    expect(c).toEqual({ kind: "file", content: TRAILERS_RULE });
  });

  it("claude_rules: alwaysApply → description-only frontmatter; globs → paths; agent-requested → skip", () => {
    const always = convertRule(TRAILERS_RULE, "claude_rules");
    expect(always.kind).toBe("file");
    if (always.kind === "file") {
      expect(always.content).toMatch(/^---\ndescription: Do not add Cursor IDE lines/);
      expect(always.content).not.toContain("alwaysApply");
      expect(always.content).not.toContain("paths:");
      expect(always.content).toContain("# No Cursor commit trailers");
    }
    const scoped = convertRule(
      `---\ndescription: React\nalwaysApply: false\nglobs: ["**/*.tsx"]\n---\n\n# React\n`,
      "claude_rules"
    );
    expect(scoped.kind).toBe("file");
    if (scoped.kind === "file") expect(scoped.content).toContain('paths:\n  - "**/*.tsx"');
    const agentRequested = convertRule(
      `---\ndescription: Comms\nalwaysApply: false\n---\n\n# Comms\n`,
      "claude_rules"
    );
    expect(agentRequested.kind).toBe("skip");
  });

  it("instructions_section returns body only", () => {
    const c = convertRule(TRAILERS_RULE, "instructions_section");
    expect(c.kind).toBe("file");
    if (c.kind === "file") {
      expect(c.content.startsWith("# No Cursor commit trailers")).toBe(true);
      expect(c.content).not.toContain("---");
    }
  });
});

describe("upsertManagedBlock", () => {
  it("creates, appends, replaces, and is idempotent", () => {
    const created = upsertManagedBlock(null, "## pnCore\nv1");
    expect(created.action).toBe("created");
    expect(created.text).toBe("<!-- pncore:start -->\n## pnCore\nv1\n<!-- pncore:end -->\n");

    const appended = upsertManagedBlock("# Mine\n\nkeep me\n", "## pnCore\nv1");
    expect(appended.action).toBe("appended");
    expect(appended.text.startsWith("# Mine\n\nkeep me\n")).toBe(true);

    const replaced = upsertManagedBlock(appended.text + "\n# Tail\n", "## pnCore\nv2");
    expect(replaced.action).toBe("replaced");
    expect(replaced.text).toContain("v2");
    expect(replaced.text).not.toContain("v1");
    expect(replaced.text).toContain("# Mine");
    expect(replaced.text).toContain("# Tail");

    const same = upsertManagedBlock(replaced.text, "## pnCore\nv2");
    expect(same.action).toBe("unchanged");
    expect(same.changed).toBe(false);
  });

  it("appends with the right separator for missing / double trailing newlines", () => {
    const noNl = upsertManagedBlock("# Mine", "b");
    expect(noNl.text).toBe("# Mine\n\n<!-- pncore:start -->\nb\n<!-- pncore:end -->\n");
    const doubleNl = upsertManagedBlock("# Mine\n\n", "b");
    expect(doubleNl.text).toBe("# Mine\n\n<!-- pncore:start -->\nb\n<!-- pncore:end -->\n");
  });
});

describe("project content", () => {
  it("fills placeholders when project facts are missing", () => {
    const body = projectContextBody({ name: "Bare" });
    expect(body.startsWith("# Project context — Bare")).toBe(true);
    expect(body).toContain("(fill in one sentence)");
    expect(body).toContain("(none recorded)");
    const noHeading = projectContextBody({ name: "Bare" }, { heading: false });
    expect(noHeading.startsWith("# Project context")).toBe(false);
    const skill = projectSkillContent({ name: 'Say "hi"' });
    expect(skill).toContain("Say 'hi'");
    expect(skill).toContain("(stack-specific patterns");
  });

  it("renders trimmed constraints and drops blank ones", () => {
    const p = { name: "Acme", constraints: [" no PII ", "", "  ", "GDPR"] };
    expect(projectContextBody(p)).toContain("- **Constraints:** no PII; GDPR");
    const skill = projectSkillContent(p);
    expect(skill).toContain("- no PII\n- GDPR");
    expect(skill).not.toContain("(stack-specific patterns");
  });
});

describe("buildScaffoldPlan", () => {
  const project = { name: "Acme", goal: "Sell widgets", stack: "Next.js", scope: "storefront" };

  it("cursor plan only touches .cursor/", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["cursor"],
      project,
      noTrailersRule: TRAILERS_RULE,
    });
    const paths = plan.map((f) => f.path).sort();
    expect(paths).toEqual([
      ".cursor/rules/pn-no-cursor-commit-trailers.mdc",
      ".cursor/rules/project-context.mdc",
      ".cursor/skills/project/SKILL.md",
    ]);
    const ctx = plan.find((f) => f.path.endsWith("project-context.mdc"))!;
    expect(ctx.content).toContain("alwaysApply: true");
    expect(ctx.content).toContain("Sell widgets");
    expect(ctx.content).toContain("project_context");
  });

  it("claude_code plan only touches .claude/", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["claude_code"],
      project,
      noTrailersRule: TRAILERS_RULE,
    });
    expect(plan.every((f) => f.path.startsWith(".claude/"))).toBe(true);
    expect(plan.map((f) => f.path)).toContain(".claude/rules/project-context.md");
    const ctx = plan.find((f) => f.path === ".claude/rules/project-context.md")!;
    expect(ctx.content).not.toContain("alwaysApply");
  });

  it("codex + pi share .agents/skills and one AGENTS.md managed block", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["codex", "pi"],
      project,
      noTrailersRule: TRAILERS_RULE,
    });
    const paths = plan.map((f) => f.path).sort();
    expect(paths).toEqual([".agents/skills/project/SKILL.md", "AGENTS.md"]);
    const block = plan.find((f) => f.path === "AGENTS.md")!;
    expect(block.strategy).toBe("managed_block");
    expect(block.harnesses.sort()).toEqual(["codex", "pi"]);
    expect(block.content).toContain("## pnCore (Codex + Pi)");
    expect(block.content).toContain("$skill-name");
    expect(block.content).toContain("/pn");
    expect(paths.some((p) => p.startsWith(".cursor"))).toBe(false);
  });

  it("mcp_config emits the harness-native config shape", () => {
    const plan = buildScaffoldPlan({
      harnesses: [...HARNESS_IDS],
      project,
      include: ["mcp_config"],
    });
    const byPath = Object.fromEntries(plan.map((f) => [f.path, f]));
    expect(Object.keys(byPath).sort()).toEqual([
      ".codex/config.toml",
      ".cursor/mcp.json",
      ".mcp.json",
      ".pi/settings.json",
    ]);
    expect(byPath[".codex/config.toml"].strategy).toBe("merge_toml");
    expect(byPath[".codex/config.toml"].content).toContain("[mcp_servers.pn-core]");
    expect(JSON.parse(byPath[".mcp.json"].content).mcpServers["pn-core"].command).toBe("npx");
    expect(JSON.parse(byPath[".pi/settings.json"].content).packages[0]).toMatch(/pnCore@main/);
  });

  it("dedupes repeated harnesses and treats an empty include as the default set", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["cursor", "cursor"],
      project,
      include: [],
      noTrailersRule: TRAILERS_RULE,
    });
    expect(plan).toHaveLength(3);
    for (const f of plan) expect(f.harnesses).toEqual(["cursor"]);
  });

  it("skips the trailers rule on Claude when it converts to an agent-requested rule", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["claude_code"],
      project,
      include: ["no_trailers_rule"],
      noTrailersRule: `---\ndescription: opt-in\nalwaysApply: false\n---\n\n# Opt-in\n`,
    });
    expect(plan).toEqual([]);
  });
});

describe("applyScaffoldPlan", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pn-scaffold-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const project = { name: "Acme", goal: "g", stack: "s", scope: "sc" };

  it("dryRun writes nothing and reports planned", () => {
    const plan = buildScaffoldPlan({ harnesses: ["cursor"], project });
    const res = applyScaffoldPlan({ root, plan, dryRun: true });
    expect(res.every((r) => r.action === "planned")).toBe(true);
    expect(existsSync(join(root, ".cursor"))).toBe(false);
  });

  it("writes, then skips existing unless overwrite", () => {
    const plan = buildScaffoldPlan({ harnesses: ["claude_code"], project });
    const first = applyScaffoldPlan({ root, plan });
    expect(first.map((r) => r.action)).toEqual(["written", "written"]);
    writeFileSync(join(root, ".claude/rules/project-context.md"), "edited by user\n");
    const second = applyScaffoldPlan({ root, plan });
    expect(second.find((r) => r.path.endsWith("project-context.md"))?.action).toBe(
      "skipped_exists"
    );
    expect(readFileSync(join(root, ".claude/rules/project-context.md"), "utf-8")).toBe(
      "edited by user\n"
    );
    const third = applyScaffoldPlan({ root, plan, overwrite: true });
    expect(third.find((r) => r.path.endsWith("project-context.md"))?.action).toBe("written");
    expect(existsSync(join(root, ".cursor"))).toBe(false);
  });

  it("AGENTS.md managed block preserves user text and is idempotent", () => {
    writeFileSync(join(root, "AGENTS.md"), "# Team notes\n\n- keep\n");
    const plan = buildScaffoldPlan({ harnesses: ["codex"], project });
    const a = applyScaffoldPlan({ root, plan });
    expect(a.find((r) => r.path === "AGENTS.md")?.action).toBe("block_appended");
    const text = readFileSync(join(root, "AGENTS.md"), "utf-8");
    expect(text.startsWith("# Team notes\n\n- keep\n")).toBe(true);
    expect(text).toContain("<!-- pncore:start -->");
    const b = applyScaffoldPlan({ root, plan });
    expect(b.find((r) => r.path === "AGENTS.md")?.action).toBe("block_unchanged");
    expect(readFileSync(join(root, "AGENTS.md"), "utf-8")).toBe(text);
  });

  it("merges MCP config without clobbering other servers / packages", () => {
    mkdirSync(join(root, ".cursor"));
    writeFileSync(
      join(root, ".cursor/mcp.json"),
      JSON.stringify({ mcpServers: { other: { command: "x" } } })
    );
    mkdirSync(join(root, ".pi"));
    writeFileSync(
      join(root, ".pi/settings.json"),
      JSON.stringify({ packages: ["npm:foo"], theme: "dark" })
    );
    mkdirSync(join(root, ".codex"));
    writeFileSync(join(root, ".codex/config.toml"), 'model = "gpt-5"\n');
    const plan = buildScaffoldPlan({
      harnesses: ["cursor", "pi", "codex"],
      project,
      include: ["mcp_config"],
    });
    const res = applyScaffoldPlan({ root, plan });
    expect(res.every((r) => r.action === "merged")).toBe(true);
    const cursor = JSON.parse(readFileSync(join(root, ".cursor/mcp.json"), "utf-8"));
    expect(Object.keys(cursor.mcpServers).sort()).toEqual(["other", "pn-core"]);
    const pi = JSON.parse(readFileSync(join(root, ".pi/settings.json"), "utf-8"));
    expect(pi.theme).toBe("dark");
    expect(pi.packages).toEqual(["npm:foo", "git:github.com/perniemann/pnCore@main"]);
    const toml = readFileSync(join(root, ".codex/config.toml"), "utf-8");
    expect(toml.startsWith('model = "gpt-5"\n')).toBe(true);
    expect(toml).toContain("[mcp_servers.pn-core]");
    const again = applyScaffoldPlan({ root, plan });
    expect(again.every((r) => r.action === "already_present")).toBe(true);
  });

  it("creates MCP config files when absent and recovers from corrupt / non-object JSON", () => {
    const plan = buildScaffoldPlan({
      harnesses: ["claude_code", "pi", "codex"],
      project,
      include: ["mcp_config"],
    });
    const fresh = applyScaffoldPlan({ root, plan });
    expect(fresh.map((r) => r.action)).toEqual(["merged", "merged", "merged"]);
    expect(
      JSON.parse(readFileSync(join(root, ".mcp.json"), "utf-8")).mcpServers["pn-core"]
    ).toBeTruthy();
    expect(
      readFileSync(join(root, ".codex/config.toml"), "utf-8").startsWith("[mcp_servers.pn-core]")
    ).toBe(true);

    writeFileSync(join(root, ".mcp.json"), "{ not json");
    writeFileSync(join(root, ".pi/settings.json"), "[1,2]");
    writeFileSync(join(root, ".codex/config.toml"), 'model = "gpt-5"');
    const repaired = applyScaffoldPlan({ root, plan });
    expect(repaired.map((r) => r.action)).toEqual(["merged", "merged", "merged"]);
    expect(
      Object.keys(JSON.parse(readFileSync(join(root, ".mcp.json"), "utf-8")).mcpServers)
    ).toEqual(["pn-core"]);
    expect(
      JSON.parse(readFileSync(join(root, ".pi/settings.json"), "utf-8")).packages
    ).toHaveLength(1);
    expect(readFileSync(join(root, ".codex/config.toml"), "utf-8")).toMatch(
      /^model = "gpt-5"\n\n\[mcp_servers\.pn-core\]/
    );

    writeFileSync(join(root, ".codex/config.toml"), 'model = "gpt-5"\n\n');
    applyScaffoldPlan({ root, plan });
    expect(readFileSync(join(root, ".codex/config.toml"), "utf-8")).toMatch(
      /^model = "gpt-5"\n\n\[mcp_servers\.pn-core\]/
    );
  });

  it("creates the instructions file when missing and reports zero bytes for unchanged files", () => {
    const plan = buildScaffoldPlan({ harnesses: ["pi"], project });
    const a = applyScaffoldPlan({ root, plan });
    const created = a.find((r) => r.path === "AGENTS.md")!;
    expect(created.action).toBe("block_created");
    expect(created.bytes).toBeGreaterThan(0);
    const b = applyScaffoldPlan({ root, plan });
    expect(b.find((r) => r.path === "AGENTS.md")?.bytes).toBe(0);
    expect(b.find((r) => r.kind === "project_skill")?.action).toBe("skipped_exists");
    const dry = applyScaffoldPlan({ root, plan, dryRun: true });
    expect(dry.every((r) => r.action === "planned" && r.bytes > 0)).toBe(true);
  });

  it("rejects paths escaping the root", () => {
    expect(() =>
      applyScaffoldPlan({
        root,
        plan: [
          {
            path: "../evil.md",
            harnesses: ["cursor"],
            kind: "project_context",
            strategy: "write",
            content: "x",
          },
        ],
      })
    ).toThrow(/escapes workspace/);
  });
});

describe("bootstrapBlock", () => {
  it("inlines always-apply rule bodies when requested", () => {
    const plain = bootstrapBlock(["codex"]);
    expect(plain).toContain("## pnCore (Codex)");
    expect(plain).not.toContain("inlined");
    expect(bootstrapBlock(["codex"], { inlineRules: [] })).toBe(plain);
    const inlined = bootstrapBlock(["pi"], {
      inlineRules: [{ id: "pn-no-cursor-commit-trailers", raw: TRAILERS_RULE }],
    });
    expect(inlined).toContain("### Always-on pnCore rules (inlined)");
    expect(inlined).toContain("<!-- rule: pn-no-cursor-commit-trailers -->");
    expect(inlined).toContain("# No Cursor commit trailers");
    expect(inlined).not.toContain("alwaysApply");
  });

  it("lists omitted rules as get_rule pointers", () => {
    const b = bootstrapBlock(["codex"], { omittedRules: ["pn-visual-indicator", "pn-x"] });
    expect(b).toContain(
      "- Not inlined (instructions-file byte cap): `pn-visual-indicator`, `pn-x` — load with `get_rule` at session start."
    );
    expect(bootstrapBlock(["codex"], { omittedRules: [] })).not.toContain("Not inlined");
  });
});

describe("instructions-file budget (ADR-0021)", () => {
  const rule = (id: string, bodyChars: number) => ({
    id,
    raw: `---\ndescription: ${id}\nalwaysApply: true\n---\n\n# ${id}\n\n${"r".repeat(bodyChars)}\n`,
  });

  it("layouts declare the Codex 32 KiB cap only", () => {
    expect(HARNESS_LAYOUTS.codex.instructionsCapBytes).toBe(32768);
    expect(HARNESS_LAYOUTS.cursor.instructionsCapBytes).toBeNull();
    expect(HARNESS_LAYOUTS.claude_code.instructionsCapBytes).toBeNull();
    expect(HARNESS_LAYOUTS.pi.instructionsCapBytes).toBeNull();
  });

  it("sortRulesByPriority orders by the always-on list, unknown ids last (alphabetical)", () => {
    const sorted = sortRulesByPriority([
      { id: "zz-custom" },
      { id: "pn-visual-indicator" },
      { id: "aa-custom" },
      { id: "pn-mcp-proactive" },
      { id: "pn-build-gate" },
    ]).map((r) => r.id);
    expect(sorted).toEqual([
      "pn-mcp-proactive",
      "pn-build-gate",
      "pn-visual-indicator",
      "aa-custom",
      "zz-custom",
    ]);
    expect(ALWAYS_ON_RULE_PRIORITY[0]).toBe("pn-mcp-proactive");
  });

  it("inlines everything when the file fits, with no warning", () => {
    const r = fitInstructionsBlock({
      harnesses: ["codex"],
      existing: "# Notes\n",
      path: "AGENTS.md",
      inlineRules: [rule("pn-build-gate", 500), rule("pn-mcp-proactive", 500)],
      capBytes: 32768,
    });
    expect(r.inlined).toEqual(["pn-mcp-proactive", "pn-build-gate"]);
    expect(r.omitted).toEqual([]);
    expect(r.budget).toMatchObject({ path: "AGENTS.md", capBytes: 32768, fits: true });
    expect(r.budget.warning).toBeUndefined();
    expect(r.budget.bytes).toBe(Buffer.byteLength(r.text, "utf-8"));
    expect(r.budget.estimatedTokens).toBe(Math.ceil(r.text.length / 4));
    expect(r.text.startsWith("# Notes\n")).toBe(true);
    expect(r.text).toContain("<!-- rule: pn-build-gate -->");
  });

  it("drops inlined rules lowest-priority first until the whole file fits, and says so", () => {
    const existing = "# Team notes\n" + "keep me\n".repeat(100);
    const rules = [
      rule("pn-visual-indicator", 3000),
      rule("pn-mcp-proactive", 3000),
      rule("pn-build-gate", 3000),
      rule("pn-current-date", 3000),
    ];
    const cap = Buffer.byteLength(existing) + 9000;
    const r = fitInstructionsBlock({
      harnesses: ["codex"],
      existing,
      path: "AGENTS.md",
      inlineRules: rules,
      capBytes: cap,
    });
    expect(r.budget.fits).toBe(true);
    expect(r.budget.bytes).toBeLessThanOrEqual(cap);
    expect(r.inlined).toEqual(["pn-mcp-proactive", "pn-build-gate"]);
    expect(r.omitted).toEqual(["pn-current-date", "pn-visual-indicator"]);
    expect(r.block).toContain(
      "Not inlined (instructions-file byte cap): `pn-current-date`, `pn-visual-indicator`"
    );
    expect(r.block).not.toContain("<!-- rule: pn-visual-indicator -->");
    expect(r.budget.warning).toMatch(
      /2 rule\(s\) not inlined to keep AGENTS\.md under \d+ bytes \(was \d+\): pn-current-date, pn-visual-indicator\./
    );
    // Idempotent: applying the fitted block again changes nothing.
    const again = fitInstructionsBlock({
      harnesses: ["codex"],
      existing: r.text,
      path: "AGENTS.md",
      inlineRules: rules,
      capBytes: cap,
    });
    expect(again.text).toBe(r.text);
    expect(again.omitted).toEqual(r.omitted);
  });

  it("reports fits:false when the file is over the cap with nothing inlined", () => {
    const existing = "x".repeat(5000);
    const r = fitInstructionsBlock({
      harnesses: ["codex", "pi"],
      existing,
      path: "AGENTS.md",
      inlineRules: [rule("pn-build-gate", 100)],
      capBytes: 4096,
    });
    expect(r.inlined).toEqual([]);
    expect(r.omitted).toEqual(["pn-build-gate"]);
    expect(r.budget.fits).toBe(false);
    expect(r.budget.warning).toMatch(/over the 4096-byte cap by \d+ with no pnCore rules inlined/);
    expect(r.text).toContain("## pnCore (Codex + Pi)");
    const none = fitInstructionsBlock({
      harnesses: ["pi"],
      existing: null,
      path: "AGENTS.md",
      capBytes: Number.POSITIVE_INFINITY,
    });
    expect(none.budget.fits).toBe(true);
    expect(none.inlined).toEqual([]);
    expect(none.text.startsWith("<!-- pncore:start -->")).toBe(true);
  });

  it("instructionsBudgetFor measures an existing file read-only", () => {
    expect(instructionsBudgetFor("AGENTS.md", null, 100)).toEqual({
      path: "AGENTS.md",
      bytes: 0,
      capBytes: 100,
      estimatedTokens: 0,
      fits: true,
    });
    const ok = instructionsBudgetFor("AGENTS.md", "abcd".repeat(10), 100);
    expect(ok).toMatchObject({ bytes: 40, estimatedTokens: 10, fits: true });
    expect(ok.warning).toBeUndefined();
    const over = instructionsBudgetFor("AGENTS.md", "é".repeat(60), 100);
    expect(over).toMatchObject({ bytes: 120, estimatedTokens: 15, fits: false });
    expect(over.warning).toMatch(/over the 100-byte cap by 20/);
  });
});
