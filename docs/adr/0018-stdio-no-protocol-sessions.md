---
title: "ADR-0018: Stay stdio; no protocol sessions; SDK v2 waits on hosts"
updated: 2026-09-17
---

# ADR-0018: Stay stdio; no protocol sessions; SDK v2 waits on hosts

## Status

Accepted

## Context

MCP specification **2026-07-28** dropped the `initialize`/`initialized` handshake and `Mcp-Session-Id`, and replaced held-open Streamable HTTP reverse channels with Multi-Round-Trip Requests (MRTR). That rewrite exists so remote HTTP servers can sit behind round-robin load balancers without sticky sessions.

pnCore ships a **local stdio** MCP server (`packages/pn-core-mcp/src/adapters/mcp-server.ts`) plus Pi native tools ([ADR-0009](0009-pi-native-tools.md)). It does not expose HTTP. Orchestration state is already caller-supplied: `workflow_step` is documented as stateless, and the model echoes `run_id` plus the full `state` object. HITL is a second client tool call (`approval_checkpoint` → `pncoreHumanGateTicket`), not `elicitation/create` on an open stream.

Two docs named **Streamable HTTP** as the enterprise path for remote MCP ([packages/pn-core-mcp/README.md](../../packages/pn-core-mcp/README.md), [docs/mcp-usage-guide.md](../mcp-usage-guide.md)). That sentence is false after 2026-07-28. The TypeScript SDK that implements the new wire protocol is **v2** (`@modelcontextprotocol/server` / `@modelcontextprotocol/client`). pnCore still depends on `@modelcontextprotocol/sdk` `~1.30.0` because Cursor, Claude Code, Codex, and Pi still speak v1 stdio (`initialize` on `server.connect()`).

## Decision

1. **Keep stdio.** Do not add Streamable HTTP, `Mcp-Session-Id`, session affinity, or a protocol handshake of our own.
2. **Keep application state explicit.** `run_id` plus caller-supplied `workflow_step` `state` (and file-backed `.pncore/` resume) remain the handle. Protocol sessions are not a substitute.
3. **Docs tell the 2026-07-28 truth.** stdio stays the product transport. If a remote HTTP pn-core ever ships, it must be spec **2026-07-28** (stateless requests, MRTR, `Mcp-Method` / `Mcp-Name` headers) — not sessionful Streamable HTTP.
4. **SDK v1 until hosts catch up.** Stay on `@modelcontextprotocol/sdk` v1 while host clients require `initialize`. Migrate the **adapter** to SDK v2 / `2026-07-28` only after those hosts speak it. Do not rewrite `workflow_step` or HITL for that bump.
5. **MRTR elicitation is optional later.** Native `input_required` does not replace `approval_checkpoint`, skeptic gates, or `PNCORE_APPROVAL_TOKEN` until hosts implement MRTR.
6. **No IdP/CIMD until we are a remote server.** Local stdio inherits the desktop user. Central MCP authorization is out of scope.

## Consequences

- **Positive:** Operators are not steered onto a transport we do not ship and that the spec just retired as the scale path. New maintainers do not “fix” pnCore by adding HTTP sessions. The workflow spine stays request/response.
- **Negative:** pnCore still performs a v1 `initialize` handshake because the host SDK does. That is host lag, not a product session store. Mitigation: revisit when Cursor / Claude Code / Codex / Pi advertise `2026-07-28`.
- **Follow-up:** Adapter-only SDK v2 migration when hosts speak the new revision. A remote HTTP server, if ever, is a new ADR and must start stateless.

## References

- [MCP 2026-07-28 specification announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [ADR-0009: Pi native tools](0009-pi-native-tools.md)
- [ADR-0003: Governance without a second protocol](0003-governance-without-agp-protocol.md)
- [ADR-0015: Consumer-project gating](0015-consumer-project-gating.md)
- `workflow_step` tool description in `packages/pn-core-mcp/src/tools/registry.ts`
