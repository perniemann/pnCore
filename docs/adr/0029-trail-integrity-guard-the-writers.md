# ADR-0029: Trail integrity: guard the writers, do not sign the lines

**Status:** Accepted
**Date:** 2026-11-22

## Context

The engine trusts lines in its JSONL trails: served steps decide sequencing (ADR-0025), `run-events.jsonl` carries verify attestations, `human-gate-tickets.jsonl` carries tickets, `gate-log.jsonl` carries gate verdicts, and handoff lines mark commits (ADR-0022). The 2026-11-21 review proposed signing server-written lines with an HMAC and verifying on read.

0.23.0 closed the path found then: `workflow_state_save` wrote any `.jsonl`. Five tools still append to a caller-chosen path (`report_usage`, `workflow_handoff_append`, `workflow_confirm`, `gate_log_append`, and `workflow_state_save` through `handoff_path`). Each writes a fixed line shape that today's readers reject in a foreign trail, but that held by coincidence, not by rule. Two writers also contained paths lexically: `harness_scaffold` followed a symlinked `.cursor` out of the workspace, and the gate log followed a symlinked `.pncore`.

## Decision

1. **Each writer owns one trail.** `reservedTrailError` refuses a caller path that resolves, after symlinks, to any engine trail other than the writer's own. The trail list honours the same env overrides as the writers (`PNCORE_RUN_LOG`, `PNCORE_RUN_EVENTS_PATH`, `PNCORE_HUMAN_GATE_TICKETS_PATH`, `PNCORE_HANDOFF_LOG`, `PNCORE_SKILL_LOAD_LOG`).
2. **The rule covers the class, not the instance.** A test enumerates every writing tool with a `path` or `handoff_path` argument and fails when one appears without a fixture, then points each writer at every foreign trail and checks the file is unchanged.
3. **Containment resolves symlinks everywhere a tool writes.** `harness_scaffold` and the gate log use `resolveInside`, as every other writer has since 0.23.0.
4. **No signing.** An HMAC key must outlive the server process, or lines from an earlier session fail verification and resume breaks. A key that outlives the process sits in a file or the MCP config, where a model with shell access reads it as easily as it writes `.pncore/`. Signing would raise the cost of a forgery that `SECURITY.md` already lists as not covered, without moving the boundary.

## Consequences

- **Positive:** no pn-core tool call can put a line into a trail another writer owns, and the test fails the day a new writer skips the guard.
- **Negative:** a caller cannot point `report_usage` or a handoff at a file that happens to share an engine trail's path. That was never a supported use.
- **Boundary unchanged:** a model with shell write access to `.pncore/` can still forge a line. `SECURITY.md` says so.

## References

- [ADR-0022: Checkpoint commit protocol](0022-checkpoint-commit-protocol.md)
- [ADR-0025: Server-side step sequencing](0025-server-side-step-sequencing.md)
- `SECURITY.md`, Trust boundary
