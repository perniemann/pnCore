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
- Skill **bodies** are routers: load `reference.md` / scripts only when that workflow is active. Capable models are hindered by recipe liturgy that used to help weaker models.
- `AGENTS.md` should point at docs **when the task needs them**, not require a stack of files before every edit.
- Aligned frontier models already test and already refuse unsafe work. Extra “ask first” / “run the tests” prose makes them stop early. Irreversible work is a different class.

pnCore already matches the disclosure model on the **MCP** path: `list_skills` with no filters returns a category index; `get_skill` loads the body. The Cursor **plugin** still points `skills` at the full tree, so the host indexes every description — the catalog-size failure mode. Anthropic’s Agent Skills spec agrees on progressive disclosure but allows up to 1024 characters per description and warns that skills **under-trigger** when WHEN is too thin. A per-skill character cap therefore optimizes the wrong metric.

Response aliases (`scr` / `eli` / `foc` / `ref` / `scp`) already exist as skill `pn-response-aliases` and agent-requested rule `pn-communication-contract` ([ADR-0013](0013-communication-contract-agent-requested.md)). They stay invisible in a normal session because the contract is not always-on and default `list_skills` does not list the skill. Putting the alias table on every `project_context` packet would dodge ADR-0013’s `alwaysApply` KPI while remaining always-on: `pn-mcp-proactive` already requires that call at session start.

## Decision

1. **MCP `list_skills` / `get_skill` is the Astra-compliant discovery path.** Keep the unfiltered category index. Do not dump the full skill list into always-on rules or into `project_context`.
2. **Cursor plugin skill index is a known catalog-size gap.** Emptying `plugins/pnCore/skills/` so the host indexes only a router is a **follow-up** (harness packaging). This ADR does not change the plugin `skills` folder layout.
3. **Descriptions: tight WHEN, not a length score.** `pn-writing-skills` carries the OpenAI good/bad WHEN examples. `validate-skill-schema` **warns** on broad triggers (`Mandatory before…`, `use when working with`, `anytime you`, `whenever you touch|edit|change|work`). No per-skill character error. Codex’s property is **catalog character budget**; `scripts/measure-tokens.mjs` reports description-catalog size vs 8000 characters.
4. **Aliases stay agent-requested (ADR-0013 unchanged).** Discover them in `/pn-guide`, `docs/how-to-use-guide.md`, one `pn-mcp-proactive` map row, and an AGENTS.md workspace fact. When the user types a whole-token alias, load `get_skill("pn-response-aliases")`. Do **not** add `responseAliases` to the `project_context` packet. Do **not** set `pn-communication-contract` to `alwaysApply: true`.
5. **No frontier-tier instruction prepend.** `renderTierHint` stays the existing one-liner. Astra guidance for named-model prompt work lives in `pn-core://reference/prompt-provider-knobs.md` (GPT-6 Astra subsection). Contextual-read examples live in `agents-md-guide.md`. Irreversible and option-lock gates (`approval_checkpoint`, skeptic, `pn-build-gate` phase-complete) stay.
6. **Slim the always-on map.** `pn-mcp-proactive` keeps session-start, discovery, harness-aware writes, a short high-traffic map (including aliases), and a pointer to `RUNBOOK.md`. Full intent tables do not belong in an alwaysApply rule.

## Consequences

- **Positive:** Operators can type `scr` / `eli` / `foc` / `ref` / `scp` and the agent has a documented load path; skill WHEN clauses over-trigger less; always-on token cost of `pn-mcp-proactive` drops; we stop pretending a 220-character cap fixes Codex’s 8k catalog.
- **Negative:** Cursor/Codex plugin installs still index ~170 skill descriptions until a packaging ADR splits router-vs-MCP skills. Mitigation: quarterly audit (ADR-0002) plus the catalog-size line in `measure-tokens.mjs`.
- **Follow-up:** MCP-first plugin packaging (host indexes a router + aliases; remaining skills MCP-only). Open a new ADR; do not sneak it into unrelated PRs.

## References

- [ADR-0013: Communication contract stays agent-requested](0013-communication-contract-agent-requested.md)
- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- [ADR-0016: Harness adapters](0016-harness-adapters.md) — plugin vs MCP surfaces
- OpenAI, *Rethinking skills and prompts for GPT-6 Astra* (2026-09-11)
- [Codex Agent Skills](https://developers.openai.com/codex/skills) — catalog cap, front-load triggers
- Anthropic Agent Skills — progressive disclosure; description under-trigger risk
