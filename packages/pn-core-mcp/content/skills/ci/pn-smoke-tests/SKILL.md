---
name: pn-smoke-tests
description: "Run smoke or E2E tests, debug failures, and verify fixes. Use for end-to-end verification before or after changes."
---

# Run smoke tests

## When to use

- Verifying end-to-end behavior before or after a release or deployment.
- Debugging a failing Playwright or Cypress test in CI or locally.
- Confirming a code change did not break critical user flows.
- Running a focused test file to isolate a flaky or broken spec.

**When Playwright MCP is available:** Use its tools to navigate pages, interact with elements, fill forms, capture screenshots, and execute browser actions directly. Combine with this skill for test structure, assertion patterns, stability guardrails, and CI integration. Do not write spec files manually when Playwright MCP can execute actions interactively.

## Workflow

1. Build prerequisites for the target app.
2. Run the relevant smoke suite or a focused test file.
3. If failing, inspect traces/logs and isolate the root cause.
4. Apply a minimal fix and rerun until stable.

## Example Commands

```bash
# Run full smoke suite (adapt to project)
npm run smoketest

# Run a specific smoke test file
npm run smoketest -- path/to/test.spec.ts

# Faster iteration when build artifacts are ready
npm run smoketest-no-compile -- path/to/test.spec.ts
```

## Guardrails

- Prefer deterministic waits and assertions over brittle timeouts.
- Re-run passing fixes to reduce flaky false positives.
- Quarantine tests only when explicitly requested and documented.

## Output

- Test results summary
- Root cause and fix
- Remaining flake risk (if any)
