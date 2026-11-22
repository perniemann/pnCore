---
title: "ADR-0025: Server-side step sequencing and gate provenance"
updated: 2026-11-22
---

# ADR-0025: Server-side step sequencing and gate provenance

## Status

Accepted

## Context

"Determinism is the product" claims that `workflow_step` decides the next step. Before this change it decided only the instruction for whatever step the caller named:

- `workflow_step("full_dev", 6, { reviewComplete: true, skepticOutputPassed: true })` returned `done: true` on a fresh run. No step 0 through 5 had been served.
- `run_id` was optional after step 0. A missing one got a new random id on every call, so one run's trail split into many.
- Strict gate records (`intent: "involved"` or `PNCORE_STRICT_SKEPTIC_GATES`) were checked for shape only. A record `{ verdict, gate_id, confirmed_at }` that the model wrote itself passed, because `gate_id` was never looked up.

The run log (`.pncore/workflow-runs.jsonl`) already records every served step with its `runId`, `workflowType`, `step` and `nextStep`. `workflow_confirm` already logs each gate with a server-issued `gate_id` and its verdict in `.pncore/gate-log.jsonl`.

## Decision

1. **Step 0 starts a run; every later step needs its `run_id`.** `workflow_step` with `step > 0` and no `state.run_id` is refused (`INVALID_STATE`).
2. **Only reachable steps are served.** For the run's `run_id` and workflow type, the reachable set is every step the run log shows as served plus every `nextStep` the engine returned. Repeats and loop-backs stay reachable because the engine emitted them. Any other step is refused with the reachable list.
3. **One cross-workflow entry.** `full_dev` step 5 with `tournamentHandoff: true` is reachable once the same run has a finished `implementation_tournament` entry. The handoff templates now carry `run_id`.
4. **Gate provenance under strict records.** Every gate record in state (`skepticPassed`, `skepticOutputPassed`, `reviewComplete`) must name a `gate_id` that is in the gate log. When the log has a verdict for it, the record's verdict must match. Otherwise the step is refused with `INVALID_GATE`.
5. **The engine points where its instructions point.** The `feature_program` merge phase told the caller to call step 5 while returning `nextStep: 4`. It now returns `nextStep: 5`.
6. **Off only with the run log.** When the operator sets `PNCORE_RUN_LOG=""` (no run log), sequencing has nothing to check against and is skipped. That is an operator setting, not something a model can choose through a tool.

## Consequences

- A caller cannot reach `done` or a late gate without the engine having served the path to it. Resuming in a new chat works unchanged: the run log persists, and the caller passes the same `run_id`.
- Callers that relied on starting mid-workflow without a run break. They start at step 0, or pass the `run_id` of the run they are continuing.
- Strict mode now proves that a gate prompt was issued and what verdict it logged. It still does not prove that a human answered: `workflow_confirm` is model-callable. The `approval_checkpoint` token remains the stronger human gate (`SECURITY.md`, Trust boundary).
- In `full auto` mode a passed gate is still a state key the model sets. README now says so instead of claiming every step passes on an external decision.
- The engine reads the run log and gate log tail on each `workflow_step` (786 KB cap, the same cap as the other trail readers).

## Alternatives rejected

- **Require strictly `step == lastServed + 1`.** It breaks every designed loop-back and repeat. The engine's own `nextStep` values are the contract.
- **Sign server-written trail lines (HMAC).** A per-process key does not survive a server restart between sessions. A persisted key is readable by the same model that could forge lines with shell access. The MCP surface is closed by path rules (0.23.0) and by this ADR, and the shell boundary is documented instead.
- **Make strict gate records the default.** It changes every `full auto` run at once. That is a separate decision about the default intent.
