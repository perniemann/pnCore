---
name: pn-best-of-n
description: Run 2–3 competing implementations in isolated worktrees, hard-gate on tests/lint, then premium judge picks winner. For ambiguous refactors/APIs with strong tests — not auth/security.
---

# pn-best-of-n

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-best-of-n")`.

## When to use

| Signal | Use `pn-best-of-n` |
|--------|-------------------|
| Same spec, unclear best implementation, strong test harness | Yes |
| Repeated skeptic failure on same slice | Yes |
| User says "try multiple approaches" / `useBestOfN: true` | Yes |
| Design/layout explore only | No — use `/pn-design-variants` |
| Auth, RLS, payments, secrets | No — use review panel per `pn-build-gate` |
| Single-file fix | No — implement directly |

## How to invoke

Provide:

1. **Spec** — plan slice, issue, or brief with acceptance criteria
2. **Verify commands** — e.g. `npm test -- parseUserInput`, `npm run lint`
3. **N** (optional, default 2)
4. **Constraints** (optional) — or use skill defaults (min surface / happy path / extensibility)

## Output

- `docs/audits/best-of-n-YYYY-MM-DD-<slug>.json` in `best-of-n.contract.json` shape
- Winner worktree merged or copied to main; losers discarded
- Phase-complete checker per `pn-build-gate` on merged diff

## Guardrails

- Objective gates before LLM judge
- Premium-tier judge separate from builders
- Human gate when scores are close (<0.15 delta)
