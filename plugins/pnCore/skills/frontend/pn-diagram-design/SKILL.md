---
name: pn-diagram-design
description: "Editorial diagrams as Mermaid-in-docs or self-contained HTML/SVG: architecture, flowchart, sequence, state, loop, quadrant, layers, process, data-flow, org-chart. Deletion-first density, brand tokens from .pncore-design.md, accTitle/accDescr, accessible SVG, import-redraw with a fidelity ledger. Use when drawing architecture, flowcharts, sequences, state machines, flywheels, 2x2s, layer stacks, swimlanes, data pipelines, org charts, or when a plan/doc needs a diagram instead of a table."
owner: pncore-maintainers
---

# Diagram design

Create diagrams that a reader can parse. Two tracks: Mermaid in markdown, or self-contained HTML with inline SVG. Tokens come from `.pncore-design.md`, not a canned tangerine/Geist skin.

Informed by [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT). Native rewrite — see [ADR-0011](../../../../../../docs/adr/0011-diagram-design-native-layer.md).

## When to use

- User asks for an architecture, flowchart, sequence, state, loop, quadrant, layers, process, data-flow, or org-chart diagram.
- A plan, ADR, or design doc needs a visual that a paragraph cannot replace.
- `pn-svg` / `pn-svg-creator` purpose is **diagram** (not logo/icon).
- Editing markdown, HTML, or `.mmd`/`.mermaid` sources that will contain a diagram.
- User wants an existing diagram redrawn (pasted Mermaid or described nodes) — not a draw.io parser.

## Workflow

### 1. Do not draw

If a well-written paragraph or table is clearer, stop. One labeled box is a sentence. Highest-quality move is deletion; target density ~4/10.

### 2. Brand tokens

Read `.pncore-design.md`. Map brand colors/fonts (and optional **Diagram tokens**) to `paper`, `ink`, `muted`, `accent`, `link`. If missing on the **first editorial HTML** in a project, ask once: onboard from the file, paste tokens, derive from **Primary reference URL**, or proceed with a distinctive **non-Geist** pair. Skip this pause for routine Mermaid in plans when the user already pinned type and content.

### 3. Pattern, then type

If the meaning is behavior (queue, policy trace, trust boundary, catalog of controls), load [references/semantic-patterns.md](references/semantic-patterns.md) and pick one pattern. Then pick a visual type:

| Showing… | Type | Load |
|----------|------|------|
| Components + connections | Architecture | [type-architecture.md](references/type-architecture.md) |
| Decision branches | Flowchart | [type-flowchart.md](references/type-flowchart.md) |
| Messages over time | Sequence | [type-sequence.md](references/type-sequence.md) |
| States + transitions | State | [type-state.md](references/type-state.md) |
| Reinforcing cycle / flywheel | Loop | [type-loop.md](references/type-loop.md) |
| Two-axis positioning | Quadrant | [type-quadrant.md](references/type-quadrant.md) |
| Stacked abstractions | Layers | [type-layers.md](references/type-layers.md) |
| Multi-actor sequential workflow | Process | [type-process.md](references/type-process.md) |
| Sources → transforms → consumers | Data-flow | [type-data-flow.md](references/type-data-flow.md) |
| Ownership + routing | Org-chart | [type-org-chart.md](references/type-org-chart.md) |

**Routing row** (no extra template pack — name the nearest type and load that file):

| Ask for… | Nearest |
|----------|---------|
| Timeline | Flowchart LR, or a table |
| ER / data model | Architecture + a field table |
| Swimlane | Process |
| Tree / nested | Org-chart |
| Venn | Table (do not fake circles in Mermaid) |
| Pyramid / funnel / medallion | Layers |
| Consultant 2×2 | Quadrant |
| Radar / bar / line / gantt / scatter | Table or a chart — not this skill |
| IT current-state / high-level stack | Architecture |
| DP integration | Data-flow |
| DP security matrix | Layers or a table |

**Always load the chosen `type-*.md` before drawing.**

### 4. Confirm, then draw

State in one line: type (and pattern if any), track (Mermaid vs HTML vs import-redraw), size/detail/audience (`engineer` / `mixed` / `executive`), and what you will cut. If the user is reachable, let them redirect; otherwise note assumptions.

Split rather than exceed ~9 nodes / ~12 edges / 2 accent elements.

### 5. Track

- **Mermaid-in-docs** → [references/mermaid-track.md](references/mermaid-track.md). Required: `accTitle`, `accDescr`. Do not chase SVG connector geometry.
- **Editorial HTML/SVG** → [references/editorial-track.md](references/editorial-track.md). Copy structure from [assets/example-architecture.html](assets/example-architecture.html). Preview with `get_skill("pn-html-preview")`. Static by default.
- **Import-redraw** → keep components and relationships; discard source layout and palette. Redraw on Mermaid or editorial. Emit a **fidelity ledger** (Kept / Discarded / Uncertain). Do not invent a `.drawio` or XML extractor; if the user points at an export, ask for a pasted node list or Mermaid source.

### 6. Ship gate (mandatory)

Follow **`pn-core://reference/diagram-baseline.md` Ship gate**. Emit D-01–D-10. On **`DIAGRAM: NO-GO`**, fix before skeptic.

When this skill is invoked via **`pn-diagram`** (the diagram is the deliverable):

- Mermaid → `get_skill("pn-skeptic-challenge")` on the markdown artifact; gate on confirmation.
- Editorial HTML → `get_skill("pn-render-verify")` then `get_skill("pn-skeptic-challenge")`; gate on confirmation.

When this skill is invoked from **`pn-writing-plans` / `pn-documentation`** (diagram is one section of a larger doc): **standard** tier — D-table only; the parent command’s skeptic covers the plan.

## Anti-patterns

Identical boxes; accent on every node; mono on human names; cyan/purple glow; diagonal SVG spaghetti; legend inside the drawing; Mermaid layout copied into SVG; Geist/Inter/Roboto unless `.pncore-design.md` names them; converting a file instead of redrawing it.

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

- **Used by:** `pn-diagram`, `pn-writing-plans`, `pn-documentation`, `pn-create-design-doc`, `pn-create-workflow-roadmap`, `pn-cx-agent-patterns`, `pn-svg` / `pn-svg-creator` (diagram type), `pn-assets` (Diagram need), `pn-frontend-developer`, rule `pn-diagrams`.
- **Governed by:** `pn-core://reference/diagram-baseline.md`, `.pncore-design.md`.
- **Preview / verify:** `pn-html-preview`, then `pn-render-verify` + `pn-skeptic-challenge` on `/pn-diagram` visual track. Motion (optional): `pn-animation` Reveal/Orient only.
- **Not:** logo/icon generation (`pn-svg-creator`), raster heroes (`pn-image-creator`), draw.io extractors.
