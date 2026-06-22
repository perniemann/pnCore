---
name: pn-review
description: Code quality and performance review — quality gates, deslop, reality-check, and optimization in one pass. Use for code review and perf. For design-only quality (typography, color, states), use pn-polish.
---

# pn-review

**Start every response with:** `[pn-command] 🔺`

**Progress:** Before each major sub-pass, state one line (same convention as `pn-deliver`):

- `"pn-review: Step 1 of 4 — Scope."` (skip if you already assumed current diff without asking)
- `"pn-review: Step 2 of 4 — Review (quality gates / plugin submission)."`
- `"pn-review: Step 2 of 4 — Review (deslop)."`
- `"pn-review: Step 2 of 4 — Review (evidence-qa)."` when running `pn-evidence-qa` before reality-check (UI-heavy)
- `"pn-review: Step 2 of 4 — Review (reality-check)."`
- `"pn-review: Step 3 of 4 — Optimize."`
- `"pn-review: Step 4 of 4 — Fix and re-run."` (only when this pass found issues and you are applying fixes before a second loop)

## When to use this vs. similar commands

| Signal | Use `pn-review` |
|--------|-----------------|
| You have code or a diff to quality-check | Yes |
| You want deslop, reality-check, or perf optimization | Yes |
| You want to review a plan before building | No — use `/pn-skeptic` or `/pn-grill` |
| You want a final delivery gate against acceptance criteria | No — use `/pn-deliver` |
| The ask is meta-design, a new skill, or a workflow-loop request | **No — state the mismatch in the first response** ("You invoked `/pn-review` but the ask is `Y`; I'll re-route to Z unless you'd rather I run pn-review as written") |

Run the **pn-review-optimize-loop** skill:

1. **Scope (if unclear):** Ask "Whole repo, current diff, or specific paths?" If unspecified, assume current diff.

2. **Review:** Apply pn-plugin-quality-gates / pn-review-plugin-submission (for plugins) or project quality gates; run **pn-deslop**; run **pn-reality-check** (default NEEDS_WORK, spec vs impl; for UI-heavy deliverables optionally run **pn-evidence-qa** first). List issues.
3. **Optimize:** Apply pn-react-next-perf and pn-systematic-debugging where relevant.
4. If issues were found: implement fixes, then run this command again once.

Output a short pass/fail summary and any remaining fix list.
