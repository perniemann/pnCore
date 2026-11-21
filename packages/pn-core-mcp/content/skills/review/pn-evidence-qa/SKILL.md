---
name: pn-evidence-qa
description: "Visual and runtime proof for UI deliverables: screenshots before/after and across devices, plus console and network checks in a real browser. Use when UI work needs verification evidence."
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
- **Runtime questions** (console, network, client behavior): § Browser runtime verification below. Timeline sampling does not replace a console/network pass.
- **pn-scroll-narrative** — Narrative Map + feel-check; this skill supplies the contact strip and pinned-keyboard evidence.

## Output

- Screenshot inventory with paths and descriptions
- User journey assessment (PASS/FAIL) with evidence
- Performance metrics when captured
- Issues found with screenshot references

<!-- merged from pn-browser-runtime-verify (0.22.0) -->
## Browser runtime verification

### When to use

- Behavior depends on **runtime** (JS, network, timing, hydration), not just static HTML/CSS
- Bugs that do not reproduce in unit tests alone (CORS, wrong status codes, racey fetches)
- Performance suspicions (slow waterfalls, runaway requests, layout thrash)
- After meaningful changes to data fetching, auth cookies, or client-side routing

### When not to use

- Pure visual/layout sign-off against a spec — use the static workflow above (screenshots / Playwright captures)
- Non-browser surfaces (CLI, workers only) — use logs and tests

### Process

1. **Reproduce** in a running environment (dev or preview); note URL and steps.
2. **DOM / accessibility snapshot** — confirm elements, roles, and critical attributes match expectations (not "looks fine").
3. **Console** — zero unexpected errors or warnings for the exercised path; capture relevant messages.
4. **Network** — status codes, failed requests, duplicate calls, unexpected hosts; note HAR or request list summary.
5. **Performance (when relevant)** — profile or trace for the suspected issue; tie conclusions to observed data (long tasks, large payloads).
6. **Summarize evidence** — pass/fail per check with what you observed, not what you assumed.

When **Cursor IDE browser MCP** (or equivalent) is available, use it for navigation, snapshot, console, and network tooling rather than guessing from source.

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests are green; the browser is fine." | Integration gaps (real cookies, CSP, minify) still break production. |
| "I'll check the console if something fails." | Proactive console/network passes catch silent failures. |
| "Screenshot proves it works." | Screenshots hide 404s, console errors, and slow XHRs. |
| "DevTools is optional luxury." | For browser apps, runtime evidence is the ground truth. |

### Red flags — stop

- Claiming "no console errors" without opening console for the flow under test.
- Dismissing failed network requests as "probably cache" without verification.

### Verification

- Checklist completed for the **same user path** that was changed: DOM snapshot (or equivalent), console, network; performance when in scope.
- Artifacts: snapshot refs, log excerpts, or structured notes suitable for **pn-reality-check** / issue filed.

### Guardrails

- Iframe-only flows may be inaccessible to some automation — say so and propose manual steps.
- Do not ship credentials in evidence paste; redact tokens.

### Integration

- Static and cross-viewport visual proof is the workflow above; this section is **runtime** proof.
- **pn-review-optimize-loop** — use before **pn-reality-check** when the risk is client runtime.
- **pn-systematic-debugging** — share repro and isolation discipline.

### Output

- Structured pass/fail per dimension (DOM, console, network, perf) with observed facts and paths/URLs.
