---
name: pn-audit-typography
description: Surgical frontend typography audit — type scale, font choices, loading strategy, hierarchy, and accessibility. Standalone or chained by pn-frontend-audit.
slash: false
---

# pn-audit-typography

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-frontend-audit` umbrella, or directly via `get_command("pn-audit-typography")`.

Focused typography pass: audit type scale, font choices, loading behavior, hierarchy, and readability. No layout changes (use `pn-audit-layout`), no color changes (use `pn-colorize`) — typography only.

## Flow

### 1. Context

Check `.pncore-stack.md` and target files/pages. If scope is unclear, ask: "Which pages or components should I audit? (landing / all / specific paths)"

### 2. Audit

Load `get_skill("pn-frontend-design-philosophy")` for the typography scoring rubric (Phase 2).

**Type scale:**
- Is there a distinct display / reading / utility layer?
- Are font sizes from a defined scale (e.g. 4px grid, modular scale)?
- Body text ≥ 16px for reading contexts?
- Line height 1.4–1.7 for body, tighter for display?

**Font choices:**
- Distinctive, characterful typeface (not default Inter / Geist / system-ui)?
- Strong contrast between display font and body font?
- Web fonts loaded via `font-display: swap`?
- Fallback stack defined?

**Hierarchy:**
- Clear visual weight difference between heading levels?
- No more than 2–3 font families on a single page?
- Consistent heading sizing across routes?

**Accessibility:**
- All body text ≥ 4.5:1 contrast ratio?
- No text over busy backgrounds without overlay?
- Small caps / all-caps only on short strings (≤20 chars)?

Output: numbered issues table (location | issue | severity | suggested fix). Save to `docs/audits/`.

**Gate:** Present issues for triage. Apply fixes only after confirmation.

### 3. Fix

Apply in severity order:
- Wrong font → update CSS variable and fallback stack
- Missing `font-display: swap` → add to `@font-face` or Google Fonts URL
- Broken scale → introduce CSS custom properties for type steps
- Contrast failure → darken text or lighten background per brand tokens

### 4. Summary

Table: issues found → issues fixed. Ref `pn-typeset` for deeper typographic refinement.

## Skills to use

- **pn-frontend-design-philosophy** — Phase 2 scoring rubric and Named Anti-Patterns (Typography section)
