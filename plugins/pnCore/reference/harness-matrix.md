# Harness matrix — where pnCore files live per agent surface

pnCore is one engine (the `pn-core` MCP, or the same tools registered natively in Pi) with four harness adapters. Canonical content lives once under `packages/pn-core-mcp/content/`; each harness only receives the folders it reads. The table below is the single source of truth and is mirrored in code at `packages/pn-core-mcp/src/harness.ts` (`HARNESS_LAYOUTS`).

## Layout table

| Slot | Cursor (`cursor`) | Claude Code (`claude_code`) | Codex (`codex`) | Pi (`pi`) |
|------|-------------------|-----------------------------|-----------------|-----------|
| Always-on instructions | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` (chain, 32 KiB cap) | `AGENTS.md` (or `CLAUDE.md`) |
| Rules | `.cursor/rules/*.mdc` (`alwaysApply`, `globs`, agent-requested) | `.claude/rules/*.md` (no frontmatter = always; `paths:` = scoped) | none — managed block in `AGENTS.md` | none — managed block in `AGENTS.md` |
| Skills | `.cursor/skills/<id>/SKILL.md` | `.claude/skills/<id>/SKILL.md` | `.agents/skills/<id>/SKILL.md` (invoke `$id`) | `.agents/skills/<id>/SKILL.md` (also `.pi/skills/`) |
| Commands / prompts | `.cursor/commands/**/*.md` (nested `pn/` submenu) | `.claude/commands/*.md` (same mechanism as skills) | none project-level — MCP prompts via `get_command` | `.pi/prompts/*.md` (expand as `/pn-<name>`) |
| Agents | `.cursor/agents/*.md` | `.claude/agents/*.md` | none project-level | none (extensions) |
| MCP / engine config | `.cursor/mcp.json` `mcpServers.pn-core` | `.mcp.json` (repo root, not under `.claude/`) | `.codex/config.toml` `[mcp_servers.pn-core]` | `.pi/settings.json` `packages: ["git:github.com/perniemann/pnCore@main"]` (native tools, no MCP subprocess) |
| Hooks | `.cursor/hooks/hooks.json` (stop hook shipped) | `.claude/settings.json` `hooks` (not shipped yet) | none | none |

Codex and Pi share `.agents/skills/`; a project that uses both gets one copy and one `AGENTS.md` block.

## Detection precedence

`harness_detect` (and `scripts/install-to-project.mjs --harness auto`) resolve the active harness in this order:

1. **Explicit** — `PNCORE_HARNESS` in the MCP server env (comma list: `cursor`, `claude_code`, `codex`, `pi`). The Pi native extension sets `PNCORE_HARNESS=pi` on load.
2. **Process env signals** — `CLAUDECODE` / `CLAUDE_CODE_ENTRYPOINT` (Claude Code), `CURSOR_TRACE_ID` / `CURSOR_AGENT` / `CURSOR_CONVERSATION_ID` (Cursor), `CODEX_SANDBOX` / `CODEX_THREAD_ID` (Codex). These are inherited from the host that spawned the MCP process and are treated as medium confidence.
3. **Workspace folders** — `.cursor/`, `.claude/` or `CLAUDE.md` or `.mcp.json`, `.codex/`, `.pi/`, `.agents/skills/` (counts for Codex and Pi). Low confidence: evidence that the project already targets that harness.

When nothing is detected, `harness_scaffold` requires an explicit `harnesses` list; the installer falls back to `cursor` and says so. Set `PNCORE_HARNESS` in the MCP server config when the host does not expose an env signal.

## What onboarding writes (`harness_scaffold`)

| Artifact | Cursor | Claude Code | Codex | Pi |
|----------|--------|-------------|-------|----|
| `project_context` | `.cursor/rules/project-context.mdc` (`alwaysApply: true`) | `.claude/rules/project-context.md` | managed block in `AGENTS.md` | managed block in `AGENTS.md` |
| `project_skill` | `.cursor/skills/project/SKILL.md` | `.claude/skills/project/SKILL.md` | `.agents/skills/project/SKILL.md` | `.agents/skills/project/SKILL.md` |
| `no_trailers_rule` | `.cursor/rules/pn-no-cursor-commit-trailers.mdc` | `.claude/rules/pn-no-cursor-commit-trailers.md` | line in the `AGENTS.md` block | line in the `AGENTS.md` block |
| `mcp_config` (opt-in) | `.cursor/mcp.json` | `.mcp.json` | `.codex/config.toml` | `.pi/settings.json` `packages` |

The project-context body is identical on every harness: triangle tag, goal / stack / scope / constraints, MCP bootstrap (`project_context` at session start, `get_rule("pn-build-gate")` + `get_rule("pn-mcp-proactive")`), phase gate, commit hygiene. Managed blocks sit between `<!-- pncore:start -->` and `<!-- pncore:end -->` and are replaced in place on re-run; text outside the markers is never touched.

## Rule conversion (Cursor `.mdc` → other harnesses)

| Cursor frontmatter | Claude Code `.claude/rules/*.md` | Codex / Pi |
|--------------------|----------------------------------|------------|
| `alwaysApply: true` | file with `description` only (always loaded) | `--inline-rules` inlines the body in the `AGENTS.md` block; default = pointer to `get_rule` |
| `globs: [...]` | `paths:` list (loaded when matching files are touched) | not representable — MCP `get_rule` |
| `alwaysApply: false`, no globs (agent-requested) | skipped — no Claude rule mode; reachable via `get_rule` | MCP `get_rule` |

## Quality parity

Every harness has the same engine (`workflow_step`, gates, `project_context`, skills, agents, rules via `get_*`). The differences are surface affordances only:

- Slash palette: Cursor `.cursor/commands`, Claude Code `/pn-<name>`, Pi `/pn` menu + `.pi/prompts`, Codex MCP prompts (`get_command`).
- File-glob rules: Cursor and Claude Code natively; Codex and Pi through skills and `get_rule`.
- Stop hook (continual learning): Cursor only today; other harnesses run `/pn-retro` or `pn-continual-learning` manually.

## Install

```bash
# from the target project
npx github:perniemann/pnCore plugin-install --harness auto            # detect
npx github:perniemann/pnCore plugin-install --harness claude_code     # one harness
npx github:perniemann/pnCore plugin-install --harness codex,pi --with-mcp-config
```

Onboarding inside a session: `harness_detect` → `harness_scaffold({ harnesses, project })` (or `dryRun: true` to get the plan and write the files with the host's own file tools when the MCP cwd is not the project root).
