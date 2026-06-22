---
name: pn-audit-layout
description: Surgical frontend layout audit — spacing tokens, grid consistency, component rhythm, and responsive behavior. Standalone or chained by pn-frontend-audit.
slash: false
---

# pn-audit-layout

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-frontend-audit` umbrella, or directly via `get_command("pn-audit-layout")`.

Focused layout pass: audit spacing tokens, grid usage, component rhythm, and responsive breakpoints. No typography changes (use `pn-audit-typography`), no color changes (use `pn-colorize`) — layout only.

## Flow

### 1. Context

Check `.pncore-stack.md` and target scope. Ask if unclear: "Which pages or layout components should I audit?"

### 2. Audit

Load `get_skill("pn-frontend-design-philosophy")` for the layout scoring rubric (Phase 3).

**Spacing tokens:**
- Is there a consistent spacing scale (e.g. 4px or 8px grid)?
- Are arbitrary pixel values used instead of tokens?
- Do padding/margin values match the scale?

**Grid system:**
- Is a grid defined (CSS Grid / Flexbox layout container)?
- Are columns consistent across similar content types?
- Do full-bleed sections align to the defined max-width?

**Component rhythm:**
- Do card / list item sizes match?
- Is vertical rhythm consistent (equal spacing between sections)?
- No "identical card grids with zero variation" anti-pattern?

**Responsive behavior:**
- Breakpoints defined in tokens / CSS variables?
- Mobile-first or correct media query order?
- Content reflow tested at 360px, 768px, 1440px?

Output: numbered issues table (location | issue | severity | suggested fix). Save to `docs/audits/`.

**Gate:** Present issues for triage. Apply fixes after confirmation.

### 3. Fix

Apply in severity order:
- Arbitrary values → replace with nearest token
- Missing grid container → add layout wrapper with defined columns
- Broken mobile layout → add responsive breakpoints

### 4. Summary

Table: issues found → issues fixed. Ref `pn-arrange` for visual arrangement refinement.

## Skills to use

- **pn-frontend-design-philosophy** — Phase 3 scoring rubric (Layout + CSS System Audit)
