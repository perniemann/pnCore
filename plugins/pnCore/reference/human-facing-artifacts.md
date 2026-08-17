# Human-facing workflow artifacts (HTML, canvas, markdown)

Canonical guidance for **project-local outputs** from orchestration (not for pnCore’s own `content/` skills and MCP reference, which stay markdown).

## When agents SHOULD offer richer than plain markdown

For these **subset** classes of deliverable, the default stance is **SHOULD** produce a **human-optimized** artifact (not **MUST** — user may opt for markdown for speed or simpler review):

- Exploration and option comparison (layouts, side-by-side tradeoffs)
- Implementation plan packaging (timeline, mockups, data-flow, snippets)
- PR / code review explainers (annotated diffs, severity, navigation)
- Reports for others (status, incident, research synthesis)
- **Editorial diagrams** (architecture, sequence, strategy visuals) as self-contained HTML/SVG via `pn-diagram` / `pn-diagram-design` — not Mermaid screenshots when the artifact must leave the IDE

Do **not** substitute HTML for **machine-facing** artifacts: workflow state fields, gate tickets, terse `taskResults` summaries, JSON handoffs, or anything a downstream automated step must parse quickly. Keep those **markdown or structured text** unless the user explicitly wants otherwise.

## Canvas (Cursor) vs HTML (portable)

| Context | SHOULD use |
|--------|------------|
| User is in **Cursor** and the output is **IDE-bound** (analytical layout, data the user inspects beside chat) | **Cursor Canvas** (`.canvas.tsx`) when Cursor's built-in `canvas` skill is available in the session — spatial tables and charts belong there, not in chat markdown. The canvas skill ships with Cursor itself, **not** with pnCore; if `get_skill("canvas")` is unavailable, fall back to single-file HTML. |
| The output must **leave the IDE** (email attachment, shareable URL, reviewer without Cursor, S3/static hosting) | **Single-file HTML** artifact in the project repo or agreed folder. |

**Path convention:** Use `html_outputs/` for **previews and one-off iteration** (not committed by default); use `docs/<workflow>/<slug>.html` for **workflow deliverables that should be committed and discoverable** (e.g. `docs/strategy/[slug]-strategy-brief.html`).

## Orchestration continuity (full_dev and automated handoffs)

- **full_dev / orchestrated flows:** When a step in the subset above produces HTML (or a large visual plan), agents **SHOULD also** emit a **short companion digest** for the next step: decisions, file paths, risks, and “what to do next” in concise markdown or equally scannable structured text. That keeps downstream specialists and resumed sessions from having to parse tags.
- **Standalone user request** (no automated consumer in the same run): **HTML-only** (or canvas-only) is acceptable without a separate digest.

## Tradeoffs (call out when recommending HTML)

- HTML is often **slower to generate** than markdown and **git diffs are noisier**.
- Prefer **self-contained** files (inline CSS/JS, no `fetch` to third parties) when security and offline use matter.

## Examples and prompts

Illustrative patterns and example prompts: [The unreasonable effectiveness of HTML — examples](https://thariqs.github.io/html-effectiveness/).

## Related

- `pn-core://reference/RUNBOOK.md` — orchestrator quick reference (this document is linked from there).
- Project **best practices** and a11y: `pn-core://reference/best-practices.md`.
- Editorial diagrams as an HTML deliverable class: `pn-core://reference/diagram-baseline.md`.
