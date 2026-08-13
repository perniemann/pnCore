---
name: pn-diagram-design
description: "Editorial diagrams as Mermaid-in-docs or self-contained HTML/SVG: architecture, flowchart, sequence, loop, layers. Deletion-first density, brand tokens from .pncore-design.md, accTitle/accDescr, accessible SVG. Use when drawing architecture, flowcharts, sequences, flywheels, layer stacks, or when a plan/doc needs a diagram instead of a table."
owner: pncore-maintainers
---

# Diagram design

Create diagrams that a reader can parse. Two tracks: Mermaid in markdown, or self-contained HTML with inline SVG. Tokens come from `.pncore-design.md`, not a canned tangerine/Geist skin.

Informed by [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT). Native rewrite — see [ADR-0011](../../../../../../docs/adr/0011-diagram-design-native-layer.md).

## When to use

- User asks for an architecture, flowchart, sequence, flywheel/loop, or layer-stack diagram.
- A plan, ADR, or design doc needs a visual that a paragraph cannot replace.
- `pn-svg-creator` purpose is **diagram** (not logo/icon).
- Editing `docs/plans/**`, `html_outputs/**`, or `.mmd`/`.mermaid` sources.

## Workflow

### 1. Do not draw

If a well-written paragraph or table is clearer, stop. One labeled box is a sentence.

### 2. Brand tokens

Read `.pncore-design.md`. Map brand colors/fonts to `paper`, `ink`, `muted`, `accent`, `link`. If missing on the **first editorial HTML** in a project, ask once: onboard from the file, paste tokens, or proceed with a distinctive **non-Geist** pair. Skip this pause for routine Mermaid in plans when the user already pinned type and content.

### 3. Pattern, then type

If the meaning is behavior (queue, policy trace, trust boundary, catalog of controls), load [references/semantic-patterns.md](references/semantic-patterns.md) and pick one pattern. Then pick a visual type:

| Showing… | Type | Load |
|----------|------|------|
| Components + connections | Architecture | [type-architecture.md](references/type-architecture.md) |
| Decision branches | Flowchart | [type-flowchart.md](references/type-flowchart.md) |
| Messages over time | Sequence | [type-sequence.md](references/type-sequence.md) |
| Reinforcing cycle / flywheel | Loop | [type-loop.md](references/type-loop.md) |
| Stacked abstractions | Layers | [type-layers.md](references/type-layers.md) |

Nearest-type only (no extra layout grammar): state → flowchart; org/tree → architecture; process/data-flow → architecture or flowchart; quadrant/timeline → say so and use Mermaid `flowchart` or a table.

**Always load the chosen `type-*.md` before drawing.**

### 4. Confirm, then draw

State in one line: type (and pattern if any), track (Mermaid vs HTML), and what you will cut. If the user is reachable, let them redirect; otherwise note assumptions.

Split rather than exceed ~9 nodes / ~12 edges / 2 accent elements.

### 5. Track

- **Mermaid-in-docs** → [references/mermaid-track.md](references/mermaid-track.md). Required: `accTitle`, `accDescr`.
- **Editorial HTML/SVG** → [references/editorial-track.md](references/editorial-track.md). Copy structure from [assets/example-architecture.html](assets/example-architecture.html). Preview with `get_skill("pn-html-preview")`. Static by default.

Import-redraw of draw.io / Mermaid files is **out of v1**. If asked, say so and offer a fresh redraw from the described content.

### 6. Ship gate (mandatory)

Follow **`pn-core://reference/diagram-baseline.md` Ship gate**. Emit D-01–D-10. On **`DIAGRAM: NO-GO`**, fix before skeptic.

When this skill is invoked via **`pn-diagram`** (the diagram is the deliverable):

- Mermaid → `get_skill("pn-skeptic-challenge")` on the markdown artifact; gate on confirmation.
- Editorial HTML → `get_skill("pn-render-verify")` then `get_skill("pn-skeptic-challenge")`; gate on confirmation.

When this skill is invoked from **`pn-writing-plans` / `pn-documentation`** (diagram is one section of a larger doc): **standard** tier — D-table only; the parent command’s skeptic covers the plan.

## Anti-patterns

Identical boxes; accent on every node; mono on human names; cyan/purple glow; diagonal SVG spaghetti; legend inside the drawing; Mermaid layout copied into SVG; Geist/Inter/Roboto unless `.pncore-design.md` names them.

## Example prompts

**Cold start:**
> Using `pn-diagram-design`, draw an architecture diagram of checkout: web client, API gateway, orders service, Postgres, Redis cache. Editorial HTML, brand tokens from `.pncore-design.md`.

**Warm start:**
> This plan has a 20-node Mermaid flowchart. Using `pn-diagram-design`, split it into overview + detail and add `accTitle`/`accDescr`.

**Format-specific:**
> Sequence of a bearer token refresh on 401 — Mermaid `sequenceDiagram` for the ADR, mixed audience wording.

**Iterate:**
> Drop the cache node; make the orders service the only accent; export the same diagram as editorial HTML.

## Integration

- **Used by:** `pn-diagram`, `pn-writing-plans`, `pn-documentation`, `pn-svg-creator` (diagram type), rule `pn-diagrams`.
- **Governed by:** `pn-core://reference/diagram-baseline.md`, `.pncore-design.md`.
- **Preview / verify:** `pn-html-preview`, then `pn-render-verify` + `pn-skeptic-challenge` on `/pn-diagram` visual track. Motion (optional): `pn-animation` Reveal/Orient only.
- **Not:** logo/icon generation (`pn-svg-creator`), raster heroes (`pn-image-creator`).
