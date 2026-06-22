---
name: pn-typography
description: Typography styling: font selection, scales, variable fonts, loading, optical sizing. Use when styling text, headings, or establishing type hierarchy.
---

# Typography styling

## Context Gathering

Check `.pncore-design.md` in the project root first. If it exists and contains audience, brand personality, and visual ambition, use it — skip discovery. If missing, recommend running `pn-setup` (design context option).

## When to use

- Choosing or pairing fonts for headings and body text.
- Setting up type scale and hierarchy.
- Variable fonts, font loading, or font-display.
- Optical sizing, letter-spacing, line-height tuning.

→ *Full reference with font alternatives, fallback metrics, vertical rhythm, modular scales, OpenType features, and fluid vs fixed guide: [reference/typography.md](../reference/typography.md)*

## Font selection

- Pair a distinctive display font with a refined body font. Avoid overused choices (Inter, Roboto, Arial, Space Grotesk).
- Use variable fonts when available for weight/width axes without multiple font files.
- Specify fallbacks: `font-family: 'MyFont', 'Fallback Sans', system-ui, sans-serif`.

## Type scale

- Define a consistent scale (e.g. 12, 14, 16, 18, 24, 30, 36, 48).
- Map to tokens: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, etc.
- Include line-height and letter-spacing. Use `clamp()` or fluid typography for responsive scaling.

## Font loading

- Use `font-display: swap` or `optional` for non-critical fonts.
- Preload critical fonts: `<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>`.
- Prefer `woff2` for modern browsers.

## Optical sizing

- Enable `font-optical-sizing: auto` for variable fonts that support it.
- Use `font-variation-settings` for fine control of axes (wght, wdth, etc.).

## Example prompts

**Cold start:**
> Using `pn-typography`, choose a distinctive display + body font pair for a B2B SaaS dashboard with a professional, data-dense feel. Output CSS variables and font-face declarations.

**Warm start — from existing design:**
> My app uses Inter everywhere and feels generic. Using `pn-typography`, suggest an upgrade with a stronger display font and provide the full token set and loading strategy.

**Format-specific:**
> Using `pn-typography`, create a fluid type scale with `clamp()` for a marketing site — sizes from 12 to 64px mapped to `--text-*` tokens, including line-height and letter-spacing.

**Iterate:**
> The headings feel too light at small sizes. Using `pn-typography`, tighten the letter-spacing and adjust weight at `--text-2xl` and below.

## Output

- Typography tokens (size, line-height, letter-spacing) in CSS or design tokens.
- Font-face declarations and fallback stack (with size-adjust metrics for zero FOUT).
- Reference pn-design-system for token structure; pn-frontend-design for aesthetic direction; [reference/typography.md](../reference/typography.md) for deep reference.
