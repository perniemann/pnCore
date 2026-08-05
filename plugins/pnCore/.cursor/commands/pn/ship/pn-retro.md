---
name: pn-retro
description: Run a blameless session retrospective on an agent transcript. Classifies mistakes under a 5-code taxonomy and writes a structured report under docs/refs/retros/. Manual-only in v1; auto-trigger and cross-session pattern detection are deferred to v2.
---

# pn-retro

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-session-retro")`.

Produces a structured, blameless retro of one session (or a small window of recent sessions). Classifies what went wrong under a tight 5-code taxonomy, grounds every finding in a verbatim quote, and recommends the smallest concrete action that would prevent the mistake next time. Does **not** auto-edit `AGENTS.md`, skills, or rules — recommendations are prose; the user opens any PR.

## When to use this vs. similar commands

| Command | Scope | Best for |
|---------|-------|----------|
| `pn-retro` | Interaction level (the session itself) | Asking "how could pnCore have done this better?" — analyses user/agent dynamics |
| `pn-review` | Artifact level (code under review) | Quality gates, deslop, reality-check on a diff |
| `pn-deliver` | Artifact level (final hand-off) | Verifying a deliverable meets its spec |
| `pn-skeptic` / `pn-grill` | Plan level (before build) | Challenging an approach before implementation |

Use `pn-retro` after a session that felt off (user corrected the agent more than usual, work was reverted, tests were skipped, a hallucinated path appeared), or before a quarterly skill/rule audit per [ADR-0002](../../../../../../docs/adr/0002-skill-rule-audit-cadence.md) to provide evidence instead of memory.

## How to invoke

Plain invocation runs against the most recent finished parent transcript:

```
/pn-retro
```

Flags (passed through to `pn-session-retro`):

| Flag | Effect |
|------|--------|
| `--since=YYYY-MM-DD` | Retro every parent transcript modified on or after this date |
| `--scope=session` | Last finished parent transcript (default) |
| `--scope=recent` | Last 5 parent transcripts |
| `--scope=all` | Every parent transcript modified since the last retro report |

Subagent transcripts (`subagents/<id>.jsonl`) are read as evidence but never treated as the primary scope.

## Output

- A report at `docs/refs/retros/YYYY-MM-DD-<short-slug>.md` following `docs/refs/retros/_template.md`.
- Inline summary in chat: turn count, finding count by code, top recommendation.
- If a retro already exists for the same transcript, a `## Re-review` section is appended rather than overwriting.

## Guardrails

- **Read-only on transcripts.** Never modifies, redacts in place, or moves transcript files.
- **No auto-edits.** Recommendations are prose; the user opens any follow-up PR. To add a learned-preference bullet to `AGENTS.md`, run `pn-continual-learning` separately.
- **Blameless tone.** Findings describe behaviour, not intent.
- **One code per finding.** When two codes match, the *earlier link* in the failure chain wins.
- **No numeric mistake score.** Goodhart-resistant by design.

## After the report

Once the report is presented, the skill will offer to run `pn-continual-learning` immediately if any finding implies a durable AGENTS.md bullet. Accept to mine the transcript and update memory in one step; decline to handle it manually later.
