# Session retro — YYYY-MM-DD — <slug>

**Transcript:** `<uuid>.jsonl`
**Turns:** <n>  **Tool calls:** <n>  **User messages:** <n>

> Blameless. Behaviour, not intent. Evidence-anchored.

## Session summary

2-3 sentences naming the session's goal and outcome. State what the user asked for and what was delivered.

## Detected mistakes

Empty table is a valid outcome — clean-session retros are evidence for the quarterly audit per [ADR-0002](../../adr/0002-skill-rule-audit-cadence.md).

| # | Code | Evidence (≤ 200 chars verbatim) | Suggested fix | Signature |
|---|------|---------------------------------|---------------|-----------|
| 1 | `<CODE>` | `"<verbatim quote or [paraphrased] summary>"` | One-sentence smallest behaviour change | `<CODE>:<kebab-noun-phrase>` or `null` |

Codes: `USER-CORRECT`, `REVERT`, `VERIFY-SKIP`, `RULE-MISS`, `HALLUCINATE`. See [pn-session-retro SKILL](../../../packages/pn-core-mcp/content/skills/learning/pn-session-retro/SKILL.md#taxonomy-v1-5-codes) for definitions and the signature scheme.

## Root cause(s)

- One bullet per finding, or grouped when findings share a root cause.
- Cause should be a behaviour, a missing rule, a missing verification step — never "the agent was bad at X".

## Recommendations

- 1-3 prose bullets pointing to a concrete next action. Examples of acceptable shapes:
  - "Suggested follow-up: bullet in `AGENTS.md` via `pn-continual-learning` — 'Always run `npm run test:full` before claiming MCP edits complete'."
  - "Suggested follow-up: open PR sharpening rule `pn-build-gate.mdc` to require `npm run validate` before any commit that touches `packages/pn-core-mcp/`."
  - "Suggested follow-up: add a `Limitations` clause to skill `pn-...` noting the `gh` CLI fallback path."
- Recommendations are **prose only**. Do not embed diffs.

## Calibration delta (optional)

Note any case the 5-code taxonomy could not classify cleanly. These notes seed the v2 taxonomy expansion (`## Candidate codes` in [pn-session-retro SKILL](../../../packages/pn-core-mcp/content/skills/learning/pn-session-retro/SKILL.md#candidate-codes-deferred-until-evidence)). Repeated deltas across retros are the strongest promotion signal.
