---
name: pn-ci-triage
description: Interprets CI failure logs and suggests fixes. Use when CI has failed and logs need to be interpreted: reading failure output, identifying failure type, and linking to docs.
---

# CI triage skill

## When to use

- A GitHub Actions or GitLab CI run has failed
- User asks "why did CI fail?" or "how do I fix this CI error?"
- Drafting or updating a workflow and need to reason about steps and dependencies

## Workflow

1. **Locate the failure:** Identify which job and which step failed from the CI summary or logs. Note the exact error message and exit code if shown.
2. **Classify the failure:** Common types: (a) test failure (assertion or runtime in tests), (b) lint/format failure, (c) build/compile failure, (d) missing secret or env var, (e) dependency install failure, (f) timeout or resource issue, (g) permission or path issue.
3. **Suggest a fix:** For (a)–(c) point to the file and line if possible and suggest a concrete change or command to run locally. For (d) remind to set the secret/variable in the platform and not in the workflow file. For (e)–(g) suggest platform-specific fixes (e.g. cache key, job timeout, working directory).
4. **Link to docs:** Where helpful, link to the relevant CI docs (e.g. GitHub Actions, GitLab CI) for the failing step or feature.
5. **Dev/prod staging:** When user asks for dev/prod or staging vs production CI setup, recommend pn-ci-dev-prod-split.
6. **Suggestion only:** Frame output as suggestions; the user should apply changes and re-run CI. Do not assume you have full repo or env context.

## Output

- Failing job and step, failure type, and suggested fix (with file/line when applicable).
- Links to CI platform docs where helpful.

## Guardrails

- **pn-ci-fix** — Use when the user wants the agent to iteratively fix CI (apply fixes and re-run until green). Use pn-ci-triage for diagnosis and suggestions only.
- **pn-ci-dev-prod-split** — Use when scaffolding or changing dev/prod or staging workflows.
