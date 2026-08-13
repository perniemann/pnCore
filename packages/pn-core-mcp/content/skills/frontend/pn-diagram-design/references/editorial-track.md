# Editorial track

Self-contained HTML with inline SVG and CSS. Load this **and** the chosen `type-*.md`. Start from [../assets/example-architecture.html](../assets/example-architecture.html).

## Tokens

CSS variables on `:root` from `.pncore-design.md`: `--paper`, `--ink`, `--muted`, `--accent`, `--link`. Fonts: distinctive display + sans + mono from the project file. **Do not default to Geist, Inter, Roboto, Arial, or Space Grotesk.**

## Layout

- **4px grid:** coordinates, widths, heights, gaps, font sizes divisible by 4 (stroke widths 0.8/1/1.2 exempt).
- Draw **arrows before boxes**. Opaque paper mask on each node so lines do not bleed through.
- **Orthogonal elbows** (`r=8`) between off-axis nodes. No diagonal connectors.
- Arrow labels: opaque mask, 6–10px gap above the stroke, never on the line.
- Fan attach points on a shared edge (≥12px apart). Offset parallel strokes.
- Legend as a **bottom strip**, not inside the drawing. Expand `viewBox` for it.
- Accent on **1–2** focals (`accent` fill/stroke). Everything else `ink`/`muted`.

## A11y

```html
<svg role="img" aria-labelledby="slug-title slug-desc" viewBox="0 0 800 480">
  <title id="slug-title">…</title>
  <desc id="slug-desc">…</desc>
```

Prefix IDs per file. `<title>` is the first child. Desc describes content, not geometry. Static default; if motion is requested, Reveal/Orient only and honor `prefers-reduced-motion`.

## File

One `.html`: embedded CSS, inline SVG, no JS unless the user asked for motion. Google Fonts (or self-hosted) allowed; no other network. Then `get_skill("pn-html-preview")`.

## Taste gate (before write)

Run the D-01–D-10 table in `pn-core://reference/diagram-baseline.md` (visual tier). After write: `pn-html-preview` → `pn-render-verify` → `pn-skeptic-challenge`.
