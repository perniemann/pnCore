---
name: pn-svg
description: "SVG structure, optimization, animation, and accessibility. Use when creating or editing inline SVG, icons, logos, or SVG animations. Reference assets/pn-logo.svg for a rich example."
---

# SVG

## When to use

- Creating or editing inline SVG, icons, logos.
- SVG animations (CSS, SMIL, or both).
- Optimizing SVGs (viewBox, paths, defs).
- SVG sprites or symbol reuse.

## Structure

- Use `viewBox` for scaling. Preserve aspect ratio with `preserveAspectRatio` when needed.
- Put shared definitions in `<defs>`: gradients, filters, clipPath, pattern, path (for reuse).
- Use meaningful `id`s for defs. Reference with `url(#id)`.

## Sprite and symbol reuse

- Use `<symbol id="...">` in `<defs>` for reusable icons; instantiate with `<use href="#id">` (prefer `href` over deprecated `xlink:href`).
- Use `currentColor` for fill/stroke on icons so they inherit text color.
- When bundling multiple icons into a sprite, use SVGO `prefixIds` to avoid ID collisions.

## Optimization

- Optimize with SVGO v4 (`npx svgo` or `bunx svgo`). SVGO v4 preserves `viewBox` and `title` by default.
- **Inline vs standalone:** Inline SVG can omit `xmlns` and XML prolog. Standalone `.svg` files need `xmlns="http://www.w3.org/2000/svg"`. Use `width` and `height` when size is known to avoid layout shift (CLS).

## Gradients and filters

- **Gradients:** `linearGradient`, `radialGradient`. Use `stop` elements; reference in `fill` or `stroke`.
- **Filters:** `feGaussianBlur`, `feMerge`, `feColorMatrix` for effects. Keep filter region (`x`, `y`, `width`, `height`) reasonable.
- **ClipPath:** For masking or rounded corners.

## SVG animation

- **SMIL:** `<animate>`, `animateTransform`, `animateMotion`. Use `attributeName`, `values`, `dur`, `repeatCount`. Stagger with `begin`.
- **CSS:** Animate `fill`, `stroke`, `opacity`, `transform` via `@keyframes` or transitions.
- **Path motion:** Use `<path id="...">` with `<animateMotion><mpath href="#..."/></animateMotion>` for motion along paths.
- **Pattern animation:** Animate `y` or `x` on pattern for scanline/rolling effects.

## Example reference (pnCore logo)

See `assets/pn-logo.svg` for patterns used in this plugin:

- **For logos:** Treat pn-logo as the minimum quality benchmark. Generated logos should include: defs (gradients/filters), layering, and either custom typography or a distinctive symbol. Avoid flat rect + text unless specifically requested.
- **Defs:** radial/linear gradients, filters (blur, merge), clipPath, patterns (dot grid, scanlines), reusable paths.
- **SMIL:** `animate` (stop-color, opacity, r, stroke-dashoffset), `animateMotion` (circles on circular paths), `animateTransform` (rotate).
- **Layering:** background → decorative shapes → animated elements → text → overlays (glass, CRT effects).
- **Text in SVG:** `@font-face` in `<style>`, `text` with `font-family`, `text-anchor`. External font URLs trigger network requests; consider self-hosting or system fonts for simpler icons.

## Accessibility

- Add `role="img"` and `aria-label` (or `<title>`) for standalone informative SVGs.
- For icons in buttons/links, prefer `aria-hidden="true"` and label the parent.

## Output

- Clean, well-structured SVG with defs for reuse.
- **prefers-reduced-motion:** CSS animations: use `@media (prefers-reduced-motion: reduce)` to disable or simplify. SMIL animations do not respond to CSS; use JavaScript (e.g. `matchMedia`) to detect reduced motion and remove SMIL elements or set `dur="0"` when user prefers reduced motion.
- **Browser compatibility:** Test in Safari; some SVG 2.0 features have weaker support in WebKit.
