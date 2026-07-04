---
name: pn-css-styling
description: "CSS styling: layout, box model, selectors, specificity, utilities. Use when writing or refactoring CSS, SCSS, or styled components."
---

# CSS styling

## When to use

- Writing or refactoring CSS, SCSS, or styled-component styling.
- Debugging layout issues — box model, stacking context, overflow, z-index.
- Reviewing selector specificity conflicts or cascade ordering problems.
- Setting up utility-class systems or CSS custom property token structures.

→ *For spatial design depth (rhythm, asymmetry, container queries): [reference/spatial-design.md](../reference/spatial-design.md)*
→ *For color system patterns (OKLCH, tinted neutrals, dark mode): [reference/color-and-contrast.md](../reference/color-and-contrast.md)*

## Layout and box model

- Use design tokens for spacing (margin, padding, gap). Avoid raw px unless required.
- Prefer flexbox for 1D layouts, grid for 2D. See pn-grid-systems for grid patterns.
- `box-sizing: border-box` by default; set on `*, *::before, *::after`.

## Selectors and specificity

- Prefer class selectors over IDs. Avoid `!important` except for utilities.
- Use `:where()` to lower specificity when needed.
- BEM or utility naming: be consistent with the codebase.

## Styling patterns

- Use CSS variables (or design tokens) for colors, spacing, radius, shadows.
- Prefer `clamp()` for fluid values. Use `min()`, `max()` where appropriate.
- Prefer `gap` over margin hacks for spacing between flex/grid items.

## Output

- Clean, maintainable CSS that uses tokens and matches project conventions.
- Reference pn-design-system for token structure; pn-grid-systems for layout; [reference/spatial-design.md](../reference/spatial-design.md) for visual rhythm.

## Example prompts

**Cold start:**
> Using `pn-css-styling`, refactor the main layout from raw `margin` hacks to a token-based flexbox/grid system, with `box-sizing: border-box` and CSS variable spacing.

**Warm start — from existing file:**
> This `styles.css` file has hardcoded hex values and `!important` everywhere. Using `pn-css-styling`, audit and rewrite it to use design tokens and correct specificity patterns.

**Format-specific:**
> Using `pn-css-styling`, write the responsive card grid for a feature section — fluid columns with `clamp()` gaps, single-column on mobile, three-column on desktop.

**Iterate:**
> The hover states animate `width` and feel janky. Using `pn-css-styling`, replace them with `transform`/`opacity` animations that won't trigger layout reflow.

## Anti-Patterns

- **Raw hex values:** Always use tokens for color, spacing, radius, shadows.
- **`!important` in components:** Reserve for utility overrides only.
- **Inline styles for layout:** Use CSS classes or utility tokens.
- **Animating layout properties:** Never animate `width`, `height`, `padding`, `margin` — animate `transform` and `opacity` only.
- **ID selectors for styling:** IDs have high specificity and can't be composed.
- **Pure black/white:** Tint neutrals — pure black/white don't appear in nature.

