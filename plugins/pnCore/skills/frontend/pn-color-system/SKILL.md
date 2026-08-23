---
name: pn-color-system
description: "Color system design and implementation: OKLCH color space, tinted neutrals, palette structure, contrast, dark mode architecture, and token hierarchy. Use when establishing color tokens, theming, dark mode, or reviewing color choices."
---

# Color System

## When to Use

- Establishing or auditing a project's color palette and token system.
- Implementing dark mode or theme switching.
- Ensuring WCAG contrast compliance.
- Replacing ad-hoc hex values with a structured token system.
- Reviewing or fixing color choices that look generic, washed-out, or inaccessible.

## Context Gathering

Check `.pncore-design.md` in the project root first. Brand personality and visual ambition affect color choices. If missing, recommend running `pn-setup` (design context option).

## Core Approach

OKLCH is the recommended color space for token systems. It is perceptually uniform — equal lightness steps look equal across hues. HSL is not perceptually uniform and produces colors that feel inconsistent.

**Tint your neutrals.** Pure gray has no personality. Add a tiny amount of your brand hue (chroma 0.005–0.01) to all neutrals for subconscious cohesion.

**Never use pure black or pure white.** Always tint. Real shadows and surfaces always have a color cast.

→ *Full implementation details, code patterns, WCAG tables, and dark mode architecture: [reference/color-and-contrast.md](../reference/color-and-contrast.md)*

## Quick Reference

### Color Token Structure

```css
/* Primitives — define once, never use in components */
--blue-500: oklch(60% 0.15 250);
--blue-200: oklch(85% 0.08 250);

/* Semantics — what components reference */
:root {
  --color-primary:       var(--blue-500);
  --color-primary-muted: var(--blue-200);
  --color-text:          oklch(15% 0.01 250);
  --color-surface:       oklch(98% 0.005 250);
  --color-border:        oklch(88% 0.01 250);
}

/* Dark mode — only redefine semantics */
[data-theme="dark"] {
  --color-primary: oklch(68% 0.13 250);
  --color-text:    oklch(92% 0.01 250);
  --color-surface: oklch(14% 0.01 250);
  --color-border:  oklch(28% 0.02 250);
}
```

### Tinted Neutrals

```css
/* Brand hue drives the neutral tint */
--brand-hue: 250;  /* blue */

--gray-50:  oklch(98% 0.005 var(--brand-hue));
--gray-100: oklch(95% 0.008 var(--brand-hue));
--gray-400: oklch(65% 0.010 var(--brand-hue));
--gray-700: oklch(38% 0.012 var(--brand-hue));
--gray-900: oklch(18% 0.010 var(--brand-hue));
```

### WCAG Contrast Requirements

| Content | AA Minimum |
|---|---|
| Body text | 4.5:1 |
| Large text (≥18px or ≥14px bold) | 3:1 |
| UI components, icons | 3:1 |
| Placeholder text | 4.5:1 |

### The AI Color Palette — Do Not Use

- Cyan accent on near-black backgrounds
- Purple-to-blue gradients on white
- Neon accents (electric green, hot pink) on dark backgrounds
- Gradient text on headings
- Glowing colored borders on glass-morphism cards

## Anti-Patterns

- **Gray text on colored surfaces:** Use a dark shade of the surface hue, not a gray from the neutral scale.
- **Pure black (#000) or pure white (#fff):** Always tint. Chroma 0.005 is enough.
- **Overloading accent color:** The accent works because it's rare. Using it on more than 10% of the UI kills contrast and emphasis.
- **Transparency everywhere:** Heavy use of rgba/alpha is a palette smell. Define explicit surface colors per elevation instead.
- **Dark mode = inverted light mode:** Dark mode needs its own design decisions — surface depth via lightness steps, desaturated accents, reduced text contrast.

## Example prompts

**Cold start:**
> Using `pn-color-system`, build a full OKLCH color token system for a fintech app — teal brand hue, tinted neutrals, dark mode, WCAG AA compliant. Output CSS custom properties.

**Warm start — from existing hex palette:**
> I have brand hex colors `#0d3b6e` and `#f5a623`. Using `pn-color-system`, convert these to an OKLCH primitive + semantic token system with dark mode overrides.

**Format-specific:**
> Using `pn-color-system`, generate a dark-mode-first color system with surface depth via lightness steps, no pure black or white, and desaturated accent for dark backgrounds.

**Iterate:**
> The accent color appears on too many elements and feels noisy. Using `pn-color-system`, audit usage and suggest a reduced semantic set to keep the accent rare and impactful.

## Output

- CSS custom property token system (primitives + semantics).
- Dark mode token overrides.
- Palette documented in tokens file or design-tokens.json.
- Reference pn-design-system for token naming conventions; pn-frontend-design for aesthetic direction.
