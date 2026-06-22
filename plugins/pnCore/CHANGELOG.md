# Changelog

All notable changes to pnCore are documented in this file.

## [Unreleased]

## [0.14.6] - 2026-06-22

### Added

- **pnCore** public repository: MCP server (`packages/pn-core-mcp/`), Cursor plugin (`plugins/pnCore/`), and canonical content under `packages/pn-core-mcp/content/`.
- 166 skills, 17 workflow types, 24 MCP tools, 9 public agents + 6 internal orchestration agents, and `pn-core://` resources.
- Install paths: MCP one-click deeplink, `npx github:perniemann/pnCore install`, and local `npm run setup` / `npm run mcp-config`.

### Changed

- README rewritten as standalone product documentation: architecture (MCP + plugin), quick start, workflows, maintainer scripts.
- Repository scoped to the functional core — historical audit/eval artifacts removed; `bench`, `measure-tokens`, and `dashboard` scripts retained.

### Fixed

- MCP install deeplink base64 now targets `pnCore.git` and `packages/pn-core-mcp` (stale encoded config from an earlier copy).
