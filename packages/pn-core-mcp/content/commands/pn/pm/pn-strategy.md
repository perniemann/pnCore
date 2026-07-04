---
name: pn-strategy
description: Business strategy workflow — evidence-led pressure-test of a startup idea or codebase-derived angle. Runs framing, evidence gathering, strategic frame, grill, pressure-test (Strong/Weak/Pivot), and delivers an HTML brief + markdown digest.
---

# pn-strategy

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-business-strategy-orchestration")`. Then call `workflow_step({ workflowType: "business_strategy", step: 0, state: { mode, repoPath? } })` and follow each returned instruction.

> **Tool-schema note:** The MCP tool uses `workflowType` (camelCase) and `step` (not `workflow_type` / `workflow_step`). If the workflow type is not enumerated by your installed MCP server (older pnCore builds shipped without `business_strategy`), fall back to the orchestration-skill-only path: keep `get_skill("pn-business-strategy-orchestration")` loaded and follow its 9-step contract manually (state shape, evidence-log protocol, HITL gates), using `workflow_handoff_append` for the evidence log. Both paths produce the same deliverables.

Evidence-led business strategy: framing → evidence → strategic frame → grill → pressure-test verdict → skeptic → lock → deliver.

## Flags

| Flag | Effect |
|------|--------|
| `--from-repo <path>` | Sets `state.mode = "codebase"` and `state.repoPath = <path>`. Activates step 1 (codebase-to-strategy) to derive N≤3 candidate angles from the repo before evidence gathering. |
| `--mode idea\|codebase\|hybrid` | Explicit mode override. Default: `"codebase"` if `--from-repo` is set; `"idea"` otherwise. `"hybrid"` requires explicit flag — mixes repo intake with a user-supplied idea description. |
| `--continue <run_id>` | Resume a prior run. Calls `workflow_state_load` + `workflow_handoff_read`, then jumps to the persisted `nextStep` with restored state. |

## When to use

| Signal | Use `/pn-strategy` |
|--------|--------------------|
| You have a startup / product idea to pressure-test | Yes — `--mode idea` (default) |
| You have a codebase and want strategic angles | Yes — `--from-repo <path>` |
| You want to resume a strategy run across sessions | Yes — `--continue <run_id>` |
| You want a quick one-pass verdict without discussion | No — use `/pn-pressure-test` directly |
| You want a technical implementation plan reviewed | No — use `/pn-grill` or `/pn-skeptic` |
| The ask is meta-analysis, process design, or optimization | **No — state the mismatch** ("You invoked `/pn-strategy` but the ask is `Y`; I'll re-route unless you'd rather I run pn-strategy as written") |

## What you get

- **Verdict:** Strong / Weak / Pivot (from `pn-pressure-test` 6-row scorecard)
- **Scorecard:** Pain intensity, buyer clarity, urgency, differentiation, speed to validate, founder advantage
- **Fatal flaws and kill criteria**
- **First 10 customers:** who exactly, and how to find them
- **MVP wedge:** smallest hypothesis-proving step
- **Auditable evidence log:** every claim cited with source, verbatim quote, and companion provenance
- **HTML brief:** `docs/strategy/[slug]-strategy-brief.html` — stakeholder-ready, single-file, inline CSS
- **Markdown digest:** `docs/strategy/[slug]-strategy-brief.md` — machine-readable, parseable, canonical data source

## Guardrails

- Verdict cannot lock if any of the 6 scorecard rows lacks ≥1 evidence entry
- Weak verdict loops back to grill (cap = 2 iterations; approval_checkpoint required after cap)
- Pivot verdict terminates the run — delivers a pivot-path artifact; start a fresh run for the new thesis
- Citation truthfulness is human-guaranteed (audit gate at step 7); the workflow surfaces provenance, not absolute truth
- Market stats without a source are flagged `[est.]` — never fabricated
