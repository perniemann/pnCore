---
name: pn-evidence-qa
description: "Screenshot-based QA and visual proof for UI deliverables. Captures before/after states, cross-device views, and user journey evidence. Use for UI-heavy projects when visual verification is required."
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

6. **Timeline sampling (scroll-driven deliverables):** When the page uses scroll-triggered or scroll-linked motion (`pn-scroll-narrative`, pin/scrub, CSS `animation-timeline`), a single first-paint shot is not enough.
   - Sample about **6 positions**: document 0 / 20 / 40 / 60 / 80 / 100%, **or** six positions per pinned section.
   - Save a contact strip. Flag consecutive frames with no visible change (**dead travel**) unless the Narrative Map authored silence before the peak.
   - **Keyboard:** tab through interactive controls inside pinned sections. The focused control’s cue must be visible (not opacity 0 or parked at the wrong progress).
   - Judge type contrast against the **rendered** frame under the line, not the CSS token alone.
   - A green desktop pass does not cover iOS video, touch scrolling, or Low Power Mode. Say so.
   - **N-03 skip** (`marketing-ship-gate`): allowed only when the motion map lists **zero** scroll triggers. A sentence that says “no scroll-driven motion” is not enough if the map still has pins or scrub.

## Integration

- **pn-review-optimize-loop** — Optional evidence phase before reality check; run when UI is the primary deliverable.
- **pn-reality-check** — Uses evidence from this skill when certifying production readiness.
- **pn-testing-specialist** — Complements automated tests; evidence QA adds visual verification.
- **pn-browser-runtime-verify** — Use when the question is **runtime** (console, network, client behavior), not static layout only. Timeline sampling does not replace a console/network pass.
- **pn-scroll-narrative** — Narrative Map + feel-check; this skill supplies the contact strip and pinned-keyboard evidence.

## Output

- Screenshot inventory with paths and descriptions
- User journey assessment (PASS/FAIL) with evidence
- Performance metrics when captured
- Issues found with screenshot references
