---
name: pn-best-of-n
description: Run 2–3 competing implementations of the same spec in isolated worktrees, eliminate failures via objective gates, then judge survivors with a separate premium-tier pass. Use for ambiguous algorithm/API/refactor choices with strong tests — not auth/security paths.
---

# Best-of-N (implementation tournament)

## When to use

- Ambiguous **implementation** choice with **objective verification** (tests, lint, typecheck)
- Repeated skeptic failure on the same slice (same approach tried twice)
- User sets `useBestOfN: true` or invokes `/pn-best-of-n`
- Refactor with strong test harness, algorithm choice, API module shape **after** design exploration

## When NOT to use

- **Auth, RLS, payments, secrets** — use parallel review panel (`pn-build-gate` + `subagent-routing.md`), not competing implementations
- Single-file edits, copy tweaks, shared mutable state without worktree isolation
- No verification commands — run tests first or use `pn-design-variants` (design-only explore)
- Full `full_dev` parallel specialists — use specialist decomposition instead

**Design-only explore:** use `pn-design-variants` first; this skill implements the winning shape.

## Prerequisites

1. Written spec (plan slice, issue, or user brief) with acceptance criteria
2. Verification commands listed upfront (e.g. `npm test -- <scope>`, `npm run lint`)
3. Git worktree support (or `best-of-n-runner` subagent handles isolation)

## Workflow

### 1. Confirm scope and gates

- Restate spec in ≤5 sentences
- List **objective gates** (commands + expected exit 0) — judges must not score candidates that fail these
- Set **N** = 2 or 3 (default 2; use 3 only when ambiguity is high and budget allows)
- Confirm scope is **not** security-critical; if it is, stop and route to review panel

Log `report_usage` when MCP available (pilot metric for P1 exit criteria).

**MCP workflow (P2):** when `bestOfN.enabled` is true in `pn-core://config/features.json`, use `workflow_step('implementation_tournament', 0, {})` instead of ad-hoc fan-out. Skill-only path remains valid when the flag is off.

### 2. Fan-out — parallel builders

Spawn **N** Task subagents (`subagent_type: best-of-n-runner`) **in parallel**, each in an **isolated worktree** on the **same spec** with a **different constraint**:

| Path | Constraint (assign one per subagent) |
|------|--------------------------------------|
| A | Minimize surface area — fewest exports, narrowest API |
| B | Optimize happy path — fastest common case |
| C (optional) | Maximize extensibility — edge cases and future hooks |

**Model diversity (recommended):** assign different `model` per path when available (e.g. sonnet vs codex) for perspective diversity. Builders use **standard** tier.

Prompt each subagent:

```text
Implement: [spec]
Worktree: [path]
Constraint: [assigned constraint]
Run before submit: [objective gate commands]
Output: summary, files touched, verify command exit codes. Do not merge to main.
```

### 3. Hard gate — objective elimination

Before any LLM judge:

1. Collect each candidate's verify exit codes
2. **Discard** any candidate with non-zero exit on required gates
3. If **zero** survivors → `go_no_go: no_go`; escalate human (increase N, narrow spec, or fix tests)
4. If **one** survivor → winner = that id; skip LLM judge; still emit contract

Record in `objective_gate_results[]`.

### 4. Judge — separate premium pass (maker ≠ judge)

Only when **≥2** survivors remain:

- Lead agent (or dedicated judge turn) at **premium** tier — **not** the builder model
- Input: spec, survivor summaries, verify results, optional rubric scores (lint warnings count, test count, LOC delta)
- Pass **summaries**, not full diffs, when total size is large
- Score 0–1 per survivor; pick winner with rationale
- **Auto-select** only when top score leads second by **≥0.15** and objective gates tied; else `workflow_confirm` / `AskQuestion`
- Compute flags with `scripts/best-of-n-select.mjs` (`resolveBestOfNSelection`); validate audit JSON with `scripts/validate-best-of-n-contract.mjs` (schema + selection coherence)

Emit verdict in `pn-core://reference/schemas/best-of-n.contract.json` shape. Save to `docs/audits/best-of-n-YYYY-MM-DD-<slug>.json`.

### 5. Continue with winner

1. Merge or copy winner worktree changes to main branch per project conventions
2. Discard loser worktrees
3. Run phase-complete gate (`pn-build-gate`): verify + Task checker on merged diff
4. High-risk merged slice → parallel review panel if applicable

## Human gate (required when close)

Use `AskQuestion` or `workflow_confirm` when:

- Score delta < 0.15 between top two
- User did not set `useBestOfN: true` explicitly
- Any survivor has verify warnings (exit 0 but stderr concerns)

Options: `select_winner`, `re_run_tournament`, `abort`, `merge_synthesis` (combine insights manually).

## Anti-patterns

- LLM judge before objective gates
- Builder session as sole judge (same as CHECKER-SAME-SESSION)
- N > 3 without cost approval
- Best-of-N on security/auth implementation paths

## Related

- `pn-core://reference/subagent-routing.md` — subagent types and tiers
- `pn-core://reference/schemas/best-of-n.contract.json` — judge output contract
- `pn-design-variants` — design/API explore before this skill
- `pn-orchestration-philosophy` — when not to add parallel agents
