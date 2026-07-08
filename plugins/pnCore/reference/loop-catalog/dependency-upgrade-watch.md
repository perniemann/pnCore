# Loop: Dependency upgrade watch (`dependency-upgrade-watch`)

**Risk:** yellow · **Schedule:** `/loop 1d` during active upgrade window · **Default tier:** standard

## Goal

During a planned upgrade (e.g. major framework): one migration step per round, validate, STATE log.

## Boundaries

- Upgrade plan lives in `docs/plans/` or STATE Meta link.
- One logical step per round (one package or one codemod pass).
- **Red:** no publish/deploy.

## STATE path

`.pncore/loops/dependency-upgrade-watch/STATE.md`

## Verification

Project-specific — e.g. `npm run test:full` or slice verify command. Must be identical every round.

## Prompt

```markdown
Read STATE and linked upgrade plan.

Execute the next uncompleted step only. Run verification command from STATE Meta. Paste output.

If verification fails twice on same step, load subagent-routing escalation: record in Escalations, consider long_horizon tier for orchestration-only (plan next step, do not spam edits).

Update Round log. Stop when plan steps exhausted or stuck.
```

## Stop

All plan steps checked in STATE Done, or stuck.
