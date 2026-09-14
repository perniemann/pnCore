---
title: "ADR-0017: Deterministic trajectory replay in CI"
updated: 2026-09-14
---

# ADR-0017: Deterministic trajectory replay in CI

## Status

Accepted

## Context

`npm run test:full` is software CI for the engine: unit tests, `scripts/validate-workflow-contract.mjs`, and two golden `state → step` cases in `src/fixtures/workflow-replay.json`. None of it grades a *run* — the ordered sequence of `workflow_step` calls one agent makes through a workflow, including same-step phases (`merge`, `github_issues`), parallel fan-outs, loop-backs (design skeptic-on-output → step 3, business_strategy Weak → step 4), and iteration caps that must error until `approval_checkpoint` is used.

That gap matters now because the next two roadmap items change what the engine emits per step (step spans, budget-packed context). Without a recorded run to replay, a routing regression in those changes is unmarked until a user hits it. ADR-0010 deliberately deferred an LLM-judged eval harness; the question here is narrower: can the *deterministic* part of a run be recorded and graded at zero LLM cost?

The run log already exists. Every successful `workflow_step` appends `{ts, runId, workflowType, step, nextStep, gate, done, stateKeys}` to `.pncore/workflow-runs.jsonl`. Two things stopped it from being a replay source: it recorded state *key names* only, while `getWorkflowStep` routes on state *values* (`skepticPassed`, `taskResults` completeness, `pressureTestVerdict`, `intent`, `engine`), and it did not record the routing outputs beyond `nextStep`/`gate`/`done` (`workflowPhase`, `parallel`, task ids).

## Decision

1. **The run log is the recorder.** `workflow_step` now also writes `workflowPhase`, `parallel`, and `taskIds` when present (routing metadata, no content). With **`PNCORE_RUN_LOG_STATE=1`** it adds a `state` snapshot: strings head-capped at 240 chars, `pncoreHumanGateTicket` / approval tokens redacted, depth bounded at 6. Off by default because state carries plan text and task summaries. Everything routing depends on — booleans, enums, short ids, array membership, object keys — survives verbatim, which is the property replay needs.
2. **A trajectory is one run's entries.** `packages/pn-core-mcp/src/trajectory.ts` parses the log, groups by `runId` ordered by `ts`, and builds a fixture: `{name, workflowType, source: recorded|authored, steps: [{step, state, expect}]}` where `expect` is `{nextStep, gate, done, workflowPhase?, parallel?, taskIds?, instructionContains?}` or `{error: <substring>}` for calls the engine must reject.
3. **Grading is exact-match on routing, opt-in on text.** `replayTrajectory` calls `getWorkflowStep` per step and diffs routing fields; instruction text is only checked for `instructionContains` substrings the author names. `checkTrajectoryContinuity` validates the chain independently of the engine (in-range steps, each call continues from the previous routing, nothing after `done`).
4. **Fixtures live in the repo and run in `test:full`.** `src/fixtures/trajectories/*.json` are replayed by `src/trajectory.test.ts` inside `npm run test:coverage`. A drifted route fails CI with `#index step N field: expected X, got Y`. Six fixtures ship: full_dev parallel + merge, full_dev phased specialists, design skeptic loop-back, project_kickoff, business_strategy Weak loop, and an authored design iteration-cap → approval → rebuild case.
5. **Recording is a CLI, not a tool.** `npm run trajectory:record -- --list | --run-id <id> --name <kebab>` (`scripts/record-trajectory.mjs`, thin wrapper over `dist/trajectory.js`) converts a run into a fixture and immediately replays it so the author sees whether the engine already drifted. Refuses runs recorded without state, non-continuous runs, and mixed workflow types.
6. **No LLM in the loop.** Grading step *outputs* (what the agent wrote) stays out of CI per ADR-0010. Recorded fixtures are goldens: they lock current behaviour so intentional changes are reviewed as fixture diffs.

## Consequences

- **Positive:** Routing regressions across whole runs fail CI deterministically and cheaply. Loop-backs, caps, phases, and fan-outs — the parts of `getWorkflowStep` with the most branches — are pinned by realistic sequences rather than isolated cases. Recording a new fixture from a real session is one command. The next roadmap items (step spans, budget-packed context) can add fields to `expect` and be graded the same way.
- **Negative / open:** Goldens generated from the engine are tautological on day one; their value is drift detection, not proof of correctness — the authored fixture and reviewer notes carry intent. Replay runs with default `features.json`; runs recorded under `strictSkepticGates`, `typedEnvelopes`, or `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` will not replay unchanged. `.pncore/` stays git-ignored; enable `PNCORE_RUN_LOG_STATE` only while recording.

## References

- [ADR-0010: Skill EVAL convention and link checking](0010-skill-evals-and-link-checking.md) — LLM-judged harness deferred
- [ADR-0012: dispose-verify, typed envelopes, earned acceptance](0012-mcp-dispose-verify.md) — run-events as the other queryable trail
- `pn-core://reference/workflow-runs-schema.md`
- `packages/pn-core-mcp/src/trajectory.ts`, `src/trajectory.test.ts`, `src/fixtures/trajectories/`, `scripts/record-trajectory.mjs`
