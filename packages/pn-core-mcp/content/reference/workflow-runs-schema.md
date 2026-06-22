# Workflow runs log schema

Each successful `workflow_step` call appends one JSON object (one line) to `.pncore/workflow-runs.jsonl` (or the path in `PNCORE_RUN_LOG`).

## Entry shape

```json
{
  "ts": "2025-03-06T12:00:00.000Z",
  "workflowType": "full_dev",
  "step": 0,
  "nextStep": 1,
  "gate": "human",
  "done": false,
  "stateKeys": ["intent"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ts` | string (ISO 8601) | Timestamp when the step was executed |
| `workflowType` | string | One of design, full_dev, project_kickoff, prompt_optimize, frontend_audit, backend_audit, image_create, visual_tweak, game_feature, svg_create |
| `step` | number | Step index passed to `workflow_step` |
| `nextStep` | number | Step index returned for the next call |
| `gate` | string | Gate type for this step: `"human"` (requires user confirmation) or `"model"` (model proceeds autonomously) |
| `done` | boolean | Whether the workflow is complete |
| `stateKeys` | string[] | Keys present in state with non-null values |

## Use cases

- Run analysis: which gates are hit, step counts per workflow
- Gating optimization: correlate gate names with outcomes before tuning instructions
- Debugging: trace step order and state keys through a run

## Config

- **Path:** Default `.pncore/workflow-runs.jsonl` (relative to process cwd). Override with `PNCORE_RUN_LOG`.
- **Disable:** Set `PNCORE_RUN_LOG=` (empty) to turn off logging.
