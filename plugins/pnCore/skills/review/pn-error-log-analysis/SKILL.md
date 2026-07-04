---
name: pn-error-log-analysis
description: "Log parsing, stack-trace analysis, error correlation across systems. Use when debugging from logs or investigating production errors."
---

# Error log analysis

## When to use

- Debugging production or staging errors from logs
- Stack trace analysis across languages
- Error correlation across distributed systems
- Building monitoring queries or alerting

## Focus areas

- Log parsing and error extraction (regex patterns)
- Stack trace analysis (language-specific)
- Error correlation with deployments or changes
- Common error patterns and anti-patterns
- Log aggregation queries (Elasticsearch, Splunk, etc.)
- Anomaly detection in error rate or volume

## Example

- **Extract stack traces from logs:** `grep -E '^\s+at\s+|^\s+at\s+[^\s]+\s+\('` (Node/JS) or search for `Traceback (most recent call last):` (Python). Isolate the first frame in the app (not node_modules or stdlib) as the likely fault.
- **Correlate by time:** Filter logs to a 5–15 minute window around the first reported error; look for preceding warnings or timeouts that could have triggered the failure.

## Approach

1. Start with error symptoms; work backward to cause
2. Look for patterns across time windows
3. Correlate errors with deployments or config changes
4. Check for cascading failures (timeout chains)
5. Identify error rate changes and spikes

## Output

- Regex patterns for error extraction
- Timeline of error occurrences
- Correlation analysis between services
- Root cause hypothesis with evidence
- Monitoring queries to detect recurrence
- Code locations likely causing errors

## Guardrails

- Focus on actionable findings
- Include both immediate fixes and prevention strategies
- Use with pn-systematic-debugging for full reproduce→isolate→fix flow
