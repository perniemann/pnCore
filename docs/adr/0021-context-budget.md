---
title: "ADR-0021: Context budget packing, narrow"
updated: 2026-09-14
---

# ADR-0021: Context budget packing, narrow

## Status

Accepted

## Context

pnCore measures context already: `scripts/measure-tokens.mjs` estimates tokens as chars ÷ 4 for the always-apply rule bundle, tool descriptions, and the largest skills; the dashboard reads the same numbers; `PNCORE_MAX_RESOURCE_CHARS` truncates oversized resources. Counting is not the gap. Nothing *packs* — nothing takes a budget and decides what to leave out — and there are two places where a hard limit makes that decision unavoidable:

1. **`project_context`**, the cold-session packet every agent loads first. In `agent` mode it carries the full artifact list with notes, pointers, and up to 80 trail lines. On a small context window (Pi with a local model, a long Codex session) the agent has to choose between skipping it and paying for all of it.
2. **The Codex `AGENTS.md` chain**, which Codex truncates at `project_doc_max_bytes` (32 KiB default). `plugin-install --harness codex --inline-rules` inlines nine always-apply rules (~25 KB) into a file that already holds the team's own guidance; over the cap, Codex silently drops the tail — usually the pnCore block.

A general-purpose context assembler (score every skill and rule, pack per turn) was proposed as B1. It would add a scoring model, a cache, and a new tool surface for a problem that, in this codebase, has two concrete instances with obvious priority orders.

## Decision

1. **One measurement, no new one.** `estimateTokens` in `packages/pn-core-mcp/src/context-budget.ts` is `Math.ceil(chars / 4)`, the same formula `measure-tokens` uses. Byte caps use UTF-8 bytes (`utf8Bytes`), because that is what Codex counts.
2. **`project_context` packs to `max_tokens` in a fixed order.** `packProjectContext` shrinks and drops sections one step at a time and stops as soon as the packet fits: trail oldest-first (keep the newest 3) → clear notes on settled artifacts (`ok`, `complete_attested`) → drop settled artifacts (keep `drift`, `missing`, `in_progress`, `unattested`) → drop `pointers` → drop the trail → drop all artifacts (drift ids stay under `drift`) → clear drift notes. `mode`, `version`, `calendarDateUtc`, `context_index`, `counts`, `active_run_id`, `resume`, `drift` ids, `next_incomplete` are never removed. Every packet, budgeted or not, carries `budget: { maxTokens, estimatedTokens, chars, fits, steps[], hint? }`; each step records `savedChars`; `artifacts_omitted` counts what was dropped by status. If the core alone exceeds the budget the packet says `fits: false` rather than lying. The step record is pushed before shrinking so its own bytes count.
3. **`AGENTS.md` fits the Codex cap by priority-ordered inlining.** `HarnessLayout.instructionsCapBytes` is 32 KiB for Codex and `null` elsewhere; `PNCORE_AGENTS_MD_CAP_BYTES` overrides. `fitInstructionsBlock` builds the pnCore block, upserts it into the existing file, measures the whole file, and removes inlined rules one at a time — lowest priority first per `ALWAYS_ON_RULE_PRIORITY` (`pn-mcp-proactive`, `pn-build-gate`, `pn-current-date`, `pn-agents-md`, `pn-tool-risk-policy`, `pn-orchestrator-lead`, `pn-aesthetics-baseline`, `pn-visual-indicator`, `pn-no-cursor-commit-trailers`) — until it fits. Omitted rules are listed in the block as `get_rule` pointers, so nothing is lost, only moved behind a call. Content outside the managed block is never touched; a file over the cap with nothing inlined gets `fits: false` and a warning to shorten the surrounding content. The installer prints bytes against the cap; `harness_scaffold` returns `instructionsBudget` (also in `dryRun`).
4. **No general assembler.** Skills, agents, and commands stay pull-based through `get_*`; the engine's per-step instructions already name what to load. If a third hard limit appears, it gets the same treatment: a fixed, documented drop order at the point of emission, not a scorer.

## Consequences

- **Positive:** An agent on a small window can call `project_context({ max_tokens })` and get a packet that fits, knows what was cut, and knows how to fetch it (`hint`). Codex users with `--inline-rules` no longer lose the pnCore block to silent truncation; the priority list makes the trade-off explicit and reviewable. Both paths are pure functions with exhaustive unit tests, deterministic (same input and budget → same output), and cost no LLM calls. `project_context.budget` gives every session a size number for free.
- **Negative / open:** chars ÷ 4 is an estimate; a model's tokenizer can differ by ±20 %, so callers wanting a hard guarantee should pass a budget with margin. The drop order is fixed policy: a project whose `pointers` matter more than its settled artifacts cannot reorder it without a code change. `fitInstructionsBlock` drops whole rules, not paragraphs; a single rule larger than the free space is omitted entirely rather than trimmed. The Codex cap applies to the chain (all `AGENTS.md` files from `~/.codex` down to cwd); pnCore measures only the project file it writes.

## References

- [ADR-0016: Harness adapters](0016-harness-adapters.md) — managed `AGENTS.md` block, `--inline-rules`
- [ADR-0020: Step spans on the run log](0020-step-spans.md) — per-step baseline (`engineMs`, loads per step) this can be graded against
- `pn-core://reference/harness-matrix.md` § Instructions-file budget
- `packages/pn-core-mcp/src/context-budget.ts`, `src/context-budget.test.ts`, `src/harness.ts` (`fitInstructionsBlock`, `instructionsBudgetFor`, `ALWAYS_ON_RULE_PRIORITY`), `scripts/install-to-project.mjs` (`writeInstructionsBlock`), `scripts/measure-tokens.mjs`
