---
title: "ADR-0017: Astra-era skill discovery and response aliases"
updated: 2026-09-16
---

# ADR-0017: Astra-era skill discovery and response aliases

## Status

Accepted

## Context

OpenAI’s 11 Sep 2026 note [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and the Codex [Agent Skills](https://developers.openai.com/codex/skills) docs say:

- Skill **descriptions** are a selection aid. Codex loads name + description (+ path) first; that **whole catalog** is capped at about **2% of context, or 8,000 characters** when the window is unknown. Crowding **shortens** descriptions, then **omits** skills.
- Descriptions must state a **narrow WHEN**, not a domain (“use when working with databases”). Front-load trigger words because shortening will happen.
- Skill **bodies** are routers: load `reference.md` / scripts only when that workflow is active.
- `AGENTS.md` should point at docs **when the task needs them**.
- Aligned frontier models already test and already refuse unsafe work. Extra “ask first” liturgy makes them stop early. Irreversible work is a different class.

pnCore already matches the disclosure model on the **MCP** path: `list_skills` with no filters returns a category index; `get_skill` loads the body. The Cursor **plugin** still points `skills` at the full tree, so the host indexes every description.

Response aliases (`scr` / `eli` / `foc` / `ref` / `scp`) already exist as skill `pn-response-aliases` and agent-requested rule `pn-communication-contract` ([ADR-0013](0013-communication-contract-agent-requested.md)). They stayed invisible because the contract is not always-on. Discovery belongs on the cold-session packet the agent already must call (`project_context`), not as a second alwaysApply essay.

## Decision

1. **MCP `list_skills` / `get_skill` is the Astra-compliant discovery path.** Keep the unfiltered category index. Do not dump the full skill list into always-on rules.
2. **Cursor plugin skill index is a known catalog-size gap.** Emptying `plugins/pnCore/skills/` so the host indexes only a router is a **follow-up**. This ADR does not change the plugin `skills` folder layout.
3. **Descriptions: tight WHEN, plus a 220-character gate for new skills.** `pn-writing-skills` carries the OpenAI good/bad WHEN examples. `validate-skill-schema` **warns** on broad triggers and on descriptions longer than ~220 characters. **Error** only for **newly added** `SKILL.md` files in the git diff range whose description exceeds 220 characters (same pattern as EVAL.yaml backfill). Existing long descriptions stay warnings. Codex’s catalog budget is still ~8000 characters for the **whole list**; `measure-tokens.mjs` reports that size.
4. **Aliases stay agent-requested (ADR-0013).** Compact `responseAliases` (`{ alias, expand }`) ships on `project_context` for **both** operator and agent modes. When an alias appears, still `get_skill("pn-response-aliases")` for exact-token rules. Also document in `/pn-guide`, `docs/how-to-use-guide.md`, and one `pn-mcp-proactive` map row. Do **not** set `pn-communication-contract` to `alwaysApply: true`.
5. **Frontier-tier router hint.** `renderTierHint` appends one sentence on `premium` / `premium_thinking` / `long_horizon`: load matching skills as routers; do not preload unrelated recipes; run local disposable tests without asking; stop only for irreversible or option-lock gates. Named-model Astra prose stays in `prompt-provider-knobs.md`. Irreversible gates (`approval_checkpoint`, skeptic, `pn-build-gate` phase-complete) stay.
6. **Slim the always-on map.** `pn-mcp-proactive` keeps session-start, discovery, harness-aware writes, a short high-traffic map (including aliases), and a pointer to `RUNBOOK.md`.

## Consequences

- **Positive:** Cold sessions see the five aliases without a new alwaysApply rule; new skills cannot ship a novel-length description; premium+ workflow steps get an explicit router/test sentence; WHEN clauses over-trigger less.
- **Negative:** Cursor/Codex plugin installs still index ~170 skill descriptions until a packaging ADR splits router-vs-MCP skills. The 220-character gate does not by itself fit the catalog under 8000 characters.
- **Follow-up:** MCP-first plugin packaging. Open a new ADR.

## References

- [ADR-0013: Communication contract stays agent-requested](0013-communication-contract-agent-requested.md)
- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- [ADR-0016: Harness adapters](0016-harness-adapters.md)
- OpenAI, *Rethinking skills and prompts for GPT-6 Astra* (2026-09-11)
- [Codex Agent Skills](https://developers.openai.com/codex/skills)
