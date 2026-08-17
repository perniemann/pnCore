---
title: "ADR-0011: Native diagram quality layer (adapt, do not vendor)"
updated: 2026-08-13
---

# ADR-0011: Native diagram quality layer (adapt, do not vendor)

## Status

Accepted

## Context

pnCore already owns brand context (`.pncore-design.md`), UI aesthetics (`pn-aesthetics-baseline`), SVG creation (`pn-svg` / `pn-svg-creator`), and HTML preview. Agents still emit generic Mermaid boxes or treat diagrams as logos. [diagram-design](https://github.com/cathrynlavery/diagram-design) (Cathryn Lavery, MIT) is a complete editorial-diagram skill: deletion philosophy, semantic pattern then visual type, brand tokens, accessible SVG, and a 27-type HTML gallery.

Vendoring that plugin would conflict with pnCore’s font bans (Geist is a default there), duplicate the SVG/HTML pipeline, and dump a large always-on skill into context.

## Decision

**Native layer (this ADR):**

1. Native rewrite in pnCore voice. Credit the source; do not paste their `SKILL.md` or ship Geist + atomic-tangerine as house defaults. Map fonts and colors through `.pncore-design.md`.
2. Two output tracks: **Mermaid-in-docs** (plans, ADRs, docs) and **editorial HTML/SVG** (shareable visuals). Tokens map from `.pncore-design.md` (`paper`, `ink`, `muted`, `accent`, `link`).
3. Progressive disclosure: thin `pn-diagram-design` skill + `pn-core://reference/diagram-baseline.md` + on-demand type refs. Types pnCore emits with a template: architecture, flowchart, sequence, state, loop, quadrant, layers, process, data-flow, org-chart. Remaining gallery types are a **routing row** (nearest Mermaid/editorial grammar) — not a 27-type HTML pack.
4. Command `/pn-diagram` routes **Mermaid**, **editorial HTML**, or **import-redraw**. Import-redraw keeps components and relationships, discards source layout/palette, and reports a **fidelity ledger**. No Python/draw.io extractors — pasted Mermaid, described structure, or readable markdown is enough. After write, emit the **D-01–D-10 ship gate** (`diagram-baseline.md`). `/pn-diagram` then runs `pn-skeptic-challenge` (and `pn-render-verify` on editorial HTML). Embedded plan Mermaid uses **standard** tier (D-table only; parent plan skeptic covers the rest).
5. Rule `pn-diagrams` is **not** always-apply. Globs: markdown, HTML, and `.mmd`/`.mermaid` sources. The rule stays thin (deletion, load the skill, brand tokens).
6. Weave diagram quality through the surfaces in the incorporation plan: aesthetics-baseline, mcp-proactive + RUNBOOK, writing-plans, documentation, create-design-doc, create-workflow-roadmap, cx-agent-patterns, pn-svg / pn-svg-creator, pn-assets + pn-assets-manager, human-facing-artifacts, pncore-design example + pn-setup, pn-frontend-developer, best-practices, skills catalog.

**Non-goals:** draw.io/Mermaid file extractors, 27-type gallery, geometry linter, sketchy/terminal skins, pinned motion JS, 100KB icon dump, new `workflowType`. `svg_create` stays logos/icons.

**Gate parity:** `image_create` post-generate `pn-render-verify` + `pn-skeptic-challenge` (parity with `svg_create`). `pn-frontend-design`, `pn-svg-creator`, and `pn-image-creator` ship EVAL.yaml.

**Attribution:** Deletion-first density, pattern-then-type routing, output dials, and accessible SVG contracts are restated for pnCore. Original plugin: MIT License, Copyright (c) 2025 Cathryn Lavery.

## Consequences

- **Positive:** Diagrams inherit project brand; Mermaid in plans gets a quality bar (`accTitle`/`accDescr`, type pick, skip-if-prose, D-table); `/pn-diagram` cannot declare done without skeptic (and render-verify on HTML); import-redraw is a redraw with a ledger, not a converter.
- **Negative:** A markdown glob still loads a thin rule on many files. Mitigation: `alwaysApply: false`, short rule body, type refs loaded only after selection.
- **Audit:** ADR-0002 quarterly pass includes `diagram-baseline.md` and `pn-diagram-design`.

## Success criteria

A plan Mermaid includes `accTitle`/`accDescr`, stays within the density budget, and emits a D-01–D-10 table; `/pn-diagram` HTML also runs `pn-html-preview` → `pn-render-verify` → skeptic; an editorial HTML example opens offline, uses CSS variables (not Geist defaults), and has `role="img"` with prefixed `<title>`/`<desc>`; an import-redraw reports a fidelity ledger without running an extractor.

## References

- [ADR-0005: Taste parity](0005-design-skill-taste-parity.md) — same adapt-not-vendor pattern
- [diagram-design](https://github.com/cathrynlavery/diagram-design)
- `packages/pn-core-mcp/content/reference/diagram-baseline.md`
- `packages/pn-core-mcp/content/skills/frontend/pn-diagram-design/SKILL.md`
