# Loop catalog (dev starter set)

Copy-paste loop templates for software delivery. Each template follows the five-part anatomy in [`../loop-orchestration-guide.md`](../loop-orchestration-guide.md). Initialize STATE per [`STATE-schema.md`](STATE-schema.md).

**Resource:** `pn-core://reference/loop-catalog/README.md`.

## Quick start

1. Copy a template below into your session (or save under `docs/loops/<id>.md`).
2. Create `.pncore/loops/<loop-id>/STATE.md` from the schema.
3. Run manually; read STATE.
4. Schedule with Cursor `/loop <interval>` when stable.
5. Route routine ticks to **fast** tier; escalate per template.

## Catalog

| Id | Risk | Default tier | File |
|----|------|--------------|------|
| `ci-babysitter` | yellow | fast | [`ci-babysitter.md`](ci-babysitter.md) |
| `validate-until-green` | green | standard | [`validate-until-green.md`](validate-until-green.md) |
| `dependency-audit` | green | fast | [`dependency-audit.md`](dependency-audit.md) |
| `dependency-upgrade-watch` | yellow | fast | [`dependency-upgrade-watch.md`](dependency-upgrade-watch.md) |
| `flaky-test-hunter` | green | standard | [`flaky-test-hunter.md`](flaky-test-hunter.md) |
| `docs-drift-catcher` | green | fast | [`docs-drift-catcher.md`](docs-drift-catcher.md) |
| `aging-pr-review` | yellow | fast | [`aging-pr-review.md`](aging-pr-review.md) |
| `escalation-queue` | green | fast → long_horizon | [`escalation-queue.md`](escalation-queue.md) |

## Model routing summary

| Loop tick class | Tier | Task subagent |
|-----------------|------|---------------|
| Status read, grep, npm outdated | **fast** | `explore` or `shell` |
| Single-file fix, test run | **standard** | lead or `generalPurpose` |
| Auth/security slice review | **premium** | `security-review`, readonly |
| 2+ failures same issue | **long_horizon** | lead session (Fable) |
| Tournament judge | **premium_thinking** | after objective gates |

See [`../subagent-routing.md`](../subagent-routing.md) and MCP `suggest_model_tier`.
