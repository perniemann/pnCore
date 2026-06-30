---
title: "ADR-0006: Best-of-N implementation tournament (P1 skill-only pilot)"
updated: 2026-06-30
---

# ADR-0006: Best-of-N implementation tournament (P1 skill-only pilot)

## Status

Accepted

## Context

The [agent orchestration audit (2026-06-30)](../../.cursor/plans/agent_orchestration_audit_a99b5b66.plan.md) found pnCore strong at specialist parallelization and maker≠checker gates, but lacking a **competing-implementations → objective elimination → separate judge** loop. P2 (MCP workflow engine integration) was gated on a **skill-only P1 pilot**: ≥3 real tasks, usage metrics, and an ADR comparing tournament vs single-path cost and quality.

P1 shipped `pn-best-of-n` skill, `best-of-n.contract.json`, and parallel review panel guidance (P0). Three pilot tournaments ran in June 2026 before promoting engine work.

## Decision

**Proceed to P2 planning** only after this ADR; keep tournaments **skill-only** until P2 lands `implementation_tournament` / `PNCORE_FEATURES.bestOfN`.

**P1 pilot artifacts (canonical):**

| Task | Spec | N | Outcome |
|------|------|---|---------|
| 1 | CLI validator for judge JSON vs schema | 2 → 3 (re-run) | Merged path-a (`validate-best-of-n-contract.mjs`) |
| 2 | Extract slice-verify YAML parsing | 2 | Auto-selected path-a (`slice-verify-yaml.mjs`) |
| 3 | Auto-select helper (Δ ≥ 0.15) | 2 | Auto-selected path-a (`best-of-n-select.mjs`) |

**Tooling:**

- `scripts/validate-best-of-n-contract.mjs` — schema + selection coherence
- `scripts/best-of-n-select.mjs` — `resolveBestOfNSelection()`, `DEFAULT_AUTO_SELECT_MIN_DELTA = 0.15`
- Audit JSON under `docs/audits/best-of-n-*.json`

**Human-gate policy (validated in pilot):**

- Auto-select when top-two LLM score delta ≥ 0.15 and objective gates pass
- Human gate when delta < 0.15 (pilot task 1 round 1: Δ=0.08 → user chose `re_run` with N=3)
- Single gate survivor skips LLM judge; auto-select without scores

**Explicit non-goals (unchanged):**

- No best-of-N on auth, RLS, payments, secrets — use parallel review panel (`pn-build-gate`)
- No LLM judge before objective gates

## Pilot metrics (June 2026)

| Metric | Value |
|--------|-------|
| Tournaments completed | 3 (+1 re-run round) |
| Human gates triggered | 2 (task 1 R1 close scores; task 1 R2 user pick despite Δ=0.06) |
| Auto-selects | 2 (tasks 2, 3) |
| Objective gate failures | 0 among merged winners |
| Worktree stale-schema lesson | Task 1: commit canonical schema before fan-out |

Usage lines logged to `.pncore/usage.jsonl` and `.pncore/gate-log.jsonl` at repo root (MCP `report_usage` path must stay within MCP server cwd — use repo-relative logging in pilot scripts until P2).

## Consequences

- **Positive:** Objective gates + coherence validator reduce judge hallucination on `auto_selected`; three tasks prove N=2 tournaments are viable for script/refactor slices with strong tests.
- **Negative:** Tournament cost is ~2–3× builder tokens plus judge pass; not justified for single-file or security paths.
- **P2 next:** `workflows.ts` step mode, `candidates[]` state, `suggest_model_tier` role param, `PNCORE_FEATURES.bestOfN.autoSelectMinDelta`.

## References

- Skill: `packages/pn-core-mcp/content/skills/orchestration/pn-best-of-n/SKILL.md`
- Contract: `packages/pn-core-mcp/content/reference/schemas/best-of-n.contract.json`
- Audits: `docs/audits/best-of-n-2026-06-30-pilot-*.json`
