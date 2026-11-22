# ADR-0028: Indicator Stop hook for Claude Code

**Status:** Accepted
**Date:** 2026-11-22

## Context

ADR-0023 put the 🔺 contract into every pn-core tool result and the server `instructions`. The server still cannot see the reply, so ADR-0023 left compliance unproven and named the follow-up: a Claude Code `Stop` hook that logs pnCore turns without the marker. Claude Code is the one harness besides Cursor with a hook slot that sees the transcript after a turn; Codex and Pi have none.

## Decision

1. **The hook.** `plugins/pnCore/scripts/pn-indicator-stop.mjs` reads the transcript at `Stop` and checks the last turn. The turn touched pnCore when it called an `mcp__pn-core__*` tool, ran a `pn-*` skill or command, or received a tool result with a `pn-indicator:` line. A touched turn complies when one of its replies opens with `[pn-<tag>] 🔺`. Sidechains (subagents) do not count.
2. **Measure first.** A miss appends `{ ts, session_id, sources, firstText }` to `.pncore/indicator-misses.jsonl`. The hook prints nothing and exits 0, including on bad input: a measurement never breaks a session.
3. **Enforcement is opt-in.** `PNCORE_INDICATOR_STOP=block` returns `decision: "block"` once per turn (never when `stop_hook_active` is set), and the model restates its reply with the tag. Off by default, because the restated reply is a second message the user reads.
4. **Install.** `plugin-install --harness claude_code` copies the hook to `.claude/hooks/` and merges one `Stop` entry into `.claude/settings.json`, keeping every other key and hook. Re-running adds nothing. Invalid JSON in the settings file is left alone with a note.

## Consequences

- **Positive:** "The marker shows up" becomes a miss count per session, on the harness where the drift was reported.
- **Negative:** Cursor, Codex and Pi get no equivalent. Cursor injects the always-on rule every turn and the drift was not reported there; porting the check needs Cursor's transcript format, which this ADR does not cover. Codex and Pi have no hook slot. Their compliance stays the ADR-0023 reminder.
- **Follow-up:** turn block mode on by default only if the miss rate stays above zero after ADR-0023, and only with a measured cost for the extra message.

## References

- [ADR-0023: Visual indicator reminder in the engine](0023-visual-indicator-engine-reminder.md)
- [ADR-0016: Harness adapters](0016-harness-adapters.md)
- [Claude Code hooks reference](https://code.claude.com/docs/en/hooks)
