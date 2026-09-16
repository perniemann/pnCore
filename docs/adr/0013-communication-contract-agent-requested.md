---
title: "ADR-0013: Communication contract stays agent-requested"
updated: 2026-08-20
---

# ADR-0013: Communication contract stays agent-requested

## Status

Accepted

## Context

System-prompt engineering patterns (positive/negative chat patterns, reference-point codes, micro-aliases such as `scr`/`foc`) improve output quality and cut completion tokens. pnCore already pays ~5.7k alwaysApply tokens across nine rules (`scripts/measure-tokens.mjs`). A new always-on communication rule would grow every turn before any measured output savings. Industry guidance for Cursor rules favors a thin always-on layer and agent-requested or glob-scoped detail.

## Decision

1. Ship **`pn-communication-contract`** as `alwaysApply: false` (description-driven / agent-requested), with examples in `pn-core://reference/communication-contract.md`.
2. Ship **`pn-response-aliases`** (`scr`, `eli`, `foc`, `ref`, `scp`) as an on-demand skill; document the reference-point protocol in **`pn-context-engineering`**.
3. **pn-setup / pn-new** may optionally seed the contract rule into `.cursor/rules/` with **`alwaysApply: false` only** — never mirror the commit-trailer rule’s always-on pattern.
4. **Deferred:** (a) output-token A/B fixtures extending `measure-tokens.mjs`; (b) continual-learning / session-retro auto-distillation of do/don’t banks. Promote the contract to `alwaysApply: true` only after measured **net** token savings (input + output), not against a raw always-on size KPI.

## Consequences

- **Positive:** Zero alwaysApply growth for this feature; aliases and reference codes remain available on demand; setup paths stay consistent with token-budget discipline (`pn-budget-cost-monitor`).
- **Negative:** Agents may not load the rule unless the description matches or setup/bootstrap mentions it. Mitigation: strong rule `description`, MCP bootstrap lines in project-context, and skill cross-links.
- **Follow-up:** When adding A/B benches or CL distillation, open a new ADR or amend this one with measured results before changing `alwaysApply`.

## References

- Skeptic gate `83a37b73-06e0-4448-802b-c39457cee9c3` (revise → apply_revisions)
- IndyDevDan / disler `fixing-smartass-opus-5` system-prompt pattern (framework adapted, not vendored as always-on)
- `pn-budget-cost-monitor`, `scripts/measure-tokens.mjs`, ADR-0002 audit cadence
