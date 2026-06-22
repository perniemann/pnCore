---
name: pn-typeset
description: Fix typography — font choices, type scale, hierarchy, loading, and readability. Surgical command for typography improvements. Works standalone or as part of pn-design.
slash: false
---

# pn-typeset

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-design` (Typography substep), `/pn-visual-tweak`, or `/pn-polish`, or directly via `get_command("pn-typeset")`.

Focused typography pass: audit and fix font choices, type scale, visual hierarchy, font loading, and readability. No layout changes, no color changes — typography only.

## Flow

### 1. Context

Check `.pncore-design.md` for brand personality and visual ambition. If not found, ask: "What's the brand tone? (e.g. editorial/premium, clean/functional, bold/expressive)"

**Typography pass (state before coding):** Chosen display + body (or single strong family), loaded from where (e.g. Google Fonts), and why it matches the brand — not Inter, Geist, Roboto, Arial, or generic system-ui unless spec requires. Pairing: high contrast across axes (display + humanist sans, serif + geometric sans, etc.). Use weight/size contrast (e.g. 200 vs 800, or display 3×+ body size), not 400 vs 600 only. See `reference/typography.md` for impact lists by vibe (editorial, technical, startup).

### 2. Scope

If not specified: "Which pages or components should I focus on? Or reply 'all' for the full project."

### 3. Audit

Load `get_skill("pn-typography")` and consult `[reference/typography.md](../skills/frontend/reference/typography.md)`.

Audit for:
- **Font choices:** Are they distinctive or generic defaults (Inter, Geist, system-ui)? Do they match brand personality?
- **Type scale:** Is there a consistent modular scale? Too many similar sizes?
- **Hierarchy:** Three layers (display / reading / utility) — are they distinguishable?
- **Pairings:** If two fonts, do they contrast on multiple axes? If one font, is it strong enough alone?
- **Font loading:** `font-display` set? Critical fonts preloaded? Fallback metrics for zero FOUT?
- **OpenType:** Are tabular numbers used for data? Other features available?
- **Fluid vs fixed:** Are headings on content pages using `clamp()`? Is app UI using fixed rem?
- **Readability:** Body text `max-width: ~65ch`? Sufficient line-height?

Output: numbered list of issues with severity (critical / major / minor).

**Gate:** Confirm list before fixing. If user says "just fix it," proceed.

### 4. Fix

Apply changes. Common fixes:
- Replace Inter/Geist with a distinctive alternative from `reference/typography.md`
- Add fallback font metrics to eliminate FOUT
- Consolidate type scale to fewer sizes with more contrast
- Add `font-variant-numeric: tabular-nums` to data tables and prices
- Wrap body content in `max-width: 65ch` or equivalent token

### 5. Summary

What changed, why, before/after font stack if fonts changed.

## Skills to Use

- **pn-typography** — font selection, scales, variable fonts, loading
- *reference/typography.md* — font alternatives, fallback metrics, OpenType, fluid vs fixed guide
