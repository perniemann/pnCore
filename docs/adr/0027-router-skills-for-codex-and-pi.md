# ADR-0027: Router skills for Codex and Pi

**Status:** Accepted
**Date:** 2026-11-22

## Context

Codex puts every installed skill's name, description and file path in an initial list. The list takes at most 2% of the context window, or 8,000 characters when the window is unknown. Past that, Codex shortens descriptions first and then drops skills with a warning ([Codex: Agent Skills](https://developers.openai.com/codex/skills)). `skills.max_context_tokens` raises the cap; pnCore cannot assume a user sets it.

`plugin-install --harness codex` copied all 142 skills into `.agents/skills/`. Their descriptions alone total 30,868 characters (`scripts/measure-tokens.mjs`), almost four times the default list. Codex therefore matched skills on truncated descriptions and silently lost some. ADR-0017 named this gap and deferred it to a packaging ADR. Pi reads the same `.agents/skills/` and has native `get_skill`.

The 220-character gate from ADR-0017 cannot close the gap: 8,000 characters across 142 skills leaves about 56 per skill for name, description and path, which destroys the WHEN clause the list exists for.

## Decision

1. **Router set by default.** For `.agents/skills/` (Codex and Pi) the installer copies only the skills named in `content/config/router-skills.json`: cross-cutting skills a session reaches before any workflow names one (philosophy, discovery, planning, skeptic, debugging, verification, review, CI and ship). 27 skills today.
2. **Everything else through the engine.** Workflow steps already name the skills they need and load them with `get_skill`. The managed `AGENTS.md` block tells Codex and Pi to find other pnCore skills with `list_skills` and load them with `get_skill`. No skill is removed from the catalog.
3. **Budget is a gate.** `check-router-skills` (in `validate`) fails when an id is unknown or repeated, or when the sum of id and description lengths exceeds `budgetChars` (7,000). The remaining 1,000 of the 8,000 characters are kept for file paths.
4. **Escape hatch.** `--all-skills` copies the full set and prints the cost. A re-install in router mode names pnCore skills left in `.agents/skills/` by an earlier full install; it does not delete files.
5. **Scope.** Cursor and Claude Code keep the full copy. Neither documents a hard list cap of this kind for pnCore to fit; revisit with a measurement, not by analogy.

## Consequences

- **Positive:** Codex lists every router skill with its full description. The other 115 skills stay one `get_skill` away, the same path workflows already use.
- **Negative:** Codex without the pn-core MCP sees only the router set; implicit matching on a skill outside it no longer happens. `--all-skills` restores the old behaviour with the truncation it brings.
- **Changing the set:** edit `router-skills.json`; the gate rejects a set over budget. A new router skill displaces another or shortens a description; the budget does not grow.

## References

- [ADR-0016: Harness adapters](0016-harness-adapters.md): installer scope per harness
- [ADR-0017: Astra-era skill discovery](0017-astra-era-skill-discovery.md): the 8,000-character list and the deferred packaging decision
- [ADR-0021: Context budget](0021-context-budget.md): the `AGENTS.md` byte cap, measured the same way
