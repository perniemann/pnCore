---
name: pn-evidence-qa
description: Screenshot-based QA and visual proof for UI deliverables. Captures before/after states, cross-device views, and user journey evidence. Use for UI-heavy projects when visual verification is required.
---

# Evidence QA

## When to use

- UI testing, visual verification, or bug documentation.
- When pn-reviewer or pn-reality-check requires visual evidence for certification.
- Before claiming "production ready" on frontend or design deliverables.
- User journey validation (navigation, forms, interactions).

## Workflow

1. **Capture strategy:** Identify key screens and user flows to document. Plan desktop, tablet, and mobile views when responsive.

2. **Screenshot evidence:**
   - Full-page captures per breakpoint (responsive-desktop, responsive-tablet, responsive-mobile)
   - Interaction sequences: before/after for clicks, form fills, accordions, modals
   - Error states, loading states, empty states when applicable

3. **Automation (when available):** Use Playwright, Cypress, or similar for headless screenshot capture. Save to `public/qa-screenshots/` or project-defined path. Include `test-results.json` for metrics (load times, interaction status).

4. **Cross-validation:** Compare screenshots to claimed features. Flag mismatches between description and visual reality.

5. **Report format:**
   - List all screenshots captured with paths
   - Describe what each shows (honest assessment)
   - Note layout behavior, interactive elements, performance indicators
   - PASS/FAIL per user journey with evidence references

## Integration

- **pn-review-optimize-loop** — Optional evidence phase before reality check; run when UI is the primary deliverable.
- **pn-reality-check** — Uses evidence from this skill when certifying production readiness.
- **pn-testing-specialist** — Complements automated tests; evidence QA adds visual verification.
- **pn-browser-runtime-verify** — Use when the question is **runtime** (console, network, client behavior), not static layout only.

## Output

- Screenshot inventory with paths and descriptions
- User journey assessment (PASS/FAIL) with evidence
- Performance metrics when captured
- Issues found with screenshot references
