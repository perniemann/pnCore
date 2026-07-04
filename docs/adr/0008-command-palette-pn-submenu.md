# ADR-0008: `pn` command palette submenu (Cursor + Pi)

## Status

Accepted — 2026-07-04

Supersedes [ADR-0007](0007-command-palette-pm-router.md) (never merged; PM-router approach abandoned).

## Context

pnCore ships 25+ slash commands as flat `.cursor/commands/pn-*.md` files. The intended UX is a single **`pn`** entry in the Cursor `/` picker with commands grouped underneath — not a top-level **PM** (product management) menu.

Cursor IDE 2.6+ recursively scans `.cursor/commands/` subfolders; Cursor CLI reads top-level files only.

[pi.dev](https://pi.dev) prompt templates use **non-recursive** directory discovery and a **flat** `/name` autocomplete list — no submenu grouping ([Prompt Templates](https://pi.dev/docs/latest/prompt-templates) § Loading Rules). Subdirectories require explicit `prompts` settings or `pi.prompts` manifest entries ([Pi Packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md)).

## Decision

### Cursor (primary)

1. Visible commands live under `content/commands/pn/{category}/pn-*.md`.
2. Top-level **`content/commands/pn.md`** stub (CLI + orientation router) syncs to `.cursor/commands/pn.md` — only top-level palette entry besides the `pn/` tree.
3. Hidden commands (`slash: false`) stay at `content/commands/` root; not synced to plugin.
4. MCP `get_command(id)` resolves by frontmatter **`name:`** then filename stem across the full tree.
5. `list_commands` includes `menuPath` (e.g. `pn/build/pn-build`).

### Pi (secondary)

1. Sync visible command bodies to **flat** `plugins/pnCore/prompts/pn-*.md` (basename only).
2. Ship `plugins/pnCore/package.json` with `"keywords": ["pi-package"]` and `"pi": { "prompts": ["./prompts"], "skills": ["./skills"] }`.
3. Document: Pi users get `/pn-build` etc. in a flat list; no `pn` submenu.

### Categories (v1)

| Folder | Commands |
|--------|----------|
| `pn/start/` | guide, new, setup |
| `pn/build/` | build, best-of-n, deliver, program |
| `pn/design/` | design, design-dna, design-variants, preflight, visual-tweak, polish, assets |
| `pn/pm/` | create-prd, user-stories, strategy, pressure-test, document |
| `pn/audit/` | frontend-audit, backend-audit |
| `pn/challenge/` | grill, skeptic, prompt-optimize |
| `pn/ship/` | review, retro, video-lint |

### Validator policy

- **Top-level** visible files in `.cursor/commands/` capped at **2** (`pn.md` + none other at root).
- Leaf count under `pn/` uncapped; soft warn at 35 leaves.

## Consequences

**Positive:** One `pn` menu in Cursor; Pi users get prompt templates via `pi install`; stable MCP ids.

**Negative:** Cursor CLI lacks nested leaves; Pi lacks submenu UX; dual sync path to maintain.

## References

- `docs/refs/pn-submenu-spike-2026-07-04.md`
- `scripts/command-slash-filter.mjs`
- `scripts/sync-content-to-plugin.mjs`
