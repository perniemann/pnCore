# Architecture decision records

Nygard ADRs live in this directory. **Numbers are monotonic and never reused.**

Two files share `0001` (early collision; left as-is rather than recycling a later id):

- [0001-record-architecture-decisions.md](./0001-record-architecture-decisions.md) — adopt ADRs
- [0001-feature-program-workflow.md](./0001-feature-program-workflow.md) — `feature_program` workflow

`0007` was claimed by a command-palette PM-router draft that never merged. [ADR-0008](./0008-command-palette-pn-submenu.md) retires that number. Do not reuse `0007`.

- [0015-consumer-project-gating.md](./0015-consumer-project-gating.md) — downstream gating is chat + opt-in git trailer defense; MCP never owns the Merge button
- [0016-harness-adapters.md](./0016-harness-adapters.md) — one MCP engine, four harness adapters (Cursor, Claude Code, Codex, Pi); onboarding writes only the active harness's folders
- [0017-trajectory-replay.md](./0017-trajectory-replay.md) — deterministic trajectory replay: recorded `workflow_step` runs become fixtures graded in `test:full`; no LLM in the loop
- [0018-step-spans.md](./0018-step-spans.md) — step spans on the run log (`stepIndex`, `sinceLastStepMs`, `engineMs`), loads tagged per step, `workflow_run_query` joins the `.pncore` trails into a timeline; local JSONL, no OTel backend
