---
title: Adopting context-index.json in your project
updated: 2026-04-22
---

# Adopting `context-index.json` in your project

The context index is a small handoff manifest: semver, review date, pointers to workspace and product docs, optional PRD/discovery paths, optional acceptance-criteria ids, and suggested verify commands. pnCore validates its own index in CI; you can reuse the same pattern.

---

## Why

- Gives agents a single JSON entry point for "where is the truth?" (workspace bootstrap, PRD, workflow state schema).
- `check:context-index` ensures the file matches schema and that every non-null pointer path exists on disk.
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
      - run: npm run check:ac-traceability
```

Adjust paths and install step if your repo does not use npm at the root; the scripts only need Node 22+ and the `ajv` stack if you copy `check-context-index.mjs` standalone.

---

## Schema upgrades

When the schema semver bumps, run `node scripts/migrate-context-index.mjs [--dry-run]` from the repo root (see `scripts/migrate-context-index.mjs`).

---

## Further reading

- [docs/refs/README.md](refs/README.md) — file roles in this repo.
- [Acceptance criteria convention](acceptance-criteria-convention.md).
