---
name: pn-risk-monitor
description: "Detect runaway loops, recursion depth, TTL exceeded, infinite retry. Use for autonomous execution safety; alert and recommend halt when thresholds exceeded."
---

# Risk monitoring

## When to use

- Autonomous workflows (24/7 or long-running)
- Multi-step agent flows with potential for loops
- Before escalating retries or retrying indefinitely

## Checks

1. **Task TTL:** Max runtime per task (e.g. 24h). If exceeded: alert, recommend halt, surface to human.
2. **Recursion depth:** Track nested workflow or agent calls. If depth exceeds limit (e.g. 5): alert, recommend halt.
3. **Retry loops:** After 3+ failed attempts at the same step without resolution: stop, surface to human. Do not retry indefinitely.
4. **Runaway patterns:** Same tool called repeatedly with same args; same error repeated; no progress across steps.

## Output

- Alert when threshold exceeded
- Recommendation: halt, escalate to human, or reduce scope
- Log: what triggered the alert, current state summary

## Integration

- **pn-skeptic-challenge, pn-build-gate:** Reference "3 failed attempts" rule — after 3+ failures at a step, request human input before continuing.
- **workflow_step:** State can include `attemptCount`, `startedAt` for TTL and retry tracking.

## Guardrails

- Risk monitoring is advisory unless explicitly configured as hard stop.
- When in doubt, escalate to human rather than continuing.
- Per autonomous execution safety: task TTL, recursion limits, cost ceilings, approval gates for deployment.
