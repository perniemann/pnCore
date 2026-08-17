# Mermaid track

Use for plans, ADRs, docs, and chat. Load this **and** the chosen `type-*.md`.

## Required a11y

First lines inside the diagram (after the diagram keyword) must include:

```text
accTitle: Short name of the subject
accDescr: One sentence of what it shows (relationships, not “boxes and arrows”)
```

Mermaid emits SVG `title`/`desc` from these. Do not comment them out (`%%accTitle` is invalid).

## Density

State the type. Keep ~9 nodes / ~12 edges. Split overview + detail instead of packing. Skip the diagram if a list is enough.

## Syntax that survives renderers

- Node IDs: camelCase or underscores; no spaces in IDs. Labels in quotes or brackets.
- Avoid Mermaid reserved words as IDs (`end`, `subgraph`, `graph`).
- Edge labels in quotes when they contain parentheses or colons.
- Subgraphs for zones; do not nest more than two levels.
- Prefer `flowchart` / `sequenceDiagram` / `stateDiagram-v2`. Do not depend on experimental types. `quadrantChart` is allowed when the host renders it; otherwise a 2×2 subgraph flowchart.

Cursor **CreatePlan** diagrams have extra syntax constraints (no spaces in node IDs, quoted edge labels with special characters). Honor those when the host is plan-mode; they do not replace `accTitle`/`accDescr`.

## Audience wording

`engineer` keeps ports and protocol names. `mixed` drops ports. `executive` names jobs (“sign-in”), not implementations (“JWT RS256”). Default `mixed` unless the surrounding doc is an ADR or implementation plan.

## Ship gate

Emit D-01–D-10 (`diagram-baseline.md`). Embedded in a plan: **standard** (table only). `/pn-diagram` deliverable: **strict** (table + `pn-skeptic-challenge` on the markdown file).

## Anti-patterns

Rainbow node fills; every node a stadium shape; 20-node hairballs; missing accTitle; using Mermaid when the user asked for a shareable HTML visual (switch to editorial-track).
