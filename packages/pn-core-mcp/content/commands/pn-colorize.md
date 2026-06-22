---
name: pn-colorize
description: Introduce or improve color — palette, tokens, contrast, dark mode. Surgical command for color decisions. Works standalone or as part of pn-design.
slash: false
---

# pn-colorize

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-design` (Color substep), `/pn-visual-tweak`, or `/pn-polish`, or directly via `get_command("pn-colorize")`.

Focused color pass: establish or improve the color system, fix contrast issues, introduce strategic color, or implement dark mode. No layout or font changes — color only.

## Flow

### 1. Context

Check `.pncore-design.md` for brand personality, visual ambition, and any existing brand colors. If not found, ask: "What's the brand hue or personality? Any existing brand colors to work with?"

### 2. Mode

Ask (if not clear from context):

- **Establish** — build a new color system from scratch
- **Improve** — audit and fix an existing palette (contrast, generic choices, token gaps)
- **Dark mode** — add dark mode to an existing light system
- **Specific fix** — address a particular issue (e.g., "fix contrast on the blue button")

### 3. Audit / Plan

Load `get_skill("pn-color-system")` and consult `[reference/color-and-contrast.md](../skills/frontend/reference/color-and-contrast.md)`.

**For Improve mode, audit:**
- Is the color system using OKLCH? If not, flag.
- Are neutrals tinted with brand hue, or pure gray?
- Does the system use primitive + semantic token layers?
- Named anti-patterns present? (AI color palette, pure black/white, gray on color)
- WCAG contrast: body text 4.5:1, UI components 3:1, placeholder text 4.5:1?
- Does the accent color have appropriate rarity (≤10% of visual weight)?
- Is there a defined palette structure (primary, neutral, semantic, surface)?

Output issues with severity. Gate on confirmation before fixing.

### 4. Implement

Apply changes using OKLCH. Typical outputs:
- CSS custom properties with primitive + semantic layers
- Tinted neutral scale (brand hue applied at chroma 0.005–0.01)
- Dark mode semantic override block
- Fix WCAG violations with specific new values

### 5. Summary

Colors changed, contrast ratios verified, dark mode coverage if applicable.

## Skills to Use

- **pn-color-system** — OKLCH, tinted neutrals, token structure, anti-patterns
- *reference/color-and-contrast.md* — full patterns, WCAG tables, dark mode architecture
- **pn-design-system** — token naming conventions
