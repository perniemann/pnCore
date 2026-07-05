# ADR-0009: Pi native tools (pi.registerTool)

## Status

Accepted — 2026-07-05 (slash menu note amended 2026-07-06)

## Context

pnCore ships a stdio MCP server (`packages/pn-core-mcp/`) with 24 tools, plus a Pi package manifest for skills and extensions ([ADR-0008](0008-command-palette-pn-submenu.md)). Pi users previously had to configure a separate MCP subprocess (`npx … pn-core`) for orchestration — cold-start pain on Windows and extra setup.

[Pi Packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) and [Pi Extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) support bundling TypeScript extensions that register LLM-callable tools via `pi.registerTool()` with TypeBox parameter schemas.

## Decision

### Dual surface (keep MCP + add Pi native tools)

1. **Extract** shared tool handlers into `packages/pn-core-mcp/src/tools/` (registry, Zod schemas for MCP, TypeBox schemas for Pi).
2. **Keep** stdio MCP for Cursor, Claude Code, and any MCP client.
3. **Add** Pi extension at `packages/pn-core-mcp/extensions/pn-core.ts` that registers tools via `pi.registerTool()` and the **`/pn` command menu** via `pn-command-menu.ts`.
4. **Root** `package.json` `pi.extensions`: `["./packages/pn-core-mcp/extensions/pn-core.ts"]` for `pi install git:…/pnCore`.

### Install matrix

| Command | Slash `/pn` menu | Skills | Native tools |
|---------|------------------|--------|--------------|
| `pi install git:github.com/perniemann/pnCore@main` | Yes | Yes | Yes |
| `pi install .` (repo root) | Yes | Yes | Yes (after `npm run build:mcp`) |
| `pi install ./plugins/pnCore` | No | Yes | No |
### Parity (v1)

- All **24 tools** registered on Pi with TypeBox parameters (no Zod-in-execute fallback).
- **`pn-core://` MCP resources** remain MCP-only; content access via `get_skill`, `get_command`, `get_rule`.
- **MCP prompts** (`regPrompt`) not duplicated; Pi slash workflows use **`/pn` extension menu** + `get_command` / `get_skill` / `get_rule` tools (templates under `plugins/pnCore/prompts/`, not `pi.prompts`).

## Consequences

**Positive:** Pi users get native tools without subprocess MCP; one handler implementation, two thin adapters; Windows npx cold-start avoided on Pi.

**Negative:** TypeBox + Zod schemas maintained in parallel until a codegen path exists; `./plugins/pnCore`-only install does not include tools.

## References

- Skeptic gate 2026-07-05 (spike-first, colocate extension with pn-core-mcp)
- `docs/PN-COMMAND-GROUPING-RESEARCH.md`
- `packages/pn-core-mcp/extensions/pn-command-menu.ts`
- `packages/pn-core-mcp/src/tools/registry.ts`
- `packages/pn-core-mcp/extensions/pn-core.ts`
