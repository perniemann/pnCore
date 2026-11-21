---
name: pn-ci-fix
description: "Diagnoses failing CI from logs and applies focused fixes until green. Use when branch CI is failing; diagnosis-only triage (why did CI fail?) is a section of this skill."
---

# Fix CI

## When to use

- Branch CI is failing and you want a fast, iterative path to green checks.
- You need targeted, minimal fixes applied one failure at a time (diagnosis only: see § CI triage below).
- CI is red after a merge, rebase, or dependency bump and needs to be unblocked quickly.

## Workflow

1. Identify the latest run for the current branch.
2. Inspect failed jobs and extract the first actionable error.
3. Apply the smallest safe fix.
4. Re-run CI and repeat until green.

## Guardrails

- Fix one actionable failure at a time.
- Prefer minimal, low-risk changes before broader refactors.

## Output

- Primary failing job and root error
- Fixes applied in iteration order
- Current CI status and next action

## Guardrails


<!-- merged from pn-ci-triage (0.22.0) -->
## CI triage (diagnosis only)

### When to use

- A GitHub Actions or GitLab CI run has failed
- User asks "why did CI fail?" or "how do I fix this CI error?"
- Drafting or updating a workflow and need to reason about steps and dependencies

### Workflow

1. **Locate the failure:** Identify which job and which step failed from the CI summary or logs. Note the exact error message and exit code if shown.
2. **Classify the failure:** Common types: (a) test failure (assertion or runtime in tests), (b) lint/format failure, (c) build/compile failure, (d) missing secret or env var, (e) dependency install failure, (f) timeout or resource issue, (g) permission or path issue.
3. **Suggest a fix:** For (a)–(c) point to the file and line if possible and suggest a concrete change or command to run locally. For (d) remind to set the secret/variable in the platform and not in the workflow file. For (e)–(g) suggest platform-specific fixes (e.g. cache key, job timeout, working directory).
4. **Link to docs:** Where helpful, link to the relevant CI docs (e.g. GitHub Actions, GitLab CI) for the failing step or feature.
5. **Dev/prod staging:** When user asks for dev/prod or staging vs production CI setup, recommend pn-ci-dev-prod-split.
6. **Suggestion only:** Frame output as suggestions; the user should apply changes and re-run CI. Do not assume you have full repo or env context.

### Output

- Failing job and step, failure type, and suggested fix (with file/line when applicable).
- Links to CI platform docs where helpful.

### Guardrails

- **pn-ci-dev-prod-split** — Use when scaffolding or changing dev/prod or staging workflows.
