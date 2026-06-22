---
name: pn-devops-automation
description: CI/CD pipelines, IaC, container orchestration, monitoring, alerting. Use when setting up or improving deployment, monitoring, or infra automation.
---

# DevOps automation

## When to use

- CI/CD pipeline design or improvement.
- Infrastructure as Code (Terraform, CloudFormation).
- Docker, Kubernetes, deployment strategy.
- Monitoring, alerting, zero-downtime deploys.

## Workflow

1. **Assess:** Current infra, deployment pain points.
2. **Design:** Pipeline stages, deployment strategy (blue-green, canary).
3. **Implement:** IaC, CI config, monitoring/alerting.
4. **Verify:** Rollback procedure, runbooks.

## Output

- Pipeline or IaC changes with stages, deployment strategy, rollback path, and monitoring or alerting hooks described for operators.

## Guardrails

- No secrets in VCS; follow **pn-backend-philosophy** for credentials and **pn-config-review** for pools, timeouts, and limits.

## Integration

- **pn-ci-triage**, **pn-ci-fix** — CI pipeline fixes.
- **pn-ci-dev-prod-split** — Environment separation.
- **pn-config-review** — Connection pools, timeouts.
- **pn-backend-philosophy** — Secrets, error handling.
