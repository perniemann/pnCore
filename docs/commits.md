---
title: Commit messages
updated: 2026-07-03
---

# Commit messages

## Do not allow IDE trailers

Cursor can append lines such as `Made-with: Cursor` or `Co-authored-by: … cursoragent@cursor.com` to commits. **Do not merge or push commits that include those lines.** They add noise and misattribute authorship.

### Why CI fails when you still see that line

The check scans **every commit** in the pull request range (`base..head`) or in the pushed batch (`before..after`). Any commit whose **message body** contains a matching line fails the job. Common cases:

1. **Agent-created commits** — Cursor injected the trailer after your hook ran, or `core.hooksPath` was never set in that clone.
2. **Squash merge to `main`** — GitHub’s default squash text can repeat bodies from squashed commits; if any of them contained `Made-with:` or `Co-authored-by: Cursor Agent <cursoragent@cursor.com>`, the **squash commit** fails the push check. Edit the squash message before confirming the merge, or rely on [pr-automerge.yml](../.github/workflows/pr-automerge.yml) (`--subject` only, empty body).

**Defense in depth:** repo hook (strip) + **Cursor project rule** `.cursor/rules/pn-no-cursor-commit-trailers.mdc` (`alwaysApply: true`) + this CI job. The rule stops the model from proposing or keeping those lines; the hook catches the editor; CI catches whatever still lands on the branch.

**Enable this repo’s hook** (one time per clone):

```bash
git config core.hooksPath .githooks
```

The `prepare-commit-msg` hook runs `scripts/strip-commit-trailers.mjs` and removes those lines before the commit is finalized.

**CI and local checks:** `npm run validate` runs Prettier **format:check** first, then `scripts/check-commit-no-ide-trailers.mjs` (compares your branch to `origin/main` or `@{upstream}`). The **Commit message policy** workflow passes `BEFORE`/`AFTER` (push) or PR SHAs (pull request) so the script can scan the right commits. Other workflows (e.g. Sync MCP content) also run `validate`; there the script **skips** the trailer scan when those variables are unset, so only the dedicated job enforces messages on GitHub.

**Sync MCP content** does not run on every push: it only runs when files under [its path list](https://github.com/perniemann/pnCore/blob/main/.github/workflows/sync-mcp-content.yml) change. You can still run it anytime from **Actions → Sync MCP content → Run workflow** (`workflow_dispatch`).

## Version bumps

After `npm version patch|minor|major`, run `npm run sync:version` (or rely on the `postversion` hook) and commit the synced files — especially `plugins/pnCore/.cursor-plugin/plugin.json` and `plugins/pnCore/README.md`. CI runs `prepare` → `sync:version` on `npm ci`, then fails if `git diff plugins/pnCore` is non-empty.

### Strict release-path policy (`pn-gates`)

When a PR changes any file under:

- `packages/pn-core-mcp/content/`
- `packages/pn-core-mcp/src/`
- `plugins/pnCore/`

CI requires:

1. **Version bump** — root `package.json` version must differ from the PR base branch.
2. **CHANGELOG entry** — `plugins/pnCore/CHANGELOG.md` must include `## [version] - YYYY-MM-DD` for the new version (pn-documentation format).

Local checks: `npm run check:changelog` and `npm run check:doc-structure`.

Doc-only or script-only changes outside those paths do not trigger the bump requirement.

## PR review and auto-merge

Three workflows gate merges to `main`:

| Check | Workflow | What it enforces |
|-------|----------|------------------|
| `pn-gates` | [pn-gates.yml](../.github/workflows/pn-gates.yml) | Version/CHANGELOG policy + pn-documentation structure on changed markdown |
| `pn-review` | [pn-pr-review.yml](../.github/workflows/pn-pr-review.yml) | Deterministic review findings; posts Cloud Agent instructions for full `/pn-review` + `/pn-document` |
| `sync (22)` / `sync (24)` / `no-ide-trailers` | Existing CI | Full `test:full`, commit policy |

### Author workflow

1. Branch from `main`; implement the change.
2. For release-path edits: `npm version patch|minor|major` → update `plugins/pnCore/CHANGELOG.md`.
3. Run `/pn-document` on changed docs locally when helpful.
4. Open a PR; wait for `pn-gates` and `pn-review` to pass.
5. Add the **`automerge`** label when ready for squash-merge to `main`.

### Auto-merge rules

- **Opt-in:** only PRs labeled **`automerge`** are merged by [pr-automerge.yml](../.github/workflows/pr-automerge.yml).
- **Required checks:** `no-ide-trailers`, `sync (22)`, `sync (24)`, `pn-gates`, `pn-review`.
- **Semver-major skips:** version major bumps stay manual (same as Dependabot).
- **Labels:** `pn-ready` / `pn-blocked` are set by the review workflow from deterministic findings; Cloud Agent may update them after semantic review. Add **`automerge`** when you want squash-merge after all checks pass.
- **Dependabot:** patch/minor/group PRs still use [dependabot-automerge.yml](../.github/workflows/dependabot-automerge.yml) (no `automerge` label required).

### Prune Actions history

When the Actions tab accumulates hundreds of runs (especially during PR/automerge churn), run **Actions → Prune Actions history → Run workflow** (or locally: `GITHUB_TOKEN=... npm run prune:actions`). The job keeps the **latest run per workflow** and deletes the rest. Use workflow input **logs only** if you want to drop log archives but keep run rows in the UI.

**If a trailer already landed:** amend or rebase to drop the body line, or rewrite with `git filter-branch` / `git rebase -i` as appropriate.
