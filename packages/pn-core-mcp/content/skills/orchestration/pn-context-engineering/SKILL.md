---
name: pn-context-engineering
description: "Curate what the agent sees and when — rules vs specs vs task files vs errors vs history. Use when starting a session, switching tasks, output quality drops, or the agent ignores project conventions."
---

# Context engineering

## When to use

- Starting a coding session or onboarding an agent to a repo
- Switching tasks or domains mid-session
- Output drifts (wrong APIs, ignored conventions, invented paths)
- Token budget pressure: need to slim what is loaded without losing guardrails

## Context hierarchy (most → least persistent)

1. **Rules and house docs** — `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md`, project README conventions (always-on constraints).
2. **Specs and architecture** — discovery spec, PRD, ADRs, plans (`docs/plans/`, `docs/discovery/`) for the current initiative.
3. **Task-scoped sources** — only files that implement or verify the active change.
4. **Ephemeral signals** — test output, build logs, linter diagnostics, stack traces (refresh each iteration; do not treat stale logs as ground truth).
5. **Conversation** — accumulates; prefer writing decisions back to spec/plan rather than relying on long threads.

## Process

1. **State what matters now:** one sentence on goal and non-goals for this step.
2. **Load tier 1 if missing:** ensure rules/agents reflect repo truth (commands, paths, forbidden actions). **Load a skill once** per session; do not restack the same rule dump every turn (breaks prompt cache and, on Fable 5.1, thinking-block binding).
3. **Pull tier 2 only for the active feature** — not the whole docs tree.
4. **Expand tier 3 surgically:** open callers, contracts, and tests tied to the edit; avoid "read the whole package."
5. **After each failure:** replace guesswork with tier 4 evidence; if evidence contradicts the plan, update the plan/spec (orchestration philosophy: map is not the territory).

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll paste the whole repo into context." | Noise hides the relevant files; use search and targeted reads. |
| "Rules are enough; I don't need the spec." | Rules don't encode acceptance criteria or this week's scope. |
| "The user already explained it in chat." | Chat compacts and drifts; canonical spec/plan wins. |
| "One more huge file won't matter." | It crowds out signal; load slices or symbols, not megabytes. |

## Red flags — stop and reset

- Agent repeats wrong commands or paths that exist in README but were never loaded.
- Same error loop three times without opening the file that defines the failing contract.
- Conventions cited that are not in any project file (hallucinated stack).

## Verification

- Can you name **which file** is authoritative for the current decision (spec, rule, or source)?
- Did you **re-read** failing test/build output after the last edit?

## Reference-point protocol

When presenting **three or more** findings, decisions, options, risks, questions, or actions in one reply, assign a short stable code to each:

| Prefix | Use |
|--------|-----|
| `F1`… | Findings |
| `D1`… | Decisions |
| `O1`… | Options |
| `R1`… | Risks |
| `Q1`… | Questions |
| `A1`… | Actions |

- Preserve the same codes for the rest of the session so follow-ups can stay cheap (`keep D1, reject O2, answer Q1`).
- Do not invent codes for short one- or two-item answers.
- On long-session handoff, write durable codes into `.pncore/handoff.md` (or the session handoff artifact) so they survive context compaction.
- User alias `ref` (skill **pn-response-aliases**) rewrites the last answer into this form on demand.
- For concise chat tone without always-on cost, load agent-requested rule **pn-communication-contract**.

## Guardrails

- Do not duplicate full project documentation in chat; link paths and read what you use.
- Prefer **MCP and repo tools** to verify live state over stale training assumptions.
- **Append-only session text** when the host model is Fable 5.1: do not rewrite earlier turns, `system`, or `tools`. Add new instructions as new messages. See `pn-core://reference/prompt-provider-knobs.md`.

## Integration

- **pn-orchestration-philosophy** — zero-context handoff and single source of truth.
- **pn-writing-plans** — plans are tier-2 context; keep them executable and path-specific.
- **pn-prior-art-research** / **pn-source-driven-implementation** — tier-3 expansion for external truth.
- **pn-budget-cost-monitor** — When slimming context for **cost** as well as focus (hidden token drivers).
- **pn-response-aliases** — `scr` / `eli` / `foc` / `ref` / `scp` for on-demand response shaping.
- **pn-communication-contract** — agent-requested communication patterns (not alwaysApply).

## Output

- Short note: what tiers you loaded (or will load) for this task and what you intentionally excluded.
