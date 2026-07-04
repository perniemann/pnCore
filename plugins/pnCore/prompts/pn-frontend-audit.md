---
name: pn-frontend-audit
description: Full frontend audit — typography, layout, motion, state, performance — with scored diagnosis and prioritized fix roadmap. Use for comprehensive analysis. To fix issues immediately without a roadmap, use pn-polish.
---

# pn-frontend-audit

**Start every response with:** `[pn-command] 🔺`

Audit flow: scope selection → Phase 1–6 audit (from pn-frontend-design-philosophy reference.md) → scorecard → fix roadmap → summary.

## When MCP workflow_step is available

Call `workflow_step` with `workflowType='frontend_audit'`, `step=0`, and `state={}` (or `state={ scope: "<user-provided scope>" }`). Follow each returned instruction. The workflow runs: Scope selection → Phase 1–6 audit → scorecard + fix roadmap → summary. Control flow is deterministic; do not skip steps.

## Fallback (no workflow_step)

Follow the steps below.

## 1. Scope selection

Confirm which frontend or pages to audit. If the user's request includes scope (e.g. "audit the landing page", "audit src/app/"), use it. Otherwise ask: "Which pages or sections should I audit? Reply with paths, page names, or 'all'."

**Gate:** Do not proceed until scope is confirmed.

## 2. Run surgical audit phases

Run all 5 surgical audit phases in order. Each phase has a dedicated command; the umbrella chains them. Load `get_skill("pn-frontend-design-philosophy")` first for the scoring rubric.

| Phase | Surgical command | Scope |
|-------|-----------------|-------|
| Typography | `get_command("pn-audit-typography")` | Type scale, font choices, hierarchy, loading |
| Layout | `get_command("pn-audit-layout")` | Spacing tokens, grid, rhythm, responsive |
| Design tokens | `get_command("pn-audit-design-tokens")` | CSS variables, hardcoded values, dark mode |
| Accessibility | `get_command("pn-audit-a11y")` | WCAG contrast, keyboard, ARIA, semantics |
| Performance | `get_command("pn-audit-performance-fe")` | Core Web Vitals, bundle, images, cache |

Also run: **Phase 1** (Page Mode Classification), **Phase 4** (Motion + Scroll + Media Audit), **Phase 5** (State Architecture Audit) inline using `pn-frontend-design-philosophy` reference.md phases — these do not have standalone surgical commands.

**Required outputs** (from reference.md Default output set):

- Inventory (page mode per section)
- Scorecard (0–3 per category, overall rating band)
- Component map, State map, Motion map
- Performance budget
- Fix roadmap (Priority = Impact × Confidence ÷ Effort)
- Final design philosophy summary

Save to `docs/audits/` (e.g. `docs/audits/frontend-audit-YYYY-MM-DD.md`).

## 3. Summary

Output: scorecard highlights, top risks, fast fixes vs structural fixes, and the final design philosophy summary.

**In the fix roadmap, map issues to surgical commands:**
- Typography issues (font choice, scale, loading, hierarchy) → `pn-typeset`
- Color issues (contrast failures, AI color palette, missing tokens, dark mode) → `pn-colorize`
- Layout issues (identical cards, center-everything, no rhythm, spacing tokens) → `pn-arrange`
- Motion issues (too much, bounce easing, no reduced-motion) → `pn-quieter` or `pn-delight`
- Generic/forgettable aesthetic → `pn-bolder`
- Over-decorated, visually loud → `pn-quieter`
- Copy issues (vague CTAs, blame-y errors, dead empty states) → *reference/ux-writing.md*
- Pre-ship final check → `pn-polish` or `pn-preflight` (marketing strict/studio tier)
- Excess complexity → `pn-distill`

## Skills to use

- **pn-frontend-design-philosophy** — Load and follow reference.md Agent Workflow (Phases 1–6), scoring framework, templates, Named Anti-Patterns Catalog, red-flag checklist.

## Guardrails

- Run phases in order; do not skip. Each phase has pass criteria.
- Apply the Red Flag Checklist; fail the page if any are true.
- Use the Priority Roadmap formula for the fix roadmap.
- Check Named Anti-Patterns Catalog in reference.md; fail if 3+ patterns present.
