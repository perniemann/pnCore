# Diagram baseline (pnCore)

Canonical floor for **diagrams** (Mermaid in docs, editorial HTML/SVG). Brand tokens come from **`.pncore-design.md`**. UI chrome still follows [`aesthetics-baseline.md`](aesthetics-baseline.md); this file is the diagram-specific bar so agents do not emit generic rounded-box slop.

**Resource:** `pn-core://reference/diagram-baseline.md`

**Deep implementation:** `get_skill("pn-diagram-design")`, command `pn-diagram`. Preview HTML with `get_skill("pn-html-preview")`. Ship gate below matches `pn-preflight` / `marketing-ship-gate.md` for UI and skeptic-on-output for SVG.

Informed by [diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT); rewritten for pnCore. Do not copy Geist / Instrument Serif / atomic-tangerine as house defaults.

## When not to draw

Skip the diagram when a sentence, bullet list, or table communicates the same thing. One box with a label is a sentence.

## Tracks

| Track | Use when | Output |
|-------|----------|--------|
| **Mermaid-in-docs** | Plans, ADRs, design docs, READMEs, in-chat architecture | Fenced `mermaid` with `accTitle` and `accDescr` |
| **Editorial HTML/SVG** | Slides, strategy briefs, marketing, shareable visuals | Self-contained `.html` (inline CSS + SVG). Save via `pn-html-preview` |

Do not chase SVG connector geometry in Mermaid. Do not paste Mermaid renderer layout into editorial SVG.

## Tokens

Read `.pncore-design.md` **Constraints → Brand colors/fonts**. Map to:

| Role | Meaning |
|------|---------|
| `paper` | Page / SVG background |
| `ink` | Primary stroke and labels |
| `muted` | Secondary labels, default arrows |
| `accent` | 1–2 focal nodes or the headline path |
| `link` | External / HTTP edges only |

If those tokens are missing, ask once (onboard from the file, paste hex, or proceed with a **non-Geist** distinctive pair). Never silent-ship a tangerine+Geist skin into a branded repo.

## Density (proxy, not a score)

Aim for a diagram a reader can parse without a legend tour. **About 9 nodes / 12 edges** is the split point — overview + detail, not a denser drawing. `4/10` density is a feel check, not a metric to game. Accent at most two elements.

## Type picker

| Showing… | Type | Mermaid | Load |
|----------|------|---------|------|
| Components and connections | **Architecture** | `flowchart` | `type-architecture.md` |
| Decision branches | **Flowchart** | `flowchart` | `type-flowchart.md` |
| Messages over time | **Sequence** | `sequenceDiagram` | `type-sequence.md` |
| Flywheel / reinforcing cycle | **Loop** | `flowchart` | `type-loop.md` |
| Stacked abstractions | **Layers** | `flowchart` + subgraphs | `type-layers.md` |

If behavior is the point, pick a **semantic pattern** first (see the skill’s `semantic-patterns.md`), then the nearest type above.

## Mermaid a11y

Every fenced diagram includes:

```text
accTitle: Short name of the subject
accDescr: One sentence of what the diagram shows (content, not geometry)
```

## Editorial a11y

`<svg role="img" aria-labelledby="<slug>-title <slug>-desc">` with prefixed `<title>` and `<desc>` as first children (before `<defs>`). Describe content, not box positions. Decorative marks: `aria-hidden="true"`.

## Anti-patterns

- Dark-mode cyan/purple glow “tech” look
- Mono font on human-readable node names
- Identical boxes, no hierarchy
- Accent on every node
- Diagonal spaghetti connectors (editorial track: orthogonal elbows)
- Legend inside the drawing
- Shadows as the only depth
- Reproducing Mermaid’s automatic layout in SVG

## Motion

Static is the default. If motion is requested, it is **Reveal** or **Orient** only (`pn-animation`); `prefers-reduced-motion` shows the complete static frame.

## Ship gate (required before done)

Mechanical PASS/FAIL — same job as `pn-preflight` for marketing UI. Emit the table. End with **`DIAGRAM: GO`** or **`DIAGRAM: NO-GO`**. On NO-GO, do not declare done until fixes land (or the user explicitly accepts risk).

### Tiers

| Context | Tier | Extra gates |
|---------|------|-------------|
| Mermaid embedded in a plan/ADR/doc (parent command owns skeptic) | **standard** | D-table only |
| `/pn-diagram` Mermaid as the deliverable | **strict** | D-table + `pn-skeptic-challenge` on the markdown artifact |
| Editorial HTML/SVG | **visual** | D-table + `pn-html-preview` + `pn-render-verify` + `pn-skeptic-challenge` |

### Checklist

| ID | Check | FAIL when |
|----|-------|-----------|
| D-01 | Skip-if-prose | A sentence, list, or table already says the same thing |
| D-02 | Type declared | Type is not one of architecture / flowchart / sequence / loop / layers |
| D-03 | Density | More than ~9 nodes or ~12 edges with no overview+detail split |
| D-04 | Accent | More than two accent focals |
| D-05 | A11y | Mermaid missing `accTitle`/`accDescr`, or SVG missing prefixed `<title>`/`<desc>` + `role="img"` |
| D-06 | Brand tokens | Editorial HTML uses Geist/Inter/Roboto/Space Grotesk or canned tangerine without `.pncore-design.md` |
| D-07 | No import | Agent parsed or “redraw from” `.drawio` / existing Mermaid instead of a fresh diagram |
| D-08 | Anti-slop | Cyan/purple glow skin, identical boxes with no hierarchy, or accent on every node |
| D-09 | Editorial geometry | HTML track: diagonal connectors, legend inside the drawing, or labels sitting on strokes |
| D-10 | Preview | HTML track: no file saved via `pn-html-preview` |

D-06, D-09, D-10 are **N/A** (count as PASS) on Mermaid-in-docs.

### Visual track (editorial HTML)

After D-table PASS (or after fixing NO-GO):

1. `get_skill("pn-html-preview")` — file on disk.
2. `get_skill("pn-render-verify")` — structured verdict against type, tokens, a11y, density.
3. `get_skill("pn-skeptic-challenge")` in post-build mode — pass the render-verify verdict as evidence. Gate on confirmation. Do not skip.

### Strict Mermaid (`/pn-diagram`)

After D-table: `get_skill("pn-skeptic-challenge")` on the markdown file (cite path and bytes). Gate on confirmation. Do not skip.

## Workflow map

| Situation | Use |
|-----------|-----|
| User asks for a diagram | `get_command("pn-diagram")` then this ship gate |
| Plan or doc already drawing Mermaid | This baseline **standard** tier (D-table; parent skeptic covers the plan) |
| Type = diagram in SVG questionnaire | Route to `pn-diagram-design`, not logo generation |
