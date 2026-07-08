# Subagent routing

When to use Cursor's Task tool (`subagent_type`, optional `model`, `readonly`) with pnCore workflows. Pair with per-step **`suggestedModelTier`** from `workflow_step` — tier hints apply to the **lead session**; subagents should use the table below unless the step explicitly says otherwise.

When `workflow_step` returns **`orchestrationMode`** (`lead` | `light_delegate` | `implementer`), follow rule **`pn-orchestrator-lead`**: pass **`leadModelTier`** / **`sessionModel`** in state; delegate parallel `tasks[]` using **`subagentTierHints`**, not the lead model.

**Resource:** `pn-core://reference/subagent-routing.md`.

## Disambiguation

| Pattern | Use when | Not when |
|---------|----------|----------|
| **Specialist parallel** (`full_dev` step 4, `parallel: true`) | Different domains (frontend + backend) | Same task, competing implementations |
| **Parallel review panel** | One diff, multiple readonly reviewers | Replacing the mandatory checker |
| **Best-of-N** (`best-of-n-runner`) | Same spec, isolated worktrees, objective verify gates | Security/auth paths, single-file edits, shared mutable state |
| **Explore** | Repo search, orient, blast-radius | Implementation or review |

See also: `pn-core://reference/parallel-rules.md`; model tier names and exemplars in `packages/pn-core-mcp/src/model-tiers.ts` (surfaced via MCP `suggest_model_tier` and `workflow_step` → `suggestedModelTier`).

## Routing table

| Task class | `subagent_type` | Suggested model tier | Notes |
|------------|-----------------|----------------------|-------|
| Repo search / orient | `explore` (quick or medium) | **fast** | Read-only; no writes |
| Scoped implementation slice | `generalPurpose` | **standard** | One specialist scope from `workflow_step` tasks |
| Phase checker (maker ≠ checker) | `generalPurpose`, `readonly: true` | **standard** | Load `pn-review-optimize-loop`; required by `pn-build-gate` |
| Bug-pattern review on diff | `bugbot`, `readonly: true` | **standard** | High-risk slices only; parallel with checker |
| Security review on diff | `security-review`, `readonly: true` | **premium** | Auth, RLS, payments; parallel with checker — **augments**, never replaces |
| CI failure triage | `ci-investigator` | **fast** / **standard** | One failing check; readonly |
| Shell / git / npm commands | `shell` | **fast** | Deterministic commands only |
| Same-spec N attempts | `best-of-n-runner` | **standard** per path; **premium** judge | P1 pilot — see `pn-design-variants`; hard verify gates before judge |
| Long-horizon loop lead | Lead session (not Task) | **long_horizon** | Multi-hour `/loop`, escalation queue; see `loop-orchestration-guide.md` |
| Routine loop tick | `explore` or `shell`, readonly | **fast** | CI watch, dependency audit, doc drift — escalate after 2 same failures |

## Escalation queue (cheap → long_horizon)

For scheduled loops ([`loop-catalog/escalation-queue.md`](loop-catalog/escalation-queue.md)):

1. **Default tick:** fast tier (`explore` / `shell`, readonly when possible).
2. **After 2 verification failures** on the same finding (recorded in `.pncore/loops/<id>/STATE.md`): bump lead to **long_horizon** (e.g. claude-fable-5) for replanning only; delegate edits to **standard** `generalPurpose` subagents.
3. **Log every escalation** in STATE `Escalations` table; downgrade when verify passes or turn cap hit.

Never start a routine maintainer loop on long_horizon — Fable is for orchestration and escalation, not every tick.

## Parallel review panel (high-risk slices)

When a phase touches **auth, RLS, payments, or secrets**, spawn **in parallel** (same turn):

1. **Checker** — `generalPurpose`, `readonly: true`, pn-reviewer + `pn-review-optimize-loop` (required)
2. **Bugbot** — `bugbot`, `readonly: true`, scoped to phase diff
3. **Security review** — `security-review`, `readonly: true`, scoped to phase diff

Lead agent **synthesizes** the three reports into `docs/audits/checker-YYYY-MM-DD-<slice>.md` (or a sibling `review-panel-*.md`). Do not skip the checker because bugbot or security-review ran.

## Task tool parameters

```text
Task({
  subagent_type: "explore" | "generalPurpose" | "shell" | "bugbot" | "security-review" | "ci-investigator" | "best-of-n-runner",
  readonly: true,          // review/check paths only (checker, bugbot, security-review, ci-investigator)
  model: "<optional>",     // override when tier table differs from lead session
  description: "<short>",
  prompt: "<agent id + scope + skills to load>"
})
```

**When not to delegate:** single-file edits, sequential shared-state work, or tasks the lead can finish in one pass — see `pn-core://reference/prompt-provider-knobs.md` (Subagents).

## Model tier ↔ Cursor picker (June 2026)

| pnCore tier | Exemplar | Alternates |
|-------------|----------|------------|
| **fast** | composer-2.5-fast | gemini-3-flash |
| **standard** | claude-4.6-sonnet-medium-thinking | gpt-5.3-codex, gpt-5.5-medium |
| **premium** | claude-opus-4-8-thinking-high | — |
| **premium_thinking** | claude-opus-4-8-thinking-high + MAX | Downgrade via `PNCORE_FEATURES.tierAliases` |
| **long_horizon** | claude-fable-5 | Loop orchestration, escalation; alias to `premium` if Fable unavailable |

MCP `suggest_model_tier` with `role: "orchestrator"` returns **long_horizon**. See `pn-core://reference/loop-orchestration-guide.md`.

Bump exemplars in `packages/pn-core-mcp/src/model-tiers.ts` when the Cursor picker rotates.

## Overrides

- Per-step: `PNCORE_FEATURES.modelTierOverrides` — key `<workflowType>.<step>`
- Global remap: `PNCORE_FEATURES.tierAliases` — e.g. `{"premium_thinking":"premium"}`

## Related rules

- **pn-build-gate** — phase-complete checker + parallel review panel
- **pn-design-variants** — parallel explore (design); **pn-best-of-n** — implementation tournament (P1 pilot)
- **pn-best-of-n** — `/pn-best-of-n`; contract `pn-core://reference/schemas/best-of-n.contract.json`
