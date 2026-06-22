---
name: pn-arrange
description: Fix layout, spacing, and visual rhythm — grid, asymmetry, spatial hierarchy. Surgical command for spatial design. Works standalone or as part of pn-design.
slash: false
---

# pn-arrange

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-design` (Layout substep), `/pn-visual-tweak`, or `/pn-polish`, or directly via `get_command("pn-arrange")`.

Focused layout pass: fix spacing rhythm, layout composition, grid patterns, and visual hierarchy through space. No font or color changes — spatial design only.

## Flow

### 1. Scope

If not specified: "Which section, component, or page should I focus on? Or 'all' for the full project."

### 2. Audit

Load `get_skill("pn-grid-systems")` and consult `[reference/spatial-design.md](../skills/frontend/reference/spatial-design.md)`.

Audit for:
- **Rhythm:** Is the same spacing used everywhere? Is there contrast between tight (within-component) and generous (between sections) spacing?
- **Named anti-patterns:** Identical card grid? Center-everything layout? Same padding throughout? Hero metric layout? Cards nested in cards?
- **Composition:** Symmetric and centered, or asymmetric and dynamic?
- **Grid-breaking:** Are there any elements that intentionally escape the grid for emphasis?
- **Spacing tokens:** Are raw px values used instead of tokens?
- **Container queries:** For components appearing in multiple contexts (sidebar vs main), are container queries used?
- **Negative space:** Does the layout use deliberate emptiness for emphasis, or is every pixel filled?

Output issues. Gate on confirmation before fixing.

### 3. Fix

Apply changes. Common fixes:
- Introduce spacing scale with contrast (tight groupings, generous section separators)
- Break symmetric centering with offset compositions (60/40 split, left-aligned hero)
- Replace identical card grid with editorial rhythm (featured + standard)
- Extract spacing values to tokens
- Add container queries for reusable components
- Add generous negative space around key elements

### 4. Summary

What was changed, spatial anti-patterns resolved, composition shift if applicable.

## Skills to Use

- **pn-grid-systems** — grid, flexbox, responsive patterns
- *reference/spatial-design.md* — rhythm, asymmetry, named anti-patterns, container queries
- **pn-css-styling** — CSS patterns, tokens
