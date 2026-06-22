---
name: pn-ship-checklist
description: Pre-production gate — compose tests, security smoke, config, rollback, flags, and monitoring before release. Use before deploy or launch; links deeper skills instead of duplicating runbooks.
---

# Ship checklist

## When to use

- Cut for production, staging promotion, or high-risk release
- First launch of a feature behind a flag or progressive rollout
- User asks "are we ready to ship?" or "what's left before deploy?"

## Checklist (adapt to project)

**Quality**

- [ ] CI green: tests, lint, typecheck as defined by the repo
- [ ] **pn-verification-before-completion** satisfied for this change (commands run, outputs read — not "should pass")

**Security & supply chain (sample)**

- [ ] No secrets in diff; **pn-security-audit** or project equivalent when surface area warrants
- [ ] Critical dependency issues addressed or explicitly accepted

**Config & ops**

- [ ] **pn-config-review** when infra/env changed (pools, timeouts, URLs, feature flags)
- [ ] Rollback path documented: revert commit, flag off, or migration down — whichever applies

**Release mechanics**

- [ ] Feature flag / staged rollout plan if partial exposure
- [ ] **pn-smoke-tests** or project smoke after deploy when applicable

**Monitoring & comms**

- [ ] What to watch post-ship (metrics, errors, SLO)
- [ ] Stakeholders or changelog updated when user-visible

**Deprecation / API**

- [ ] If removing or changing contracts: **pn-deprecation-and-removal** or versioning policy satisfied

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "We'll roll forward only." | Rollforward is not always possible; define rollback before push. |
| "Smoke tests are optional for small change." | Small changes break integration boundaries often. |
| "Monitoring can wait until tomorrow." | The first hours after ship are the cheapest time to detect regressions. |
| "I'll run tests mentally." | Run them and read output. |

## Red flags — stop

- Ship with known failing CI or silently skipped test suites.
- No owner for post-deploy observation.

## Verification

- Checklist filled with **done** / **N/A + reason**; cite command outputs or ticket links where the team requires proof.

## Guardrails

- This skill is a **composable gate**, not a replacement for **pn-devops-automation**, database migration skills, or org-specific SOC processes.
- For **product** org rollout and change management, see **pm** skills (e.g. adoption playbooks).

## Integration

- **pn-devops-automation** — pipelines and IaC depth
- **pn-smoke-tests** — post-deploy verification
- **pn-review-optimize-loop** — pre-ship quality pass
- **pn-deprecation-and-removal** — API and feature sunset coordination

## Output

- Completed checklist summary, residual risks, and explicit ship/no-ship recommendation.
