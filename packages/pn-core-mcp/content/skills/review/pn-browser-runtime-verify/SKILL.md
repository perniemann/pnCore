---
name: pn-browser-runtime-verify
description: Verify browser apps with live runtime evidence — DOM, console, network, performance — via browser automation or DevTools-class tools when available. Use for UI bugs, regressions, hydration, or when static screenshots are insufficient.
---

# Browser runtime verification

## When to use

- Behavior depends on **runtime** (JS, network, timing, hydration), not just static HTML/CSS
- Bugs that do not reproduce in unit tests alone (CORS, wrong status codes, racey fetches)
- Performance suspicions (slow waterfalls, runaway requests, layout thrash)
- After meaningful changes to data fetching, auth cookies, or client-side routing

## When not to use

- Pure visual/layout sign-off against a spec — prefer **pn-evidence-qa** (screenshots / Playwright captures)
- Non-browser surfaces (CLI, workers only) — use logs and tests

## Process

1. **Reproduce** in a running environment (dev or preview); note URL and steps.
2. **DOM / accessibility snapshot** — confirm elements, roles, and critical attributes match expectations (not "looks fine").
3. **Console** — zero unexpected errors or warnings for the exercised path; capture relevant messages.
4. **Network** — status codes, failed requests, duplicate calls, unexpected hosts; note HAR or request list summary.
5. **Performance (when relevant)** — profile or trace for the suspected issue; tie conclusions to observed data (long tasks, large payloads).
6. **Summarize evidence** — pass/fail per check with what you observed, not what you assumed.

When **Cursor IDE browser MCP** (or equivalent) is available, use it for navigation, snapshot, console, and network tooling rather than guessing from source.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests are green; the browser is fine." | Integration gaps (real cookies, CSP, minify) still break production. |
| "I'll check the console if something fails." | Proactive console/network passes catch silent failures. |
| "Screenshot proves it works." | Screenshots hide 404s, console errors, and slow XHRs. |
| "DevTools is optional luxury." | For browser apps, runtime evidence is the ground truth. |

## Red flags — stop

- Claiming "no console errors" without opening console for the flow under test.
- Dismissing failed network requests as "probably cache" without verification.

## Verification

- Checklist completed for the **same user path** that was changed: DOM snapshot (or equivalent), console, network; performance when in scope.
- Artifacts: snapshot refs, log excerpts, or structured notes suitable for **pn-reality-check** / issue filed.

## Guardrails

- Iframe-only flows may be inaccessible to some automation — say so and propose manual steps.
- Do not ship credentials in evidence paste; redact tokens.

## Integration

- **pn-evidence-qa** — static and cross-viewport visual proof; this skill is **runtime** proof.
- **pn-review-optimize-loop** — use before **pn-reality-check** when the risk is client runtime.
- **pn-systematic-debugging** — share repro and isolation discipline.

## Output

- Structured pass/fail per dimension (DOM, console, network, perf) with observed facts and paths/URLs.
