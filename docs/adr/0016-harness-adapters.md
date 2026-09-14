---
title: "ADR-0016: One MCP engine, four harness adapters (Cursor, Claude Code, Codex, Pi)"
updated: 2026-09-14
---

# ADR-0016: One MCP engine, four harness adapters (Cursor, Claude Code, Codex, Pi)

## Status

Accepted

## Context

pnCore started as a Cursor plugin plus an MCP server. The MCP engine (`workflow_step`, gates, `project_context`, `get_*`) already ran in any MCP client, but every write path assumed Cursor: `scripts/install-to-project.mjs` copied everything into `.cursor/`, and `/pn-setup`, `/pn-new`, `project_kickoff`, and `full_dev` told the agent to create `.cursor/rules/project-context.mdc` and `.cursor/skills/project/SKILL.md` regardless of the surface. A Claude Code, Codex, or Pi user onboarding a project ended up with a `.cursor/` tree their harness never reads — and none of the files their harness does read (`.claude/`, `.agents/skills`, `.pi/prompts`, an `AGENTS.md` block).

The four harnesses have different, documented project-level layouts:

| | Cursor | Claude Code | Codex | Pi |
|---|---|---|---|---|
| Instructions | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| Rules | `.cursor/rules/*.mdc` | `.claude/rules/*.md` (`paths:`) | none | none |
| Skills | `.cursor/skills` | `.claude/skills` | `.agents/skills` | `.agents/skills` / `.pi/skills` |
| Commands | `.cursor/commands` | `.claude/commands` | none (MCP prompts) | `.pi/prompts` |
| Agents | `.cursor/agents` | `.claude/agents` | none | none |
| Engine config | `.cursor/mcp.json` | `.mcp.json` | `.codex/config.toml` | `.pi/settings.json` `packages` |

Requirement from the maintainer: the same quality on every surface, and onboarding must create only the files the active harness needs, with the harness's own folder names.

## Decision

1. **One layout table in code.** `packages/pn-core-mcp/src/harness.ts` exports `HARNESS_IDS`, `HARNESS_LAYOUTS`, detection, rule conversion, managed-block upsert, and a pure `buildScaffoldPlan` → `applyScaffoldPlan` pair. The installer imports the compiled module from `dist/`; the MCP tools call it directly. No second copy of the table lives in scripts or docs prose — `pn-core://reference/harness-matrix.md` mirrors it for agents and is kept in step by review.
2. **Detection precedence:** `PNCORE_HARNESS` env (explicit; the Pi extension sets `pi`) > process env signals inherited from the host (`CLAUDECODE`, `CURSOR_*`, `CODEX_*`) > workspace folders (`.cursor`, `.claude`/`CLAUDE.md`/`.mcp.json`, `.codex`, `.pi`, `.agents/skills`). Empty detection is a question to the user, not a silent Cursor default — except in the installer, which falls back to Cursor and prints that it did.
3. **Two MCP tools.** `harness_detect` (read-only) returns detection, evidence, and layouts. `harness_scaffold` (write, workspace-contained) writes project context, project skill, the trailer rule, and optional MCP config for the selected harnesses only; `dryRun` returns the plan with contents for hosts whose MCP cwd is not the project root.
4. **Harness-native representations of the same guidance.** Project context is a `.mdc` rule on Cursor, a `.claude/rules/*.md` on Claude Code, and a managed `<!-- pncore:start -->…<!-- pncore:end -->` block in `AGENTS.md` on Codex and Pi (which have no rules directory and a 32 KiB instructions cap). The body is identical. Rule conversion: `alwaysApply` → always-loaded Claude rule; `globs` → `paths:`; agent-requested rules have no Claude mode and stay MCP-only via `get_rule`; Codex/Pi inline always-apply rules only with `--inline-rules`, otherwise the block points at `get_rule`.
5. **Shared `.agents/skills`.** Codex and Pi both read it; a project on both gets one copy and one `AGENTS.md` block.
6. **Installer is harness-scoped.** `--harness <list|auto|all>`; each harness's install function touches only its own folders and backs up only its own top-level directory. `--with-mcp-config` and `--inline-rules` are opt-in.

## Consequences

- **Positive:** A Claude Code / Codex / Pi project no longer receives a dead `.cursor/` tree; every surface gets skills in its native slot, the same project-context guidance, and the same engine. Adding a fifth harness is a new `HARNESS_LAYOUTS` entry plus an installer function. Tests pin the layout (`harness.test.ts`, installer script tests, per-tool integration).
- **Negative / open:** Env signals other than `PNCORE_HARNESS` are heuristics inherited from the host process; when a host exposes none, users must set `PNCORE_HARNESS` in the MCP server config or answer the harness question. The continual-learning stop hook remains Cursor-only (Claude Code `Stop` hooks and Pi extensions are not wired yet). Codex has no project-level commands or agents slot; slash commands stay MCP prompts (`get_command`). File-glob rules exist natively only on Cursor and Claude Code.

## References

- [ADR-0008: Command palette `/pn` submenu](0008-command-palette-pn-submenu.md)
- [ADR-0009: Pi native tools](0009-pi-native-tools.md)
- [ADR-0015: Consumer-project gating](0015-consumer-project-gating.md)
- `pn-core://reference/harness-matrix.md`
- `packages/pn-core-mcp/src/harness.ts`, `scripts/install-to-project.mjs`
