---
title: "ADR-0011: Native diagram quality layer (adapt, do not vendor)"
updated: 2026-08-13
---

# ADR-0011: Native diagram quality layer (adapt, do not vendor)

## Status

Accepted

## Context

pnCore already owns brand context (`.pncore-design.md`), UI aesthetics (`pn-aesthetics-baseline`), SVG creation (`pn-svg` / `pn-svg-creator`), and HTML preview. Agents still emit generic Mermaid boxes or treat diagrams as logos. [diagram-design](https://github.com/cathrynlavery/diagram-design) (Cathryn Lavery, MIT) is a complete editorial-diagram skill: deletion philosophy, semantic pattern then visual type, brand tokens, accessible SVG, and a 27-type HTML gallery.

Vendoring that plugin would conflict with pnCore’s font bans (Geist is a default there), duplicate the SVG/HTML pipeline, and dump a large always-on skill into context. pn-skeptic (2026-08-13) also rejected an all-markdown glob, a 14-file weave, and advertising import-redraw before extractors exist.

## Decision

**v1 (this ADR):**

1. Native rewrite in pnCore voice. Credit the source; do not paste their `SKILL.md` or ship Geist + atomic-tangerine as house defaults.
2. Two output tracks: **Mermaid-in-docs** (plans, ADRs, docs) and **editorial HTML/SVG** (shareable visuals). Tokens map from `.pncore-design.md` (`paper`, `ink`, `muted`, `accent`, `link`).
3. Progressive disclosure: thin `pn-diagram-design` skill + `pn-core://reference/diagram-baseline.md` + on-demand type refs (architecture, flowchart, sequence, loop, layers). One branded HTML example.
4. Command `/pn-diagram` routes Mermaid vs editorial HTML only. **No import-redraw in v1.** After write, emit the **D-01–D-10 ship gate** (`diagram-baseline.md`). `/pn-diagram` then runs `pn-skeptic-challenge` (and `pn-render-verify` on editorial HTML). Embedded plan Mermaid uses **standard** tier (D-table only; parent plan skeptic covers the rest). Same PASS/FAIL + skeptic shape as `pn-preflight` / `svg_create`.
5. Rule `pn-diagrams` is **not** always-apply. Glob is `docs/plans/**`, `html_outputs/**`, `**/*.{mmd,mermaid}` only.
6. Weave five surfaces: aesthetics-baseline, mcp-proactive + RUNBOOK, pn-writing-plans, pn-documentation, pn-svg-creator (diagram type routes here).

**Non-goals (v1):** draw.io/Mermaid extractors, 27-type gallery, geometry linter, sketchy/terminal skins, new `workflowType`, remaining skill weaves.

**Gate parity (same release):** `image_create` gains post-generate `pn-render-verify` + `pn-skeptic-challenge` (parity with `svg_create`). `pn-frontend-design`, `pn-svg-creator`, and `pn-image-creator` ship EVAL.yaml (preflight GO/NO-GO lives on the frontend-design suite because `pn-preflight` is a command).

**Attribution:** Deletion-first density, pattern-then-type routing, output dials, and accessible SVG contracts are restated for pnCore. Original plugin: MIT License, Copyright (c) 2025 Cathryn Lavery.

## Consequences

- **Positive:** Diagrams inherit project brand; Mermaid in plans gets a quality bar (`accTitle`/`accDescr`, type pick, skip-if-prose, D-table); `/pn-diagram` cannot declare done without skeptic (and render-verify on HTML); raster `image_create` matches SVG skeptic.
- **Negative:** Agents without the skill still draw generic Mermaid. Mitigation: trigger-rich description + proactive map + narrow glob on plan files + EVAL without-skill baselines.
- **Audit:** ADR-0002 quarterly pass includes `diagram-baseline.md` and `pn-diagram-design`.

## v1 success criteria

A plan Mermaid includes `accTitle`/`accDescr`, stays within the density budget, and emits a D-01–D-10 table; `/pn-diagram` HTML also runs `pn-html-preview` → `pn-render-verify` → skeptic; an editorial HTML example opens offline, uses CSS variables (not Geist defaults), and has `role="img"` with prefixed `<title>`/`<desc>`.

## References

- [ADR-0005: Taste parity](0005-design-skill-taste-parity.md) — same adapt-not-vendor pattern
- [diagram-design](https://github.com/cathrynlavery/diagram-design)
- `packages/pn-core-mcp/content/reference/diagram-baseline.md`
- `packages/pn-core-mcp/content/skills/frontend/pn-diagram-design/SKILL.md`
