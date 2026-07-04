---
name: pn-figma-design-to-code
description: "Implements designs from Figma with design-to-code workflow, token extraction, and component mapping. Use when implementing from Figma; ensures fidelity to design specs."
---

# Figma design-to-code skill

## When to use

- Implementing UI from Figma designs
- Extracting design tokens (colors, spacing, typography) from Figma
- Mapping Figma components to React, Astro, or Next components
- Reviewing implementation against design specs
- Setting up design-to-code workflows or tooling

## Design-to-code workflow

1. **Inspect the design:** Identify layout (auto-layout, constraints), spacing, typography, colors, and component structure. Use Figma's inspect panel or dev mode for exact values.
2. **Map to components:** Match Figma frames/components to React, Astro, or Next components. One Figma component or frame typically maps to one component file.
3. **Extract tokens first:** Before coding, extract colors, spacing, and typography into design tokens. Avoid hardcoding values from the design.
4. **Implement with tokens:** Build components using tokens. Reference design for structure and hierarchy, not raw pixel values.
5. **Verify:** Compare implementation to design (screenshots, overlay, or Figma embed). Check responsive behavior at breakpoints.

## Token extraction from Figma

- **Colors:** Extract fill colors from styles or layers. Map to semantic tokens (e.g. primary, secondary, text, background). Include opacity variants. Use hex or RGB; convert to CSS variables.
- **Typography:** Extract font family, size, weight, line height, letter spacing. Map to type scale tokens (e.g. `--text-heading-lg`, `--text-body`). Note font fallbacks.
- **Spacing:** Extract padding, gap, and margin values. Normalize to spacing scale (e.g. 4, 8, 12, 16, 24, 32). Avoid one-off values; round to nearest scale step when reasonable.
- **Radius, shadow:** Extract border radius and shadows. Map to tokens (e.g. `--radius-md`, `--shadow-card`).
- **Output format:** Prefer CSS variables or design tokens JSON. Use pn-design-system skill for token structure and naming.

## Implementation patterns

- **Auto-layout → Flexbox/Grid:** Figma auto-layout maps to `display: flex` or `display: grid`. Use `gap` for spacing; `align-items`, `justify-content` for alignment. Preserve direction (horizontal/vertical).
- **Constraints → Responsive:** Figma constraints (left/right, top/bottom, scale) inform responsive behavior. Use `width: 100%`, `max-width`, or `clamp()` as appropriate.
- **Variants → Props:** Figma component variants map to component props (e.g. `variant="primary"`, `size="lg"`). Use consistent prop names.
- **Naming:** Use Figma layer/component names as a guide for component and class names. Sanitize (PascalCase for components, kebab-case for CSS). Avoid spaces and special characters.
- **Assets:** Export images/icons from Figma; use SVG when possible. Optimize and use responsive `srcset` for raster images.

## Fidelity and trade-offs

- **Pixel-perfect vs pragmatic:** Aim for visual parity at key breakpoints. Avoid over-engineering for minor differences; document intentional deviations.
- **Design updates:** When designs change, update tokens first, then components. Keep a single source of truth (Figma or tokens) and sync the other.
- **Missing specs:** When design is ambiguous, use pn-design-system conventions and document assumptions. Ask designer when critical.

## Tooling and MCP

- **Figma API:** For automated token extraction or design inspection, use Figma REST API (requires token). Scripts can export styles to JSON.
- **Figma MCP:** If configured externally, an MCP can let the agent query Figma files for live specs. Document in README how to add one.
- **Plugins:** Figma plugins (e.g. Tokens Studio, Design Tokens) can export tokens. Align extraction format with project.

## Example prompts

**Cold start:**
> Using `pn-figma-design-to-code`, implement the dashboard card component from my Figma file — extract tokens (colors, spacing, radius), map to CSS variables, and output a React component.

**Warm start — from Figma link:**
> Here is the Figma link for the pricing section. Using `pn-figma-design-to-code`, extract the design tokens and build the component in Next.js with Tailwind.

**Format-specific:**
> Using `pn-figma-design-to-code`, extract all typography styles from my Figma file and output a `tokens/typography.css` file with `--text-*` custom properties.

**Iterate:**
> The spacing feels off on mobile. Using `pn-figma-design-to-code`, compare the implementation to the Figma breakpoint specs and align the responsive padding.

## Output

- Components that match Figma design using design tokens.
- Token definitions derived from Figma styles.
- Clear mapping between Figma and code (naming, structure).
- Reference pn-design-system for token architecture; pn-frontend-design for aesthetics; pn-ux-patterns for a11y.
