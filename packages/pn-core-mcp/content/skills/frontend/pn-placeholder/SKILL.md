---
name: pn-placeholder
description: Placeholder images for scaffolding and mockups. Use picsum.photos or placehold.co URLs; document as temporary in README. Use when quick fill imagery is needed during scaffold.
---

# Placeholder images

## When to use

- Scaffolding pages or components that need image slots.
- Quick mockups before real assets exist.
- "Just need something to show" during development.

## Services

- **picsum.photos** (photos): `https://picsum.photos/{width}/{height}` — random photos. Add `?random=1` for cache busting.
- **placehold.co** (solid/gradient): `https://placehold.co/{width}x{height}/{bg}/{text}` — e.g. `https://placehold.co/800x600/333/fff` for dark bg, white text.
- **SVG data-URI:** Inline SVG placeholder when no external URL desired (avoids third-party requests).

## Usage

- Add `src` and `alt` to `<img>`. For placeholders, use descriptive alt (e.g. `alt="Placeholder: hero image"`).
- Document in README: "Placeholder images from picsum.photos/placehold.co — replace before production."
- Prefer placeholder URLs over external APIs when placeholder suffices.
