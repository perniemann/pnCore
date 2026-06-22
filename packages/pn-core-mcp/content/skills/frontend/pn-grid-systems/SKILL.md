---
name: pn-grid-systems
description: Grid systems: CSS Grid, flexbox, responsive breakpoints, alignment. Use when building layouts, card grids, or responsive structures.
---

# Grid systems

## When to use

- Building page or section layouts.
- Card grids, bento layouts, or masonry-style arrangements.
- Responsive breakpoints and mobile-first layouts.
- Alignment, distribution, or gap consistency.

## CSS Grid

→ *Full reference with visual rhythm, asymmetry, named anti-patterns, container queries, and negative space: [reference/spatial-design.md](../reference/spatial-design.md)*

- Use `grid-template-columns` with `repeat()`, `minmax()`, `fr` for flexible columns.
- Named grid areas for complex layouts: `grid-template-areas`.
- `gap` for spacing between cells; prefer tokens over raw values.

## Flexbox

- Use for 1D layouts (rows or columns). `flex-direction`, `justify-content`, `align-items`.
- `flex-wrap` for responsive wrapping. `flex: 1 1 minmax()` for flexible children.
- Prefer `gap` over margin for spacing.

## Responsive breakpoints

- Mobile-first: base styles, then `@media (min-width: ...)` for larger screens.
- Use consistent breakpoints (e.g. 640, 768, 1024, 1280).
- Use `@media (pointer: coarse)` when touch targets need extra padding (min 44×48px).
- Prefer `clamp()` or container queries where appropriate.

## Output

- Responsive layouts using grid or flexbox with consistent gaps and alignment.
- Spatial rhythm: tight within-component spacing, generous section separation.
- Reference pn-design-system for spacing tokens; pn-css-styling for general CSS patterns; [reference/spatial-design.md](../reference/spatial-design.md) for deep reference.

## Anti-Patterns

- **Identical card grid:** Same size, same structure, repeated uniformly — replace with editorial rhythm or varied layout.
- **Center-everything:** Reserve centering for short headlines and single-focus CTAs; left-align body content.
- **Same spacing everywhere:** No rhythm, no hierarchy. Use tight groupings within components, generous spacing between sections.
- **Cards nested in cards:** Flatten with elevation levels instead.
- **Raw px values:** Use spacing tokens throughout.

