# EVAL.yaml local-agent backfill contract

Kickoff contract for filling missing skill evaluation suites with **local** agents (not cloud mass-jobs). Pairs with `pn-core://reference/eval-convention.md`, ADR-0010, and ADR-0002 quarterly audits.

## Overview

- **Goal:** Real with/without-skill scenarios for high-leverage skills first.
- **Anti-goal:** Mass `scaffold:eval` stubs left unedited — false confidence.
- **Operator:** Human opens local Cursor agents; this doc is the shared contract.

## Priority order

1. `discipline`
2. `orchestration`
3. `ci`
4. `review`
5. `backend`
6. `frontend`
7. Other categories

Within a category: newer `SKILL.md` git mtime first. Refresh the ranked list anytime:

```bash
npm run list:eval-backfill
npm run list:eval-backfill -- --batches 4 --batch-size 5
```

## Batch size

- Default batch: **5 skills**
- One local agent per batch (or one agent per skill if you want tighter ownership)
- Stop after each batch: `npm run check:evals` + review expectations before the next batch

## Per-skill agent contract (hard rules)

For each skill id in the batch:

1. Read `packages/pn-core-mcp/content/skills/<cat>/<id>/SKILL.md` (and `get_skill("<id>")` when MCP is available).
2. Name **one concrete without-skill failure mode** (RED). If you cannot, **stop** on that skill and report why — do not invent a vague prompt.
3. Write sibling `EVAL.yaml` with at least:
   - `without_skill: true` scenario (expectation = the observed/expected violation)
   - `with_skill: true` scenario (same task; expectation = compliance with the skill’s core rule)
   - Optional `quadrant` tags per eval-convention (2×2 Accuracy × Efficiency)
4. `npm run scaffold:eval -- <id>` is allowed only as a file starter — **rewrite every stub string** before finishing.
5. Do not edit other skills, rules, or unrelated docs.
6. After the batch: `npm run check:evals` and `npm run sync:content` if you will commit.

## Spot-check (recommended)

For at least one skill per batch, open two local chats:

- Chat A: run the without-skill prompt without loading the skill
- Chat B: same prompt with the skill loaded

Adjust `expectation` lines to match real behavior before merge.

## Cadence

| Mode | When |
|------|------|
| Opportunistic | Any PR that edits a `SKILL.md` adds/refreshes its `EVAL.yaml` |
| Ranked batch | Local agents, 5 at a time, priority order above |
| Quarterly | ADR-0002 audit picks the next 15–25 high-leverage missing suites |

## Orchestration command

`/pn-backfill-evals` (skill-adjacent command) prints the ranked list and the paste-ready agent prompt for a batch.

## Related

- `pn-core://reference/eval-convention.md` — schema
- `pn-writing-skills` — RED/GREEN authoring
- ADR-0010 — gates and deferred LLM harness
- ADR-0002 — quarterly audit cadence
