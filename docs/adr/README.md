# Architecture decision records

Nygard ADRs live in this directory. Numbers are monotonic and never reused. Take the next free number; `npm run check:adr-index` (part of `validate`) fails on a duplicate number, a gap, a file missing from this index or an index entry without a file.

`0007` is retired: a command-palette PM-router draft that never merged. The feature-program ADR was renumbered from a duplicate `0001` to `0026` on 2026-11-22.

- [0001 record-architecture-decisions](./0001-record-architecture-decisions.md): adopt Nygard ADRs in `docs/adr/`, four-digit monotonic numbers
- [0002 skill-rule-audit-cadence](./0002-skill-rule-audit-cadence.md): quarterly audit of philosophy skills, always-apply rules and the main references; findings in `docs/refs/audit-YYYY-Qn.md`
- [0003 governance-without-agp-protocol](./0003-governance-without-agp-protocol.md): AGP ideas used descriptively only; no second protocol layer; governance stays repo, CI and MCP with human gates
- [0004 business-strategy-workflow](./0004-business-strategy-workflow.md): `business_strategy` workflow type, nine steps with skeptic gates
- [0005 design-skill-taste-parity](./0005-design-skill-taste-parity.md): design intent and marketing ship gate as references, not mega-skills
- [0006 best-of-n-pilot-skill-only](./0006-best-of-n-pilot-skill-only.md): best-of-N tournament: skill-only pilot, then `implementation_tournament` behind the `bestOfN` flag
- [0007 retired](./0007-retired.md): retired: a PM-router draft that never merged; do not reuse
- [0008 command-palette-pn-submenu](./0008-command-palette-pn-submenu.md): `pn` command palette submenu for Cursor and Pi
- [0009 pi-native-tools](./0009-pi-native-tools.md): Pi native tools via `pi.registerTool`, sharing handlers with the MCP server
- [0010 skill-evals-and-link-checking](./0010-skill-evals-and-link-checking.md): `EVAL.yaml` required for new skills; offline link checker fails by default; no CODEOWNERS
- [0011 diagram-design-native-layer](./0011-diagram-design-native-layer.md): native diagram quality layer in pnCore voice; adapt, do not vendor
- [0012 mcp-dispose-verify](./0012-mcp-dispose-verify.md): `workflow_verify` and `workflow_run_query`: MCP owns disposal, no shell, fail closed, server-computed acceptance
- [0013 communication-contract-agent-requested](./0013-communication-contract-agent-requested.md): communication contract and response aliases stay agent-requested, never always-apply
- [0014 scroll-narrative-without-cloning](./0014-scroll-narrative-without-cloning.md): `pn-scroll-narrative` skill and the N-01 to N-04 ship-gate addendum, without cloning third-party skills
- [0015 consumer-project-gating](./0015-consumer-project-gating.md): downstream gating is chat + opt-in git trailer defense; MCP never owns the Merge button
- [0016 harness-adapters](./0016-harness-adapters.md): one MCP engine, four harness adapters (Cursor, Claude Code, Codex, Pi); onboarding writes only the active harness's folders
- [0017 astra-era-skill-discovery](./0017-astra-era-skill-discovery.md): MCP `list_skills` is Astra-compliant discovery; Cursor plugin skill index is a catalog-size gap; aliases stay agent-requested (`project_context.responseAliases`, not `alwaysApply`); premium+ `renderTierHint` appends a router sentence
- [0018 stdio-no-protocol-sessions](./0018-stdio-no-protocol-sessions.md): stay stdio; no `Mcp-Session-Id` / Streamable HTTP sessions; `run_id` + caller-supplied `workflow_step` state; SDK v2 waits until hosts speak MCP 2026-07-28
- [0019 trajectory-replay](./0019-trajectory-replay.md): deterministic trajectory replay: recorded `workflow_step` runs become fixtures graded in `test:full`; no LLM in the loop
- [0020 step-spans](./0020-step-spans.md): step spans on the run log (`stepIndex`, `sinceLastStepMs`, `engineMs`), loads tagged per step, `workflow_run_query` joins the `.pncore` trails into a timeline; local JSONL, no OTel backend
- [0021 context-budget](./0021-context-budget.md): narrow context packing on the existing chars ÷ 4 measurement: `project_context` `max_tokens` with a fixed drop order, and the Codex `AGENTS.md` 32 KiB cap honoured by priority-ordered rule inlining; no general assembler
- [0022 checkpoint-commit-protocol](./0022-checkpoint-commit-protocol.md): `workflow_state_save` commit mode (lock, `expected_revision` CAS, handoff-then-rename, read-back), uncommitted handoff lines ignored by readers, verify `failureClass` (diagnostic only) and in-call preflight on `workflow_verify`; no new tools
- [0023 visual-indicator-engine-reminder](./0023-visual-indicator-engine-reminder.md): every pn-core tool result ends with a `pn-indicator:` line naming the 🔺 tag, and the server `instructions` carry the contract, so Claude Code, Codex and Pi get the per-turn signal Cursor gets from rule injection
- [0024 catalog-consolidation](./0024-catalog-consolidation.md): skills 171 → 142, tools 29 → 25 (`paperclip_issue` with `action`; usage and handoff reads move to `workflow_run_query`), `svg_create` folds into `image_create`, two wrapper commands go; no aliases
- [0025 server-side-step-sequencing](./0025-server-side-step-sequencing.md): steps after 0 need the run's `run_id` and must be served or pointed to by the engine; strict gate records must carry a `gate_id` from `workflow_confirm`
- [0027 router-skills-for-codex-and-pi](./0027-router-skills-for-codex-and-pi.md): Codex and Pi get a router set of skills sized to Codex's 8,000-character skill list; the rest load with `get_skill`; `check-router-skills` holds the budget
- [0026 feature-program-workflow](./0026-feature-program-workflow.md): `feature_program`: hierarchical parallel workflow with worktree isolation (renumbered from the duplicate 0001)
