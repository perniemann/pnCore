---
title: Adopting context-index.json in your project
updated: 2026-09-17
---

# Adopting `context-index.json` in your project

The context index is a small handoff manifest: semver, review date, pointers to workspace and product docs, optional PRD/discovery paths, optional typed **`artifacts`** (schema 1.3.0+) with **`lifecycle`** (1.4.0+), optional acceptance-criteria ids, and suggested verify commands. pnCore validates its own index in CI; you can reuse the same pattern. Agents load it via the MCP **`project_context`** tool (pull), not via a sessionStart hook inject.

---

## Why

- Gives agents a single JSON entry point for "where is the truth?" (workspace bootstrap, PRD, workflow state schema).
- `check:context-index` ensures the file matches schema, that every non-null pointer path (and each `artifacts[].path`) exists on disk, and that the lifecycle is coherent (below).
- `check:artifact-status` fails when an artifact claims `authored_status: complete` without a passing verify/acceptance event for its `run_id`.
- `check:ac-traceability` (when you list `AC-*` ids) ensures those ids appear somewhere in the repo outside the index.

---

## Minimal setup

1. Copy [context-index.schema.json](refs/context-index.schema.json) into your repo (e.g. `docs/refs/`).
2. Add `context-index.json` with at least `version`, `last_reviewed`, and `pointers.workspace` pointing at your bootstrap doc (often `AGENTS.md` or `.cursor/rules/project-context.mdc`).
3. Run validation from repo root (paths below assume you vendor or symlink pnCore scripts; otherwise copy `check-context-index.mjs` and dependencies).

---

## CI: validation commands

From pnCore repo root, validation is:

- `npm run check:context-index` — schema + non-null pointer paths exist.
- `npm run check:artifact-status` — artifact paths + no unattested complete claims.
- `npm run check:ac-traceability` — every `AC-*` in the index appears elsewhere in text files.

Include both in `npm run validate` or your own pipeline. Non-null pointers already imply "file must exist" (for example if `prd` is a string path, that path is checked).

---

## Optional GitHub Actions snippet

```yaml
name: context-index
on:
  push:
    paths:
      - "docs/refs/context-index.json"
      - "docs/refs/context-index.schema.json"
  pull_request:
    paths:
      - "docs/refs/context-index.json"
      - "docs/refs/context-index.schema.json"

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm run check:context-index
      - run: npm run check:artifact-status
      - run: npm run check:ac-traceability
```

Adjust paths and install step if your repo does not use npm at the root; the scripts only need Node 22+ and the `ajv` stack if you copy `check-context-index.mjs` standalone.

---

## Lifecycle: one current checkpoint (1.4.0+)

Long-running projects accumulate plans and checkpoints that were true once. Mark them instead of deleting them:

- `artifacts[].lifecycle`: `current` (the live entry; at most one per `type`), `historical`, or `superseded` (with `superseded_by: <artifact id>`).
- `pointers.current_checkpoint`: the **artifact id** (not a path) of the current checkpoint. It must name an artifact whose lifecycle is `current`.

`check:context-index` fails when `current_checkpoint` names a missing or non-current artifact, when two artifacts of one type are `current`, or when a `superseded_by` target does not exist (and `superseded` requires one).

In `project_context`, historical and superseded entries stay in `artifacts` as evidence but never become blockers. They are left out of `drift`, `counts.drift`, and `counts.missing`, and are counted under `counts.historical`. `next_incomplete` prefers the `current_checkpoint` artifact. `active_run.declared_current` reports that artifact and its `run_id`. Two mismatches flag conflicts:

- `state_vs_declared_current`: the declared run differs from the state file's run.
- `historical_entry_selected`: the selected run belongs to a historical artifact.

---

## Schema upgrades

When the schema semver bumps, run `node scripts/migrate-context-index.mjs [--dry-run]` from the repo root (see `scripts/migrate-context-index.mjs`).

---

## Further reading

- [docs/refs/README.md](refs/README.md) — file roles in this repo.
- [Acceptance criteria convention](acceptance-criteria-convention.md).
