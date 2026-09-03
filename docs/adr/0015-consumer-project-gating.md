---
title: "ADR-0015: Consumer-project gating is chat plus opt-in git defense, not merge locks"
updated: 2026-09-03
---

# ADR-0015: Consumer-project gating is chat plus opt-in git defense, not merge locks

## Status

Accepted

## Context

`/pn-setup` and `/pn-new` already write `.cursor/rules/pn-no-cursor-commit-trailers.mdc` in git repos and tell agents to follow `pn-build-gate`. Downstream users still asked whether pnCore MCP blocks GitHub PRs, commits, or merges in *their* project.

It does not. The MCP server never installs Actions, branch protection, or git hooks. An agent with shell can `git commit`, open a PR, or merge. What the server can refuse is `workflow_step` (and related gate tools) when state, skeptic records, or optional hard HITL tickets are missing. `/pn-deliver` `do_not_ship` is a chat verdict.

This repo’s own land-on-main path (`docs/commits.md`, `pn-gates`, `no-ide-trailers`, automerge) is **not** installed into consumer repos. Copying it would drag pnCore-specific version/CHANGELOG policy into unrelated projects.

Honor-system chat gates plus a Cursor rule leave a hole: IDE-injected `Made-with:` / Cursor `Co-authored-by` trailers still land when `core.hooksPath` is unset.

## Decision

1. **Stay honest:** MCP gates workflow progress in chat. It does not own the GitHub Merge button. Document that split at `pn-core://reference/consumer-gating.md`.
2. **Ship portable git defense for adopters:** `/pn-setup` and `/pn-new` in a git repo write the existing Cursor rule **and** copy portable `.githooks` (strip trailers on `prepare-commit-msg`). Set `core.hooksPath` to `.githooks` only when it is unset or already `.githooks`. If another manager is configured (Husky `.husky/_`, Lefthook, a global hooksPath), leave it in place and compose the strip script into the existing `prepare-commit-msg`. `--replace-hooks-path` is ask-first. Offer a trailer-only GitHub Actions workflow. Do **not** copy `pn-gates`, version/CHANGELOG CI, automerge, or branch protection.
3. **Hard HITL stays opt-in env:** `PNCORE_APPROVAL_TOKEN` + `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` still only lock `workflow_step`, not git.
4. **This repo keeps its own hook layout** (`.githooks` → `scripts/strip-commit-trailers.mjs`). Consumer templates are a separate, self-contained tree under `content/docs/templates/consumer-gating/`.

## Consequences

- **Positive:** Adopters get the same trailer defense-in-depth this repo uses (rule + hook + optional CI) without inheriting pnCore release gates. The consumer vs repo-own split is written down so the question does not have to be re-answered.
- **Negative:** Hooks are still local-clone config (`core.hooksPath`). When setup composes into an existing manager, the strip line is honor-system unless the adopter adds it. CI is opt-in. A human with write access can still merge a red PR. Mitigation: the reference states that GitHub branch protection is the adopter’s repo policy, not an MCP feature. Setup never steals Husky/Lefthook by overwriting `hooksPath`.

## References

- [ADR-0003: Governance without a second in-repo protocol](0003-governance-without-agp-protocol.md)
- `pn-core://reference/consumer-gating.md`
- `docs/commits.md` (this repository’s land-on-main path)
- `packages/pn-core-mcp/content/docs/templates/consumer-gating/`
