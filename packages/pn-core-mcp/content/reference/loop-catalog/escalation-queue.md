# Loop: Escalation queue (`escalation-queue`)

**Risk:** green · **Schedule:** per incoming question/task · **Default tier:** fast → **long_horizon**

Meta-pattern from Machina workflow #21: cheap model first; Fable/long_horizon only after recorded failure.

## Goal

Triage a queue of tasks in STATE. Each item: attempt on **fast** tier; on two failures, escalate to **long_horizon** for orchestration pass only.

## Boundaries

- Queue lives in STATE `## Queue` section.
- Escalation requires two failed verify rows for same item id.
- long_horizon pass may plan and delegate; implementation returns to standard.

## STATE path

`.pncore/loops/escalation-queue/STATE.md`

## STATE queue shape

```markdown
## Queue
| id | task | tier | attempts | status |
|----|------|------|----------|--------|
| q1 | … | fast | 0 | pending |
```

## Verification

Per-item command in queue table (must be paste-proof).

## Prompt

```markdown
Read `.pncore/loops/escalation-queue/STATE.md`.

Pick highest-priority pending queue item.

If attempts < 2: run on fast tier (Task explore or shell readonly).
If attempts >= 2 and status still failing: escalate — lead on long_horizon tier, replan only, spawn standard builder subagent for edits.

Paste verification output each attempt. Update attempts, tier, status.

Never skip Escalations table entry when tier changes.
```

## Stop

Queue item reaches `done` with pasted proof, or item marked `blocked` for human.
