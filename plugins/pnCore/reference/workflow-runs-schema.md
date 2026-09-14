# Workflow runs log schema

Each successful `workflow_step` call appends one JSON object (one line) to `.pncore/workflow-runs.jsonl` (or the path in `PNCORE_RUN_LOG`).

## Entry shape

```json
{
  "ts": "2025-03-06T12:00:00.000Z",
  "runId": "5b1f0c6e-2b1e-4a1c-9c7c-3f0e9a1d2b34",
  "workflowType": "full_dev",
  "step": 0,
  "nextStep": 1,
  "gate": "human",
  "done": false,
  "stepIndex": 0,
  "sinceLastStepMs": null,
  "engineMs": 0.42,
  "stateKeys": ["intent"],
  "state": { "intent": "full_auto" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ts` | string (ISO 8601) | Timestamp when the step was executed |
| `runId` | string | Run correlation id (`state.run_id` when the caller passes one, else minted per call); shared with `usage.jsonl`, `run-events.jsonl`, `workflow-handoff.jsonl`, and human-gate tickets |
| `workflowType` | string | One of the public workflow types (`list_workflow_types`) |
| `step` | number | Step index passed to `workflow_step` |
| `nextStep` | number | Step index returned for the next call |
| `gate` | string | Gate type for this step: `"human"` (requires user confirmation) or `"model"` (model proceeds autonomously) |
| `done` | boolean | Whether the workflow is complete |
| `workflowPhase` | string (optional) | Same-step phase the engine entered (`merge`, `github_issues`, `tournament_*`); absent otherwise |
| `parallel` | boolean (optional) | `true` when the step fanned out parallel specialist tasks |
| `taskIds` | string[] (optional) | `tasks[].id` of the fan-out, when present |
| `stepIndex` | number | Step span (ADR-0018): 0-based position of this call within the run (`runId`), monotonic per run. Recovered from the log tail after a server restart |
| `sinceLastStepMs` | number \| null | Wall time since the previous `workflow_step` of the same run — the agent's working time for the previous step. `null` on the first call of a run |
| `engineMs` | number | Time inside `getWorkflowStep` plus gate checks (two decimals). Tells engine cost apart from agent time |
| `stateKeys` | string[] | Keys present in state with non-null values |
| `state` | object (optional) | Snapshot of the state passed to the call. Present only when the server runs with `PNCORE_RUN_LOG_STATE=1`. Strings are head-capped at 240 chars (`…[+N chars]` marker), `pncoreHumanGateTicket` / approval tokens are replaced with `"[redacted]"`, nesting is bounded at depth 6. Booleans, enums, short ids, array membership, and object keys — everything routing depends on — are preserved verbatim |

## Use cases

- Run analysis: which gates are hit, step counts per workflow
- Gating optimization: correlate gate names with outcomes before tuning instructions
- Debugging: trace step order and state keys through a run
- **Step spans (ADR-0018):** `workflow_run_query` with `kinds: ["step"]` returns these entries (without `state`) as events; `timeline: true` joins them with `skill-load-log.jsonl` (loads carry the `stepIndex` they happened under), `usage.jsonl`, `workflow-handoff.jsonl`, `gate-log.jsonl`, and `run-events.jsonl` into one per-step view with totals, `wallMs`, and the slowest step by `sinceLastStepMs` — the answer to *where* a run spent its time
- **Trajectory replay (ADR-0017):** with `PNCORE_RUN_LOG_STATE=1`, one run's entries become a replay fixture. `npm run trajectory:record -- --run-id <id> --name <fixture-name>` writes `packages/pn-core-mcp/src/fixtures/trajectories/<fixture-name>.json`; `src/trajectory.test.ts` replays every fixture through `getWorkflowStep` in `npm run test:full` and fails on any routing drift (nextStep, gate, done, workflowPhase, parallel tasks). Use `--list` to see recorded runs.

## Config

- **Path:** Default `.pncore/workflow-runs.jsonl` (relative to process cwd). Override with `PNCORE_RUN_LOG`.
- **Disable:** Set `PNCORE_RUN_LOG=` (empty) to turn off logging.
- **State snapshot:** `PNCORE_RUN_LOG_STATE=1` adds the `state` field. Off by default because state may carry plan text and task summaries; enable it while recording trajectories, and keep `.pncore/` out of version control.
