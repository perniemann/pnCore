---
name: pn-diagram
description: Create an architecture, flowchart, sequence, loop, or layer-stack diagram as Mermaid-in-docs or self-contained HTML/SVG. Use when the user asks for a diagram, schematic, or flywheel. Does not import draw.io or redraw existing Mermaid files.
---

# pn-diagram

**Start every response with:** `[pn-command] 🔺`

Single entry for diagrams. Load `get_skill("pn-diagram-design")` and `pn-core://reference/diagram-baseline.md` (or the synced plugin copy). Follow the skill; this command only routes the track.

## Flow

1. **Clarify track** if unstated: **Mermaid** (docs/plans) or **editorial HTML** (shareable visual). Use `ask_question` when available. Default: Mermaid when the user is already in a plan/doc; HTML when they want a file to open or screenshot.

2. **Do not import.** If the user points at `.drawio`, `.mmd`, or “redraw this Mermaid,” say import-redraw is out of v1 and offer a fresh diagram from the described content.

3. **Run the skill workflow:** skip-if-prose → tokens from `.pncore-design.md` → pattern then type → confirm type/track/cuts → load the matching `type-*.md` plus mermaid-track or editorial-track.

4. **Write the deliverable.**
   - Mermaid: fenced block with `accTitle` and `accDescr`, into the file the user is editing or `docs/plans/` / the current doc.
   - HTML: self-contained file. Then `get_skill("pn-html-preview")` to save under `html_outputs/` (or `docs/<workflow>/` if they asked to commit it) and open it.

5. **Ship gate (mandatory — same bar as `pn-preflight` / SVG skeptic).** Load `pn-core://reference/diagram-baseline.md` **Ship gate**. Emit the D-01–D-10 PASS/FAIL table. **`DIAGRAM: NO-GO`** → fix and re-run; do not declare done.

   - **Mermaid:** `get_skill("pn-skeptic-challenge")` in post-build mode on the markdown file. Gate on confirmation.
   - **Editorial HTML:** `get_skill("pn-render-verify")` on the saved HTML, then `get_skill("pn-skeptic-challenge")` with that verdict as evidence. Gate on confirmation.

   Do not skip skeptic. Do not substitute a one-line “looks good.”

6. **Output:** path, type, track, tokens used, cuts, D-table verdict, skeptic verdict.

## See also

- **`pn-diagram-design`** — Full procedure and type refs.
- **`pn-svg-creator`** — Logos and icons, not diagrams.
- **`pn-html-preview`** — Save and open editorial HTML.
- **`pn-preflight`** — Same PASS/FAIL job for marketing UI (P-01–P-15).
- **`pn-skeptic-challenge`** / **`pn-render-verify`** — Post-build gates on `/pn-diagram`.
