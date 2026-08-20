---
title: "ADR-0012: MCP dispose-verify, typed envelopes, earned acceptance"
updated: 2026-08-20
---

# ADR-0012: MCP dispose-verify, typed envelopes, earned acceptance

## Status

Accepted — 2026-08-20

## Context

`workflow_step` already owns step sequence. Host agents still ran tests, self-reported `objectiveGateResults`, and treated a finished step as an accepted run. SSSF (disler/super-simple-software-factory) showed four useful patterns: known commands are code, typed envelopes, accepted ≠ phases passed, queryable traces. pnCore is MCP-first; plugin and Pi are adapters of the same registry. Stamping SSSF’s Python ADW graph would create a second factory.

An earlier honor-system `workflow_verify` (agent-supplied exit codes) was reverted. 2026 MCP guidance treats in-process shell as a sandbox problem: allowlists are not enough (`npx -c` class bypass).

## Decision

1. **MCP owns disposal.** New tools `workflow_verify` and `workflow_run_query` live in `packages/pn-core-mcp`. Pi registers them via `PN_CORE_TOOLS` (26 tools). Plugin content updates only through `sync:content`.
2. **No shell.** Catalog argv only by default (`npm_test`, `npm_test_full`, `npm_validate`, `ruff_check`, `pytest`). Free-form argv is a separate flag and still forbids shells, `npx`, `-c`/`-e`.
3. **Fail closed.** Default backend is `bwrap` when installed. If no jail exists, the tool returns `DISPOSE_UNAVAILABLE`. Hosts may set `PNCORE_VERIFY_SANDBOX=restricted` (no-shell spawn, not a jail). Vitest uses an explicit `test` backend. There is no silent raw-spawn fallback.
4. **Earned acceptance.** Tournament step 2, when `disposeVerify` is on, reads attested `GateReport`s. `acceptance.accepted` is computed by the server. A red suite can be `phasesPassed: true` and `accepted: false`.
5. **Typed envelopes** (`typedEnvelopes`) require specialist objects on `pn-*` `taskResults` keys.
6. **Flags default off** so existing hosts keep the agent-honor path.

## Consequences

- **Positive:** False greens cannot advance tournament step 2 when the flag is on; traces are queryable by `run_id`; plugin/Pi stay adapters.
- **Negative:** Hosts without `bwrap` must opt into `restricted` or leave the flag off. Coverage of OS jails depends on CI having `bwrap`.
- **Not taken:** SSSF Python stamp, Vue visualizer, write-boundary rollback (ADR-0001 worktrees), rewriting all 17 workflows in one change.

## References

- [SSSF](https://github.com/disler/super-simple-software-factory)
- [ADR-0001 feature program / worktrees](0001-feature-program-workflow.md)
- [ADR-0009 Pi native tools](0009-pi-native-tools.md)
