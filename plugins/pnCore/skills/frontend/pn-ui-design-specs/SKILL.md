---
name: pn-ui-design-specs
description: Design system specs, component handoff, tokens (color, typography, spacing). Use when creating design deliverables for developer handoff or establishing design foundations.
---

# UI design specs

## When to use

- Design system or component library specs for handoff.
- Design tokens (color, typography, spacing, shadows).
- Visual design specifications with measurements and usage guidelines.
- WCAG AA compliance specs.

## Workflow

1. **Tokens:** Color, typography, spacing, shadow systems.
2. **Components:** Variants, states (hover, disabled, loading, error).
3. **Responsive:** Breakpoints, layout behavior.
4. **Handoff:** Specs with measurements; export guidance for assets.

## Output path (project kickoff)

When used in project kickoff (pn-new Involved mode) and UI is in scope: save to `docs/UI.md`. Otherwise save to `docs/design/YYYY-MM-DD-<slug>-ui-spec.md` or as specified.

## Integration

- **pn-design-system** — Establish or audit design systems; this skill provides spec-creation patterns.
- **pn-frontend-developer** — Use when frontend work needs design specs or token definitions.
- **pn-new (Involved mode)** — When UI in scope, run this skill and save to `docs/UI.md`.
