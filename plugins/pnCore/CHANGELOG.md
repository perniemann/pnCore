# Changelog

All notable changes to pnCore are documented in this file.

## [Unreleased]

## [0.17.1] - 2026-07-06

### Changed

- **Pi slash menu:** Single `/pn` extension command with selector UI (like `/model`); leaf workflows no longer flood the main slash menu. Removes flat `pi.prompts` registration; sync generates `pi-command-index.json`.

## [0.17.0] - 2026-07-05

### Added

- **Pi native tools:** `pi install git:…/pnCore` registers all 24 pn-core tools via `pi.registerTool()` (`packages/pn-core-mcp/extensions/pn-core.ts`). Shared handler registry extracted from the MCP server; stdio MCP unchanged for Cursor and other clients. See [ADR-0009](../../docs/adr/0009-pi-native-tools.md).

## [0.16.0] - 2026-07-04

### Breaking

- Removed pnCursor-era local state: `.pncursor/` gitignore entries; use `.pncore/` only.
- **`run_id` only** — `pncoreRunId` state field no longer accepted.
- **`pn-core://reference/best-practices.md`** only — dated `best-practice-2026-03` URI no longer resolves.
- **`engine_feature` only** for UE/Godot — public `unreal_feature` / `godot_feature` workflow types removed from MCP enum.
- Human-gate tickets require **`run_id`** on issue (`approval_checkpoint`) and matching state on consume.
- Project doc discovery uses **`docs/refs/`** only (no flat `docs/PRD.md` fallbacks in rules/commands).

### Added

- **`scripts/check-no-legacy-names.mjs`** — CI guard against reintroducing pnCursor names and removed compat shims.

### Fixed

- **pi.dev git install:** root `package.json` now exposes `pi.prompts` / `pi.skills` pointing at `plugins/pnCore/` so `pi install git:github.com/perniemann/pnCore` loads slash prompt templates. Sync and `check-content-plugin-sync` enforce manifest + flat `prompts/` parity.

## [0.15.1] - 2026-07-04

### Added

- **`pn` command submenu** (ADR-0008): visible commands nested under `.cursor/commands/pn/{category}/` with top-level `pn.md` router.
- **Pi package delivery:** flat `plugins/pnCore/prompts/pn-*.md` + `package.json` `pi-package` manifest for [pi.dev](https://pi.dev) prompt templates.
- PM palette leaves: `/pn-create-prd`, `/pn-user-stories`.
- Recursive MCP `get_command` / `list_commands` with `menuPath`; `scripts/command-slash-filter.mjs` shared helpers.

### Changed

- Catalog: **28** visible palette files (27 submenu leaves + `/pn` stub), **46** commands total (18 palette-hidden).
- `pn-guide`, RUNBOOK, and companion catalog updated for submenu layout.

## [0.15.0] - 2026-07-03

### Added

- First quarterly documentation audit: [docs/refs/audit-2026-Q3.md](../../docs/refs/audit-2026-Q3.md) per ADR-0002.
- `scripts/check-doc-inventory.mjs` — README catalog counts validated against filesystem in `npm run validate`.
- `workflow-state-schema.md` sections for `prompt_optimize`, `engine_feature`, `godot_feature`, `feature_program`, and `implementation_tournament`.

### Changed

- Catalog alignment: **167** skills, **43** commands (25 visible + 18 palette-hidden), **18** workflow types, 24 MCP tools, 9 public + 6 internal agents.
- README workflow table, [docs/mcp-usage-guide.md](../../docs/mcp-usage-guide.md), [docs/plugin-reference.md](../../docs/plugin-reference.md), [docs/how-to-use-guide.md](../../docs/how-to-use-guide.md), and `pn-guide` updated for `implementation_tournament`, `feature_program`, and `pn-best-of-n`.
- ADR-0006 amended: P2 `implementation_tournament` shipped (flag-gated); skill-only path when `bestOfN.enabled` is false.
- `docs/refs/context-index.json` `last_reviewed` updated; `quarterly_audit` pointer added (schema 1.2.0).

### Fixed

- `workflow_step` tool description: `visual_tweak` step count 5 → 4 (matches `workflows.ts`).
- MCP one-click install deeplink: use `npx --package … -- pn-core` instead of `cmd` + relative `node` path (cross-platform).

## [0.14.6] - 2026-06-22

### Added

- **pnCore** public repository: MCP server (`packages/pn-core-mcp/`), Cursor plugin (`plugins/pnCore/`), and canonical content under `packages/pn-core-mcp/content/`.
- 166 skills, 17 workflow types, 24 MCP tools, 9 public agents + 6 internal orchestration agents, and `pn-core://` resources.
- Install paths: MCP one-click deeplink, `npx github:perniemann/pnCore plugin-install`, and local `npm run setup` / `npm run mcp-config`.

### Changed

- README rewritten as standalone product documentation: architecture (MCP + plugin), quick start, workflows, maintainer scripts.
- Repository scoped to the functional core — historical audit/eval artifacts removed; `bench`, `measure-tokens`, and `dashboard` scripts retained.

### Fixed

- MCP install deeplink base64 now targets `pnCore.git` and `packages/pn-core-mcp` (stale encoded config from an earlier copy).
