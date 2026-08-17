# Design Context

> Copy to project root as `.pncore-design.md` and edit. Generated from pn-setup or hand-maintained.
> Last updated: YYYY-MM-DD

## Audience

Who uses this product and in what context?

## Job to Be Done

Primary user goal; secondary goals.

## Brand Personality

2–3 words and a short tone description.

## Visual Ambition

One of: Functional / Polished / Distinctive / Award-worthy

## Reference Feel

Products, sites, or eras that match the vibe (optional).

## House philosophy (optional)

Principles every surface should obey across your work (e.g. typographic discipline, restrained motion, editorial spacing). Use for multi-repo consistency.

## Primary reference URL (optional)

Canonical site that sets the bar for craft (portfolio or flagship product). Agents use this as the aesthetic anchor when the spec allows.

## Tuning dials (optional)

Persist marketing UI defaults (integers 1–10). Agents still emit a Design Read; use these when the brief does not override.

- **DESIGN_VARIANCE:** (e.g. 7)
- **MOTION_INTENSITY:** (e.g. 6)
- **VISUAL_DENSITY:** (e.g. 4)

See `pn-core://reference/design-intent.md`.

## Diagram tokens (optional)

Derived from brand colors/fonts or **Primary reference URL** — do not add a second style-guide file. Used by `pn-diagram-design` for editorial HTML/SVG.

- **paper:** (page / SVG background)
- **ink:** (stroke and labels)
- **muted:** (secondary labels, default arrows)
- **accent:** (1–2 focals only)
- **link:** (external / HTTP edges)

Leave blank to derive on first editorial diagram (agent asks once).

## Constraints

- Framework: (e.g. Next.js, Astro, vanilla)
- Component library: (e.g. shadcn, none)
- Brand colors/fonts: (tokens, hex, or “none yet”)
- Dark mode: (required / optional / no)

---

## Example: filled-out block (editorial / craft-forward)

A starting point for projects that want an authored, restrained look. Replace specifics with your own; delete sections that do not apply.

```markdown
## Audience

Technical builders and design-conscious product teams using AI-assisted tooling.

## Job to Be Done

Ship interfaces and docs that feel intentional, fast, and unmistakably authored — not templated.

## Brand Personality

Precise, confident, warm-minimal; craft-forward without ornament for its own sake.

## Visual Ambition

Distinctive to Award-worthy for public surfaces; Polished minimum for internal tools unless stated otherwise.

## Reference Feel

Editorial spacing, strong type hierarchy, purposeful motion. No stock “AI landing” tropes (gradient blobs, generic robot/sparkle icons, glassmorphic everything).

## House philosophy

- Typography leads hierarchy; color supports it — not the reverse.
- One orchestrated entrance on key pages; no scattershot micro-motion.
- Tokens and CSS variables for all semantic color/spacing/type; no one-off magic numbers in components.
- Accessible by default: contrast, focus, targets, reduced-motion.

## Primary reference URL

(your portfolio or flagship product, if you maintain one — otherwise leave blank)

## Diagram tokens (optional)

- paper: (from brand background)
- ink: (from brand text)
- muted: (from brand secondary)
- accent: (from brand accent — one hue)
- link: (from brand link, or ink)

## Constraints

- Framework: (set per project)
- Component library: (set per project)
- Brand colors/fonts: define tokens here, or "(none yet)"
- Dark mode: follow project spec
```
