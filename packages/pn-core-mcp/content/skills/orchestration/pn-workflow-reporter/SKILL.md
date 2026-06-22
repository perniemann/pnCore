---
name: pn-workflow-reporter
description: Daily or weekly workflow summaries: task status, workflow health, token usage. Use for operating cadence and observability.
---

# Workflow reporter

## When to use

- Operating cadence: daily report, weekly summary
- After major workflow completion (full_dev, design, project_kickoff)
- When user requests "workflow status" or "what was built"

## Workflow

1. **Gather data:** Workflow runs (`.pncore/workflow-runs.jsonl` if present), usage (`.pncore/usage.jsonl` if present), task status from Paperclip (when integrated).
2. **Synthesize:** Phases completed, successes, failures, fixes applied. Token/cost summary if available.
3. **Output:** Markdown or structured report: date range, workflows run, status per workflow, recommendations.

## Output format

```markdown
# Workflow Report — YYYY-MM-DD

## Summary
- Workflows run: [count]
- Success: [count]
- In progress: [count]
- Failed: [count]

## By workflow
| Workflow | Step | Status | Notes |
|----------|------|--------|-------|
| ... | ... | ... | ... |

## Token/cost (if available)
...

## Recommendations
...
```

## Integration

- **pn-release-notes, pn-docs-sync:** For delivery-focused reports. This skill is for operational status.
- **report_usage:** When client reports usage, aggregate for cost section.
