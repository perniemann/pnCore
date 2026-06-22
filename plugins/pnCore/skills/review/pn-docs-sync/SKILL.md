---
name: pn-docs-sync
description: Keeps README, CHANGELOG, and project docs in sync with code after feature or fix. Use after changes that affect API, env, setup, or scripts; before PR or delivery.
---

# Documentation sync

## When to use

- After completing a feature or workflow step — keeping docs in sync with implementation.
- When code has changed but README, API docs, or comments are stale.
- At the end of a full_dev or design workflow (final step: pn-docs-sync).
- Before delivering a PR or handoff — verify documentation reflects current behavior.

## Scope

- **README:** Setup, install, env vars, available scripts, usage. Update only sections that changed.
- **CHANGELOG:** Add version/date and entries for user-facing changes; keep format consistent.
- **API/docs:** If the project has API docs or JSDoc/TSDoc, ensure new or changed surfaces are documented.

**Format:** Load `get_skill("pn-documentation")` and apply its format for README, CHANGELOG, and API docs. This skill executes project-doc updates; pn-documentation is the format authority.

## Steps

1. Load `get_skill("pn-documentation")` and apply the format for README, CHANGELOG, and API docs.
2. Identify what changed (new endpoints, env vars, scripts, behavior).
3. Update README: setup, env example, script list, or usage as needed. No heavy prose; keep it scannable.
4. Update CHANGELOG: add entry under current version with short description of change.
5. If API/docs exist, add or update entries for new or changed surfaces.

## Output

- List of updated files and a one-line note per file (e.g. "README: added FOO_ENV to setup"; "CHANGELOG: 0.2.1 – feature X").
- Do not claim "docs complete" without having edited the relevant files.

## Guardrails

- Do not invent or expand sections that did not change.
- Prefer minimal, factual updates over long explanations.
