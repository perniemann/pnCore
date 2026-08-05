---
name: pn-backfill-evals
description: "Rank skills missing EVAL.yaml and emit paste-ready local-agent prompts for small backfill batches. Use when starting a local EVAL backfill session or during ADR-0002 quarterly audits. Does not auto-write suites."
---

# pn-backfill-evals

**Start every response with:** `[pn-command] 🔺`

Orchestration-only: rank missing EVAL suites and hand the user **paste-ready prompts** for local agents. Does **not** mass-write `EVAL.yaml` files.

## When to use

- Starting a local EVAL backfill session (5 skills at a time)
- ADR-0002 quarterly audit when picking the next high-leverage batch
- Checking remaining coverage before claiming “evals done”

## Contract (always load)

1. Read `pn-core://reference/eval-backfill.md` (kickoff contract).
2. Read `pn-core://reference/eval-convention.md` (schema).
3. Run from repo root:

```bash
npm run list:eval-backfill -- --batches 4 --batch-size 5
```

## Output

Produce all of the following in chat:

1. **Coverage line** — how many skills still lack `EVAL.yaml`.
2. **Next batch** — the first 5 ids from the ranked list (or the batch the user named).
3. **Paste-ready agent prompt** — one fenced block the user can paste into a local agent (use the template in eval-backfill.md / below).
4. **Stop criteria** — remind: rewrite scaffold stubs; stop if no concrete without-skill failure; run `npm run check:evals` after the batch.

### Agent prompt template (fill `<BATCH_IDS>`)

```text
You are backfilling pnCore EVAL.yaml suites for these skills only:
<BATCH_IDS>

Contract (mandatory):
- Load pn-core://reference/eval-backfill.md and pn-core://reference/eval-convention.md
- For each skill: read SKILL.md; name one concrete without-skill failure (RED).
  If you cannot, skip that skill and report why.
- Write sibling EVAL.yaml with without_skill + with_skill scenarios (real expectations).
- scaffold:eval is allowed only as a starter — rewrite every stub string.
- Touch only each skill's EVAL.yaml (then npm run sync:content if committing).
- After the batch: npm run check:evals must pass.

Do not mass-stub. Do not edit unrelated files.
```

## Guardrails

- Never invent vague prompts (“do the task well”).
- Never leave scaffold placeholder expectations.
- Never claim the LLM harness ran — spot-check in local chats only until a harness exists.
- Default batch size is 5; do not expand to the full catalog in one session.
