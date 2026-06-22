---
name: pn-deslop
description: Remove AI-generated code slop and clean up code style. Use in review passes and before shipping; part of the pn-review-optimize-loop.
---

# Remove AI code slop

Check the diff against main (or the current changes) and remove AI-generated slop introduced in the branch or session.

## When to use

- As part of the review phase in the pn-review-optimize-loop (before or after quality gates).
- When the user asks to "clean up" or "deslop" the code.
- Before finalizing a PR or ship to reduce noise and inconsistency.

## Focus areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1–3 sentences).

## Output

- List of slop removed (file and change type).
- Short confirmation when done.

## Orchestration context

- **pn-review-optimize-loop** — Deslop is part of the review phase; run with pn-config-review, pn-review-plugin-submission (when applicable), then optimize-phase skills.
