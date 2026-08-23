# Session retros

Blameless retrospectives of pnCore sessions, produced by the [`pn-session-retro` skill](../../../packages/pn-core-mcp/content/skills/learning/pn-session-retro/SKILL.md) (manually invoked via the `/pn-retro` command).

## What lives here

- `_template.md` — starting point copied for every new retro.
- `YYYY-MM-DD-<short-slug>.md` — one report per session (or per re-review). Do not commit retros that name client or private project workspaces.
- Empty `## Detected mistakes` tables are valid: clean-session retros are evidence for the quarterly skill/rule audit per [ADR-0002](../../adr/0002-skill-rule-audit-cadence.md).

## How to read a retro

Each report classifies mistakes under one of five codes — `USER-CORRECT`, `REVERT`, `VERIFY-SKIP`, `RULE-MISS`, `HALLUCINATE` — and grounds every finding in a ≤ 200-char verbatim quote from the transcript. Recommendations are prose; the user opens any follow-up PR. There is no numeric "mistake score" by design (Goodhart-resistant).

## How a retro becomes action

Retros recommend; they never auto-edit. Follow-ups split three ways:

| Recommendation shape | Channel |
|----------------------|---------|
| Durable user preference or workspace fact | `pn-continual-learning` skill → bullet in [`AGENTS.md`](../../../AGENTS.md) |
| Skill or rule needs sharpening | Regular PR against the skill / `.mdc` file |
| New tool / hook / automation | Tracking issue with exit criteria; do not build until pattern repeats |

## Review cadence

- **Per session (optional):** invoke `/pn-retro` after any session that felt off.
- **Monthly:** scan the last month of retros for patterns the eye catches before automation can.
- **Quarterly:** read alongside the audit per [ADR-0002](../../adr/0002-skill-rule-audit-cadence.md). v2 will automate this rollup once at least one full quarter of retros exists.

## Tone

SRE blameless-postmortem (Google SRE Book Ch. 15): the system failed, not the human. Findings describe behaviour, not intent. "The agent claimed done before running `npm run validate`" — not "the agent was sloppy".

## v2 roadmap

Items deferred from v1 with explicit exit criteria are listed in the [`pn-session-retro` SKILL — Deferred to v2](../../../packages/pn-core-mcp/content/skills/learning/pn-session-retro/SKILL.md#deferred-to-v2-with-exit-criteria).
