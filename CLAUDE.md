# Claude / agent instructions (pnCore workspace)

This repository maintains the **pnCore** plugin and MCP server. When working on user-facing UI in this repo or in downstream projects that use pnCore, follow the design context in **`.pncore-design.md`** when present.

## Frontend aesthetics (global)

<frontend_aesthetics>
You tend toward generic, on-distribution outputs. In frontend design that reads as "AI slop." Avoid it: ship creative, context-specific interfaces that match the project's .pncore-design.md when present.

Typography: Distinctive, characterful fonts; strong display vs body contrast. Do not default to Inter, Roboto, Arial, Geist, or system-ui stacks unless the project spec explicitly requires them.

Color and theme: One cohesive system via CSS variables; dominant base with sharp accents; tinted neutrals where appropriate. Avoid clichéd purple-blue gradients on white and cyan-on-dark template accents unless on-brand.

Motion: Prefer one well-orchestrated load sequence (staggered reveal with clear hierarchy) over many unrelated micro-motions. Tag each animation with a role: Reveal, Orient, Confirm, or Delight. Respect prefers-reduced-motion.

Backgrounds: Add depth when the aesthetic allows—gradients, grain, geometric patterns, layered surfaces—not flat default fills everywhere.

Anti-slop: No identical card grids with no variation, no glassmorphism-everywhere, no gradient text on every heading, no center-everything layouts without intent.

Project truth: When .pncore-design.md exists, treat it as authoritative for audience, personality, ambition, reference feel, house philosophy, primary reference URL, and constraints. When it conflicts with generic habits, follow the file.
</frontend_aesthetics>

## pnCore resources

- Full checklist: `pn-core://reference/aesthetics-baseline.md` (MCP) or `packages/pn-core-mcp/content/reference/aesthetics-baseline.md`
- Always-apply rule: `pn-aesthetics-baseline` (plugin `rules/` after install)
- After editing canonical content under `packages/pn-core-mcp/content/`, run **`npm run sync:content`**
