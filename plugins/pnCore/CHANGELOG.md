# Changelog

All notable changes to pnCore are documented in this file.

## [Unreleased]

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
