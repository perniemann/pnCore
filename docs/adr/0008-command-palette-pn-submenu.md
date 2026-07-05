# ADR-0008: `pn` command palette submenu (Cursor + Pi)

## Status

Accepted — 2026-07-04 (Pi extension menu amended 2026-07-06, v0.17.1+)

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

**Amended v0.17.1:** Pi has no native prompt submenu. Equivalent UX uses an **extension command** ([Pi tui.md Pattern 1](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md)) — not flat `pi.prompts` registration.

1. Sync visible command bodies to **flat** `plugins/pnCore/prompts/pn-*.md` (basename only) — **storage for the extension**, not `pi.prompts` discovery.
2. Sync generates **`plugins/pnCore/pi-command-index.json`** (`id`, `category`, `description`, `file`) via `scripts/pi-command-index.mjs`.
3. **`packages/pn-core-mcp/extensions/pn-command-menu.ts`** registers `pi.registerCommand("pn", …)` with `SelectList` UI and `getArgumentCompletions` for `/pn pn-build` direct invoke.
4. **Root** `package.json` `pi`: `{ skills, extensions }` only — **no** `pi.prompts` (validator rejects flat prompt registration). Git install: `pi install git:github.com/perniemann/pnCore@main`.
5. **`plugins/pnCore/package.json`** (plugin-only install): `pi.skills` only; no extension — use git/root install for `/pn` menu + native tools.
6. Document: Pi users type **`/pn`** for the selector (like `/model`); category appears in list descriptions. See `docs/PN-COMMAND-GROUPING-RESEARCH.md`.
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

**Positive:** One `pn` menu in Cursor; Pi users get **`/pn` selector** + native tools via git install; stable MCP ids; index parity enforced in CI.

**Negative:** Cursor CLI lacks nested leaves; Pi selector is flat-with-categories (not nested folder UI); dual sync path + extension to maintain; print/non-TUI mode cannot open selector.
## References

- `docs/PN-COMMAND-GROUPING-RESEARCH.md`
- `docs/refs/pn-submenu-spike-2026-07-04.md`
- `packages/pn-core-mcp/extensions/pn-command-menu.ts`
- `scripts/pi-command-index.mjs`
- `scripts/command-slash-filter.mjs`
- `scripts/sync-content-to-plugin.mjs`
