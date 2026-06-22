---
name: pn-config-review
description: Review configuration and infra changes for production risk. Connection pools, timeouts, memory limits. Use when reviewing config files or infra changes.
---

# Config review

## When to use

- Reviewing PRs or changes that touch configuration files, environment variables, or infra settings.
- Evaluating a numeric limit change (connection pool size, timeout, memory cap) before deployment.
- Auditing production config for security misconfigurations (debug mode, wildcard allowlists, verbose errors).
- Requiring evidence and justification before approving a risky config change.

## Magic-number skepticism

For any numeric value change in configuration:
- **Question:** Why this specific value? What's the justification?
- **Evidence:** Has this been tested under production-like load?
- **Bounds:** Is this within recommended ranges for your system?
- **Impact:** What happens if this limit is reached?

## Danger zones

**Connection pools:** Pool size reduced (connection starvation) or dramatically increased (DB overload). Timeout changes cause cascading failures. Key: `pool_size >= (threads_per_worker × worker_count)`.

**Timeout config:** Request timeouts increased (thread exhaustion). Connection/read/write timeouts modified (false failures, UX).

**Memory/resource limits:** Heap size, buffer sizes, cache limits, thread pool sizes. Requires profiling under load.

**Security config:** Debug mode in production, wildcard allowlists, exposed admin endpoints, verbose errors, SQL query logging.

## Approach

- Default: "This change is risky until proven otherwise"
- Require justification with data, not assumptions
- Suggest safer incremental changes when possible
- Recommend feature flags for risky modifications
- Insist on monitoring and alerting for new limits

## Output

- List of config changes flagged with severity
- Questions to answer before deployment
- Recommended monitoring metrics
- Rollback procedure if change causes issues
