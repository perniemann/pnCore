---
title: Commit messages
updated: 2026-04-22
---

# Commit messages

## Do not allow IDE trailers

Cursor can append lines such as `Made-with: Cursor` or `Co-authored-by: … cursoragent@cursor.com` to commits. **Do not merge or push commits that include those lines.** They add noise and misattribute authorship.

### Why CI fails when you still see that line

The check scans **every commit** in the pull request range (`base..head`) or in the pushed batch (`before..after`). Any commit whose **message body** contains a matching line fails the job. Common cases:

1. **Agent-created commits** — Cursor injected the trailer after your hook ran, or `core.hooksPath` was never set in that clone.
2. **Squash merge to `main`** — GitHub’s default squash text can repeat bodies from squashed commits; if any of them contained `Made-with:`, the **squash commit** fails the push check. Edit the squash message before confirming the merge.

**Defense in depth:** repo hook (strip) + **Cursor project rule** `.cursor/rules/pn-no-cursor-commit-trailers.mdc` (`alwaysApply: true`) + this CI job. The rule stops the model from proposing or keeping those lines; the hook catches the editor; CI catches whatever still lands on the branch.

**Enable this repo’s hook** (one time per clone):

```bash
git config core.hooksPath .githooks
```

The `prepare-commit-msg` hook runs `scripts/strip-commit-trailers.mjs` and removes those lines before the commit is finalized.

**CI and local checks:** `npm run validate` runs Prettier **format:check** first, then `scripts/check-commit-no-ide-trailers.mjs` (compares your branch to `origin/main` or `@{upstream}`). The **Commit message policy** workflow passes `BEFORE`/`AFTER` (push) or PR SHAs (pull request) so the script can scan the right commits. Other workflows (e.g. Sync MCP content) also run `validate`; there the script **skips** the trailer scan when those variables are unset, so only the dedicated job enforces messages on GitHub.

**Sync MCP content** does not run on every push: it only runs when files under [its path list](https://github.com/perniemann/pnCore/blob/main/.github/workflows/sync-mcp-content.yml) change. You can still run it anytime from **Actions → Sync MCP content → Run workflow** (`workflow_dispatch`).

**Version bumps:** After `npm version patch|minor|major`, run `npm run sync:version` (or rely on the `postversion` hook) and commit the synced files — especially `plugins/pnCore/.cursor-plugin/plugin.json` and `plugins/pnCore/README.md`. CI runs `prepare` → `sync:version` on `npm ci`, then fails if `git diff plugins/pnCore` is non-empty.

**If a trailer already landed:** amend or rebase to drop the body line, or rewrite with `git filter-branch` / `git rebase -i` as appropriate.
