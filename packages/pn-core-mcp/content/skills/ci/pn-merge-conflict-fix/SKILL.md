---
name: pn-merge-conflict-fix
description: "Resolve merge conflicts non-interactively, validate build and tests, and finalize conflict resolution. Use when branch has unresolved merge conflicts."
---

# Fix merge conflicts

## When to use

- Branch has unresolved merge conflicts blocking a PR or build.
- CI fails with conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in tracked files.
- After a rebase or merge from main/trunk that introduced conflicts.
- Post-parallel-specialist workflow merge step (full_dev merge phase).

## Workflow

1. Detect all conflicting files from git status and conflict markers.
2. Resolve each conflict with minimal, correctness-first edits.
3. Prefer preserving both sides when safe. Otherwise, choose the variant that compiles and keeps public behavior stable.
4. Regenerate lockfiles with package manager tools instead of hand-editing.
5. Run compile, lint, and relevant tests.
6. Stage resolved files and summarize key decisions.

## Guardrails

- Keep changes minimal and readable.
- Do not leave conflict markers in any file.
- Avoid broad refactors while resolving conflicts.
- Do not push or tag during conflict resolution.

## Output

- Files resolved
- Notable resolution choices
- Build/test outcome

## Guardrails

- **pn-ci-fix** — Use when CI is failing due to code or config; use this skill when merge conflicts are blocking the branch.
