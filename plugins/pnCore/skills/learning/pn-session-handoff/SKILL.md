---
name: pn-session-handoff
description: "End a session with a structured handoff document and two reflection questions. Captures shipped work, dangling state, resume action, and blind spots. Use via /pn-handoff before closing a session. Pairs with pn-continual-learning for AGENTS.md updates."
---

# Session handoff

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Before ending a long or multi-topic session.
- When switching tasks and another session (or colleague) must resume cold.
- After `/loop` or build work where `.pncore/handoff.md` should capture loop STATE pointers.
- **Not** for blameless mistake taxonomy — use `pn-session-retro` (`/pn-retro`) instead.

## Mission

Produce a **handoff document** the next session can read without re-discovery, then ask the **two reflection questions** so blind spots surface before close. Do not auto-edit skills or rules; recommend follow-ups in prose.

## Output path

Default: `.pncore/handoff.md` (project root `.pncore/`, not repo-root-only ignore — same tree as workflow state).

If the user names a path, use it. Offer to commit when the team shares handoffs.

## Two reflection questions

Ask the user (or answer yourself from transcript evidence) **after** drafting the handoff:

1. **Coverage gap:** What are the most important things I should have asked you but didn't?
2. **Blind spot:** What did we assume wrong, skip verifying, or leave dangling that could bite the next session?

Keep answers specific — reference files, commands, or STATE paths, not vague summaries.

## Handoff document template

```markdown
# Handoff — <topic slug> (<YYYY-MM-DD>)

## Status
<one paragraph: shipped, in flight, broken>

## Shipped
- <item> — <one sentence>

## In flight
- <item> — where it stopped

## Broken state — fix before continuing
- <dangling ref or half-done wiring> — how to fix

## Decisions
- <decision> — <reason>

## Deferred
- <item> — resurface trigger

## Open questions
- …

## Loop STATE pointers
- `.pncore/loops/<id>/STATE.md` — <one line each, or "none">

## Resume here
<concrete first action: file, command, or question>
```

## Workflow

1. **Inventory** — Scan recent tool calls, modified files, open todos, failing commands, active loops under `.pncore/loops/`.
2. **Dangling check** — Any imports, routes, or docs pointing at unfinished work? List under **Broken state**.
3. **Write handoff** — Fill template; quote **Resume here** and **Broken state** back to the user.
4. **Two questions** — Present coverage gap and blind spot; incorporate user answers into **Open questions** if new.
5. **Offer next steps** — Optional `pn-continual-learning` if a durable preference emerged; optional `/pn-retro` if the session felt off.

## Guardrails

- **Exhaustive dangling state** — A handoff that omits broken wiring is worse than no handoff.
- **Paste-proof** — If claiming verify passed, cite command output path or paste excerpt.
- **No secrets** — Redact tokens and credentials in handoff body.
- **Read-only on transcripts** unless user asks for retro mining.

## Related

- `pn-core://reference/loop-orchestration-guide.md` — session end vs loop STATE
- `pn-session-retro` — evidence-based mistake taxonomy
- `pn-continual-learning` — AGENTS.md bullets from transcript deltas
