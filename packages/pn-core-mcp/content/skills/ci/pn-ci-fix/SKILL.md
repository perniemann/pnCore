---
name: pn-ci-fix
description: Finds failing CI jobs, inspects logs, and applies focused fixes. Use when branch CI is failing and a fast, iterative path to green checks is needed.
---

# Fix CI

## When to use

- Branch CI is failing and you want a fast, iterative path to green checks.
- You need targeted, minimal fixes applied one failure at a time (diagnosis-only → use pn-ci-triage instead).
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

- **pn-ci-triage** — Use when the user wants diagnosis and suggestions only ("why did CI fail?"). Use pn-ci-fix when the user wants iterative fixes until green.
