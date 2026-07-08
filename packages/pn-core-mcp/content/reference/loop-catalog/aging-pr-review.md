# Loop: Aging PR review (`aging-pr-review`)

**Risk:** yellow · **Schedule:** `/loop 1d` · **Default tier:** fast

## Goal

List open PRs older than N days; for the stalest, summarize status, CI, review comments, draft next action (comment or rebase plan).

## Boundaries

- **Green/yellow:** read gh, draft comments in STATE or markdown file; human posts.
- **Red:** never merge or approve on behalf of user.

## STATE path

`.pncore/loops/aging-pr-review/STATE.md`

## Verification

```bash
gh pr list --state open --json number,title,updatedAt,reviewDecision,statusCheckRollup
```

Paste JSON for tracked PRs.

## Prompt

```markdown
Read STATE. gh pr list (limit 20). Filter age > Meta threshold (default 7d).

Pick stalest PR. Summarize: CI, reviews, conflicts. Draft one next action in STATE (rebase, request review, close).

Task explore (fast, readonly) for diff stat if needed.

Do not merge. One PR per round.
```

## Stop

One PR processed per tick.
