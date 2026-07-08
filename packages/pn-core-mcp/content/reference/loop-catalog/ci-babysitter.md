# Loop: CI babysitter (`ci-babysitter`)

**Risk:** yellow · **Schedule:** `/loop 30m` · **Default tier:** fast · **Escalation:** standard after 2 same failures

## Goal

Watch CI for the current branch or open PR. Each round: pull latest check status, address **one** failing check if actionable, re-run verification, update STATE.

## Boundaries

- **Green:** read CI logs, local test runs, write STATE.
- **Yellow:** draft fixes and commits on feature branch; do not force-push or merge.
- **Red:** never change prod config, secrets, or merge without human.

## STATE path

`.pncore/loops/ci-babysitter/STATE.md`

## Verification (same every round)

```bash
npm run validate
```

Success = exit 0. Paste full tail (last 80 lines) in chat each round.

## Prompt (paste into session or `/loop`)

```markdown
Load pn-core://reference/loop-catalog/ci-babysitter.md.

Read `.pncore/loops/ci-babysitter/STATE.md`. If missing, create from loop-catalog/STATE-schema.md.

This round:
1. Check CI status (gh pr checks or local validate).
2. Pick the single highest-priority failure.
3. Fix only that failure (one change).
4. Run `npm run validate`; paste output.
5. Append round to STATE Round log; update Current status.
6. Stop if: validate passes, max 5 rounds this run, or stuck per STATE.

Model: spawn Task explore (fast, readonly) for log triage; implement on standard tier.
If same failure twice, escalate tier to standard and note in Escalations table.
```

## Stop

- Validate passes; or
- 5 rounds this run; or
- Stuck (needs human merge/red CI access).
