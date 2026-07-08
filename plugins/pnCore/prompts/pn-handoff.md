---
name: pn-handoff
description: End a session with a structured handoff at .pncore/handoff.md plus two reflection questions (coverage gap and blind spots). Use before closing a long session or switching tasks.
---

# pn-handoff

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-session-handoff")`.

Writes a structured handoff document and surfaces blind spots before the session closes. Operational continuity for the **next** session; not a substitute for `/pn-retro` (interaction-level mistakes).

## When to use

| Command | Scope | Best for |
|---------|-------|----------|
| `pn-handoff` | Session continuity | "What do I do next?" and dangling state |
| `pn-retro` | Interaction quality | "How could the agent have done better?" |
| Loop STATE | Recurring automation | `.pncore/loops/<id>/STATE.md` per catalog template |

Run **`/pn-handoff`** before ending a long build, after arming a `/loop`, or when handing off to another person or session.

## How to invoke

```
/pn-handoff
```

Optional flags (pass through to the skill):

| Flag | Effect |
|------|--------|
| `--path=<file>` | Write handoff elsewhere (default `.pncore/handoff.md`) |
| `--topic=<slug>` | Handoff title slug |

## Two questions (always)

After the handoff draft:

1. What are the most important things I should have asked but didn't?
2. What did we assume wrong, skip verifying, or leave dangling?

Incorporate answers into **Open questions** when the user responds.

## Output

- `.pncore/handoff.md` (default) following the skill template.
- Chat summary: **Broken state** and **Resume here** quoted for verification.

## Next session

```
Read .pncore/handoff.md and continue from Resume here.
```

## After handoff

The skill may offer:

- **`pn-continual-learning`** — durable AGENTS.md bullet from this session.
- **`/pn-retro`** — if the session had repeated corrections or verify skips.

## Related resources

- `pn-core://reference/loop-orchestration-guide.md`
- `pn-core://reference/loop-catalog/README.md`
