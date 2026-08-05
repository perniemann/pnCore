# Skill EVAL.yaml convention

Static evaluation suites for pnCore skills. Inspired by Google Agent Skills practice (with/without skill comparison; Accuracy × Efficiency matrix). This document defines the **convention and schema**; a full continuous LLM eval harness is deliberately out of scope (see ADR-0010).

## Overview

Every **new** skill should ship a sibling `EVAL.yaml` next to `SKILL.md`. Existing skills may add suites incrementally. Validators treat missing EVAL files as advisory warnings (`npm run check:evals`).

Scaffold a starter file:

```bash
npm run scaffold:eval -- <skill-id>
```

Then fill in real prompts and expectations, and run `npm run sync:content`.

## Schema

```yaml
skill: pn-example          # required; must match the skill folder id
owner: optional-handle     # optional maintainer accountability

scenarios:                 # required; at least one
  - id: without-baseline
    prompt: "…"
    expectation: "…"
    without_skill: true
    quadrant: inaccurate_inefficient

  - id: with-skill
    prompt: "…"
    expectation: "…"
    with_skill: true
    quadrant: accurate_efficient
```

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| `skill` | yes | Must equal the folder name (`pn-…`) |
| `owner` | no | Human accountability (not CODEOWNERS) |
| `scenarios[].id` | yes | Stable id for the case |
| `scenarios[].prompt` | yes | What to ask the agent |
| `scenarios[].expectation` | yes | Pass criteria / observable behavior |
| `scenarios[].with_skill` | no | `true` when the skill is loaded |
| `scenarios[].without_skill` | no | `true` for RED baseline without the skill |
| `scenarios[].quadrant` | no | Accuracy × Efficiency label (below) |

## With vs without skill

Pair scenarios when possible:

1. **without_skill** (RED): agent fails or skips the rule without the skill.
2. **with_skill** (GREEN): same prompt with the skill loaded; agent complies.

This matches TDD-for-skills in `pn-writing-skills`.

## Accuracy × Efficiency (2×2)

Optional `quadrant` tags the intended outcome cell:

| Quadrant | Meaning |
|----------|---------|
| `accurate_efficient` | Correct and token/time efficient (goal for with-skill) |
| `accurate_inefficient` | Correct but wasteful |
| `inaccurate_efficient` | Fast/wrong |
| `inaccurate_inefficient` | Wrong and wasteful (typical without-skill baseline) |

A skill earns its keep when with-skill moves outcomes toward `accurate_efficient` versus without-skill.

## Cadence (convention)

| When | What |
|------|------|
| On submit (PR) | **New** `SKILL.md` additions require sibling `EVAL.yaml` (CI error). Existing suites must parse cleanly. |
| Existing skills | Missing EVAL.yaml is advisory; backfill during ADR-0002 quarterly audits (high-leverage first). |
| Manual / future harness | Re-run scenarios with/without skill; score Accuracy × Efficiency; record in audit notes. |

### CI gates (`npm run check:evals`)

- **Error:** malformed `EVAL.yaml`, or a newly added skill without `EVAL.yaml`.
- **Advisory:** count of skills still missing suites.
- Escape hatch for local WIP: `PNCORE_STRICT_EVALS=0`.

Runtime LLM scoring and weekly automated regressions are **not** gated in CI yet (see ADR-0010). Treat EVAL.yaml as the durable test plan until a harness lands.

### What a full harness still needs (deferred)

1. An agent runner that executes each scenario with and without `get_skill`.
2. Rubric scoring for accuracy + token/time efficiency (2×2).
3. On-submit + weekly scheduled jobs with stable baselines.
4. Multi-framework repeats for statistical confidence (Google’s bar).

Do **not** mass-generate stub EVAL.yaml for all skills — empty suites create false confidence. Author real with/without pairs when touching a skill.

### Local-agent backfill (kickoff)

For ranked batches and the paste-ready agent contract, see `pn-core://reference/eval-backfill.md` and `/pn-backfill-evals`. List missing suites:

```bash
npm run list:eval-backfill -- --batches 4 --batch-size 5
```

## Related

- `pn-writing-skills` — authoring workflow
- `pn-core://reference/eval-backfill.md` — local-agent kickoff contract
- `pn-core://reference/best-practices.md` — evals before shipping prompt changes
- ADR-0010 — decision record for gates and deferred LLM harness
- `npm run check:evals` / `npm run check:links` / `npm run list:eval-backfill`
