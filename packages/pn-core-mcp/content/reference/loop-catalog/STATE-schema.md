# Loop STATE schema

Canonical shape for `.pncore/loops/<loop-id>/STATE.md`. Every catalog loop reads this file at the start of each round and appends before sleeping.

**Resource:** `pn-core://reference/loop-catalog/STATE-schema.md`.

## Path convention

```
.pncore/loops/<loop-id>/
  STATE.md          # required — operational memory
  config.json       # optional — schedule, caps, risk color
  last-run.log      # optional — raw verification output (gitignored)
```

Add `.pncore/loops/**/last-run.log` to project `.gitignore` when logs may contain secrets. Commit `STATE.md` when the team should share loop history.

## STATE.md template

```markdown
# Loop: <human name> (<loop-id>)

## Meta
- **Risk:** green | yellow | red
- **Schedule:** manual | /loop 5m | /loop 1d | workflow_step
- **Max rounds per run:** <N>
- **Default tier:** fast | standard
- **Escalation tier:** long_horizon | premium_thinking
- **Verification:** `<command>` — success = <criteria>

## Current status
<one paragraph: last outcome, open blocker, next action>

## Round log
| Round | UTC date | Tier | Finding | Action | Verify |
|-------|----------|------|---------|--------|--------|
| 1 | 2026-07-08 | fast | … | … | pass/fail |

## Escalations
| UTC date | Reason | From tier | To tier | Outcome |
|----------|--------|-----------|---------|---------|

## Done (paste-proof)
- [ ] Criterion 1 evidence pasted in chat or linked log path
- [ ] …

## Stuck
Define stuck: e.g. same failure 3 rounds, verification unreachable, red-zone action required.

## Open questions
- …
```

## Fields

| Section | Purpose |
|---------|---------|
| **Meta** | Immutable loop contract for the agent each tick |
| **Current status** | Single-paragraph snapshot for quick resume |
| **Round log** | Comparable history (Machina “compounding layer”) |
| **Escalations** | Cheap→long_horizon audit trail |
| **Done** | Paste-proof checklist for `/goal` or session end |
| **Stuck** | When to stop and ask a human |
| **Open questions** | Deferred decisions |

## Integration with MCP workflow state

MCP `workflow_step` state (`.pncore/workflow-state.json`) is **orthogonal** to loop STATE. Use workflow state for pnCore delivery workflows; use loop STATE for scheduled/autonomous maintainer loops. Cross-link in both files when a loop advances a plan phase.
