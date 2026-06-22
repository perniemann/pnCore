---
name: pn-audit-a11y
description: Surgical frontend accessibility audit — WCAG contrast, keyboard navigation, ARIA roles, focus management, and screen-reader compatibility. Standalone or chained by pn-frontend-audit.
slash: false
---

# pn-audit-a11y

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-frontend-audit` umbrella, or directly via `get_command("pn-audit-a11y")`.

Focused accessibility pass: audit WCAG contrast compliance, keyboard operability, ARIA usage, focus management, and semantic markup. No typography changes (use `pn-audit-typography`) — a11y only.

## Flow

### 1. Context

Scope the audit: ask "Which pages or components?" if not provided. Check for any existing a11y notes in `.pncore-stack.md`.

### 2. Audit

**Contrast (WCAG AA minimum):**
- Body text ≥ 4.5:1 contrast vs background?
- Large text (≥18pt / 14pt bold) ≥ 3:1?
- UI components and focus indicators ≥ 3:1?
- Text-on-image: overlay or high-contrast background?

**Keyboard navigation:**
- All interactive elements reachable via Tab?
- Logical tab order (top-to-bottom, left-to-right)?
- No keyboard traps (modal close, dropdown dismiss)?
- Skip-to-content link present on pages with nav?

**Focus management:**
- Visible focus indicator on all interactive elements?
- Focus moves to modal content when modal opens?
- Focus returns to trigger when modal closes?

**ARIA:**
- `role`, `aria-label`, `aria-describedby` used where native semantics are insufficient?
- No redundant ARIA (e.g. `role="button"` on `<button>`)?
- Dynamic content updates announced via `aria-live`?

**Semantic HTML:**
- Headings in logical order (h1 → h2 → h3, no skips)?
- Landmark regions: `<main>`, `<nav>`, `<header>`, `<footer>`?
- Form inputs have associated `<label>` elements?
- Images have meaningful `alt` text (empty `alt=""` for decorative)?

Output: numbered issues table (location | issue | WCAG criterion | severity | suggested fix). Save to `docs/audits/`.

**Gate:** Present issues. Critical (contrast failures, keyboard traps) proceed immediately unless user says stop.

### 3. Fix

Apply in order: contrast failures → keyboard issues → ARIA fixes → semantic markup.

### 4. Summary

Table: issues found → issues fixed. Reference WCAG criterion for each.

## Skills to use

- **pn-frontend-design-philosophy** — a11y criteria in Phase 3 and Phase 6 scoring
