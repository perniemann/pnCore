---
title: "ADR-0020: Step spans on the run log"
updated: 2026-09-14
---

# ADR-0020: Step spans on the run log

## Status

Accepted

## Context

pnCore already answers *that* something happened in a run: `workflow-runs.jsonl` records each `workflow_step` routing (ADR-0017 made those entries replayable), `run-events.jsonl` records verify attestations and acceptance (ADR-0012), `usage.jsonl` totals tokens, `workflow-handoff.jsonl` keeps step summaries, `gate-log.jsonl` keeps confirm gates, and `skill-load-log.jsonl` records every `get_*` load. `workflow_usage_totals` and the metrics dashboard aggregate these.

None of it answers *where*. The trails share a `run_id` but nothing joins them per step, no entry knows its position in the run, and the time an agent spends between two `workflow_step` calls — the actual cost of a step — is recorded nowhere. `workflow_run_query` even accepted `kinds: ["step", "usage", "handoff", "gate"]` in its schema while only ever reading `run-events.jsonl`, so those kinds returned nothing.

The next roadmap item (budget-packed context, B1) changes what each step emits. Without per-step spans there is no baseline to compare its effect against.

## Decision

1. **The run-log line is the span.** Every `workflow_step` entry now carries `stepIndex` (0-based, monotonic per `runId`), `sinceLastStepMs` (wall time since the previous step of the same run; `null` on the first call), and `engineMs` (time inside `getWorkflowStep` plus gate checks, two decimals). `sinceLastStepMs` is the agent's working time for the *previous* step; `engineMs` separates engine cost from agent cost. No new file, no new tool call, no change to the `workflow_step` response.
2. **Cursor in memory, recovered from the log tail.** One MCP server process serves one session, so a `Map<runId, {stepIndex, lastTs}>` is authoritative. When a `runId` is first seen in a process (server restart mid-run), the cursor is rebuilt from the run-log tail (`packages/pn-core-mcp/src/run-spans.ts`). Pre-span entries without `stepIndex` fall back to file order.
3. **Loads are tagged with the span they happened under.** `get_skill` / `get_agent` / `get_command` / `get_rule` already accept `run_id`; `appendSkillLoadLog` now adds the run's current `stepIndex`. This is the join key that shows which step pulled which skills without timestamp heuristics.
4. **`workflow_run_query` is the single read surface.** `kinds` gains `load`; `step`, `load`, `usage`, `handoff`, `gate` now actually read their trails (`readTrail`: bounded tail read, `run_id`/`runId` match, cwd-jailed paths) and merge with verify/acceptance into one time-ordered event list. Step events omit the `state` snapshot (keys only). `timeline: true` returns `buildRunTimeline`: per step — loads (by `stepIndex`, else by time window), tokens, handoff head, gate count, verify count — plus `totals`, `wallMs`, `slowest` (largest `sinceLastStepMs`), `done`, `accepted`. Default `kinds` stay verify + acceptance, so existing callers see no change.
5. **No OTel exporter.** Spans are local JSONL read by an MCP tool. An OpenTelemetry bridge would add a dependency and a collector to run for a single-process server whose consumers are the agent and `pn-metrics`; the trails can be exported later if a backend appears.

## Consequences

- **Positive:** One query answers "which step was slow, what did it load, what did it cost, did it verify" for any `run_id`, with zero new writes from the agent. The B1 budget-packing work has a per-step baseline (`engineMs`, loads per step) to grade against. Replay fixtures (ADR-0017) are unaffected: `RunLogEntry` passes the new fields through and `replayTrajectory` ignores them.
- **Negative / open:** `sinceLastStepMs` conflates agent thinking, tool calls, and human wait time at `human` gates; it is a wall clock, not a CPU clock. Timestamps come from one process, so cross-run ordering across machines is not meaningful. The timeline attaches usage/handoff/gate/verify records by time window, so records written with a skewed clock land on the wrong step. Cursor recovery reads at most `TRAIL_SCAN_MAX` bytes of the run log; a run whose earlier entries scrolled past that window restarts `stepIndex` from the recovered maximum only.

## References

- [ADR-0012: dispose-verify, typed envelopes, earned acceptance](0012-mcp-dispose-verify.md) — `run-events.jsonl`
- [ADR-0017: Deterministic trajectory replay in CI](0017-trajectory-replay.md) — run-log fields this builds on
- `pn-core://reference/workflow-runs-schema.md`
- `packages/pn-core-mcp/src/run-spans.ts`, `src/run-spans.test.ts`, `src/tools/handlers.ts` (`handleWorkflowStep`, `handleWorkflowRunQuery`), `src/tools/tool-runtime.ts` (`appendSkillLoadLog`)
