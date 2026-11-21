---
title: "ADR-0023: Visual indicator reminder in the engine"
updated: 2026-11-21
---

# ADR-0023: Visual indicator reminder in the engine

## Status

Accepted

## Context

Rule `pn-visual-indicator` asks every reply touched by pnCore to open with one context tag and 🔺 (U+1F53A). Cursor holds it: the rule is `alwaysApply`, and Cursor injects always-apply rules on every turn. The other three harnesses do not.

- **Claude Code** loads `.claude/rules/*.md` once, at session start. Twenty turns later the instruction sits far from the reply that owes the marker.
- **Codex** has one always-on slot, `AGENTS.md`, capped at 32 KiB. `ALWAYS_ON_RULE_PRIORITY` ranks `pn-visual-indicator` eighth of nine, so it is the first rule body dropped under the cap. The one line that always survives, `TRIANGLE_LINE` in `harness.ts`, said "begin every response in this project", which contradicts the rule's "touched by pnCore" test. A model given two contracts follows neither reliably.
- **Pi** reads the same `AGENTS.md` block, and its extension forwarded only the first content block of a tool result.
- **The MCP server said nothing.** It set no server `instructions`, and no tool result named the marker.

The observed result: the marker appears in Cursor, sometimes in Codex, rarely in Claude Code.

## Decision

1. **State the contract at the touch.** Every pn-core tool result ends with one text block starting `pn-indicator:` that names the tag the tool implies: `get_agent` gives `[pn-agent]`, `get_command` and `workflow_step` give `[pn-command]`, `get_skill` gives `[pn-skill]`, every other tool gives `[pn-default]`. The block tells the model to keep a more specific tag already active (plan > agent > command > skill > default), because plan mode and agent context are host state the server cannot see. The wrap happens once, in `def()` in `tools/registry.ts`, so the MCP adapter and the Pi extension share it.
2. **The payload stays first.** The first content block is still the tool's JSON. Clients and tests that parse the first text block are unaffected. The reminder is always the last block, and wrapping is idempotent.
3. **Server `instructions` carry the full contract**: the touch definition, every tag, and the precedence. Claude Code and Codex place server instructions in the system prompt.
4. **One contract in generated files.** `TRIANGLE_LINE` now uses the rule's touch definition and precedence, and names the `pn-indicator:` line.
5. **Pi forwards every block.** The extension passes the whole `content` array through.
6. **No off switch.** The reminder costs about 50 tokens per tool call. A switch would let the marker silently disappear again, which is the bug this ADR fixes.

## Consequences

- The marker signal reaches all four harnesses on the turn that needs it, without per-harness hooks.
- Tool output and harness output change, so this ships as a minor release (0.20.0).
- The server still cannot see the reply. Compliance is not proven by this change. A follow-up measures it: a Claude Code `Stop` hook (Cursor and Claude Code have hook slots; Codex and Pi do not) that logs turns with a pn-core tool call and no marker to `.pncore/`, which turns "the marker shows up" into a miss rate.
- A skill loaded natively from `.claude/skills` or `.agents/skills`, without any pn-core call, gets no reminder. The always-on rule and `TRIANGLE_LINE` cover that path.

## Alternatives rejected

- **Raise `pn-visual-indicator` in `ALWAYS_ON_RULE_PRIORITY`.** It moves the problem: another rule drops under the Codex cap, and Claude Code still loads it only once.
- **Append the reminder to the JSON payload.** It breaks every consumer that parses the result.
- **Per-harness hooks only.** Codex and Pi have no hook slot in the harness matrix, and the one engine already serves all four.
