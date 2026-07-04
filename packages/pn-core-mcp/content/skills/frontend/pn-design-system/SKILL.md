---
name: pn-design-system
description: "Establishes or maintains a design system: tokens, CSS variables, spacing/type scales, theming, and consistency auditing. Use when defining tokens or auditing components. The pn-design-system rule enforces token usage when editing CSS/SCSS files."
---

# Design system skill

## When to use

- Defining or refactoring design tokens
- Setting up CSS variable architecture
- Creating or enforcing spacing and typography scales
- Implementing light/dark or multi-theme support
- Auditing components for consistency
- Preventing one-off colors, spacing, or font sizes

## Token hierarchy

1. **Primitive tokens:** Raw values (e.g. `--color-blue-500: #3b82f6`, `--space-4: 1rem`, `--font-sans: 'Inter', sans-serif`). No semantic meaning.
2. **Semantic tokens:** Map primitives to intent (e.g. `--color-primary: var(--color-blue-500)`, `--spacing-md: var(--space-4)`, `--font-body: var(--font-sans)`).
3. **Component tokens:** Component-specific overrides (e.g. `--button-bg: var(--color-primary)`, `--card-padding: var(--spacing-lg)`). Prefer semantic over primitive in components.

## CSS variable naming conventions

- **Prefix by category:** `--color-`, `--space-`, `--font-`, `--radius-`, `--shadow-`, `--duration-`, `--ease-`.
- **Scale suffixes:** Use numeric or semantic scale (e.g. `--space-1` through `--space-12`, or `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`).
- **Semantic names:** Prefer `--color-text-primary` over `--color-gray-900` in component usage; reserve primitives for token definitions.
- **No one-offs:** Avoid inline values like `color: #3b82f6` or `margin: 13px`; use tokens.

## Spacing scale

- Define a consistent scale (e.g. 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96).
- Map to tokens: `--space-1`, `--space-2`, etc.
- Use for margin, padding, gap. Avoid arbitrary values.

## Typography scale

- Define type scale (e.g. 12, 14, 16, 18, 24, 30, 36, 48).
- Map to tokens: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, etc.
- Include line-height and letter-spacing where needed.
- Use `clamp()` or fluid typography for responsive scaling when appropriate.

## Base styles: prefers-reduced-motion (required)

When defining global/base CSS (e.g. `globals.css`, `base.css`), **always** add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

This ensures WCAG 2.2 compliance when any `transition` or `animation` is used. Per **best practices** (`pn-core://reference/best-practices.md`) and PHILOSOPHY_DESIGN_VALIDATION, this is non-optional for frontend projects.

## Touch targets (WCAG 2.5.8)

- **Minimum:** 24×24px for all interactive elements (links, buttons, icon buttons, nav items, locale switchers). Use `min-h-[24px] min-w-[24px]` or padding ≥12px.
- **Preferred:** 44×48px for primary CTAs.
- **Spacing:** 8px minimum between adjacent touch targets.
- When auditing components: flag any `<a>`, `<button>`, or role="button"/"link" with insufficient tap area.

## Theme structure

- **Light/dark:** Use `[data-theme="dark"]` or `.dark` with token overrides. Define both light and dark values for semantic tokens.
- **Structure:** Keep theme overrides in one place (e.g. `themes.css` or `:root` + `[data-theme="dark"]` block).
- **Avoid inline theme checks:** Prefer tokens that switch by theme; components reference tokens only.

## Consistency auditing

- **Scan for literals:** Search for hex colors, raw px values, font names not from tokens.
- **Component audit:** Ensure each component uses tokens for color, spacing, typography.
- **Naming alignment:** Check that similar concepts use same token (e.g. all "primary" actions use `--color-primary`).
- **Document exceptions:** When a one-off is required, document why and consider promoting to token if repeated.

## Output

- Token definitions in CSS or design tokens format (JSON, etc.).
- Components that reference tokens exclusively.
- Theme files with light/dark overrides.
- Reference pn-frontend-design for aesthetics; pn-ux-patterns for a11y.
