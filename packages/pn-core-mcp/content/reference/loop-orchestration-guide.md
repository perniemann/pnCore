# Loop orchestration guide

How to design agent loops, route subagents across model tiers (including long-horizon models such as Anthropic Fable 5.1), and map frontier patterns onto pnCore. Pair with [`best-practices.md`](best-practices.md) §10, [`subagent-routing.md`](subagent-routing.md), and the starter templates under [`loop-catalog/`](loop-catalog/README.md).

**Resource:** `pn-core://reference/loop-orchestration-guide.md`.

## Prompt → Context → Loop stack

| Layer | Optimize | Unit | pnCore owner |
|-------|----------|------|----------------|
| **Prompt** | Wording, structure, proof contract | One turn | `pn-prompt-optimize`; `prompt-provider-knobs.md` |
| **Context** | What enters the window each turn | One inference | `pn-context-engineering`; `pn-budget-cost-monitor` |
| **Loop** | Who runs, when, when to stop | Many turns | `workflow_step`; `pn-loop`; Cursor `/loop`; loop catalog |

**Design principle:** stop micromanaging turns; write **goals, verifiers, state files, and model routes**. The loop decides what to prompt next.

Sources: [Anthropic — Getting started with loops](https://claude.com/blog/getting-started-with-loops), [Machina Fable Loop Library](https://x.com/EXM7777/status/2073432521954697653) (compiled: [BlockTempo](https://www.blocktempo.com/fable-loop-library-25-workflows-autopilot/)), Karpathy AutoResearch / `program.md` pattern ([The New Stack](https://thenewstack.io/karpathy-autonomous-experiment-loop/)).

---

## Loop taxonomy (2026)

| Loop type | You hand off | Trigger | Stop | Primitive | pnCore analog |
|-----------|--------------|---------|------|-----------|---------------|
| **Turn-based** | Verification skill | User prompt | Agent judges done | Skills + tools | Single turn + verification skills |
| **Goal-based** | Stop condition | `/goal` or explicit criteria | Goal met OR max turns | Evaluator model | `pn-loop` + paste-proof criteria |
| **Time-based** | Schedule | Interval | Cancel or work completes | `/loop`, `/schedule` | Cursor `/loop` + catalog templates |
| **Proactive** | Recurring prompt | Event/cron | Per-task goal; routine until off | Compose above + workflows | `workflow_step` + Task subagents |

### pnCore loop ids (do not conflate)

| Id | Ends when | Review? | Skeptic? |
|----|-----------|---------|----------|
| `pn-loop` | Verification command exits 0 | No | No |
| `pn-review-optimize-loop` | One review + optimize (+ one fix re-run) | Yes | No |
| Build-phase loop | Checker pass + user `continue` | Yes (separate Task) | Risk-tiered |
| `full_dev` step 5 | Gate records for review + skeptic | Yes | Yes |
| Cursor `/loop` | User stops scheduler | Per prompt | Per prompt |
| **Catalog loop** | Template stop + STATE updated | Per template | Per template |

Full build-phase recipe: `best-practices.md` §10.1.

---

## Five-part loop anatomy (Karpathy / Machina)

Every durable loop should define:

1. **Schedule** — when it wakes (manual, `/loop 5m`, cron, workflow step).
2. **One change per round** — fix the single highest-priority issue; never “fix everything.”
3. **Same check every round** — comparable metric (test exit code, script JSON, score).
4. **STATE file** — `.pncore/loops/<loop-id>/STATE.md` (see [`loop-catalog/STATE-schema.md`](loop-catalog/STATE-schema.md)).
5. **Stop point** — hard turn cap + definitions of **done** vs **stuck**.

Karpathy AutoResearch adds: **editable asset** (one bounded surface), **scalar metric** (unambiguous direction), **time-boxed cycle**.

---

## HITL risk colors

| Color | Autonomy | Examples |
|-------|----------|----------|
| **Green** | Safe unattended | Read-only monitors; write only loop STATE |
| **Yellow** | Draft; human sends | PR descriptions, comment drafts, copy edits |
| **Red** | Never alone | Prod deploy, billing, customer-facing sends |

Money, production, and external messaging always end with a human in pnCore loops (see `approval_checkpoint`, `pn-build-gate`).

---

## Paste-proof completion (`/goal` and evaluators)

Claude Code `/goal` evaluators typically **only see chat**, not files or live sites.

| Bad criterion | Good criterion |
|---------------|----------------|
| “Tests pass” | “Paste full output of `npm run validate` showing exit 0” |
| “Lighthouse ≥ 90” | “Paste Lighthouse JSON summary with performance ≥ 90” |
| “STATE updated” | “Paste the DONE section from STATE.md” |

If a criterion cannot be pasted, the agent must paste the failure reason and **stop**. This matches `pn-loop` (verification command output) and `pn-verification-before-completion`.

---

## Subagent orchestration + model tiers

See [`subagent-routing.md`](subagent-routing.md) for Task parameters. Summary:

| Pattern | Use when |
|---------|----------|
| **Explore** subagent | Repo search, orient (fast tier) |
| **generalPurpose** builder | Scoped implementation (standard) |
| **Checker** Task, `readonly: true` | Maker ≠ checker (standard) |
| **Parallel panel** | Auth/RLS/payments: checker + bugbot + security-review |
| **best-of-n-runner** | Same spec, isolated worktrees |
| **Long-horizon lead** | Multi-hour orchestration, escalation after cheap failures |

### Model tier ladder

| Tier | Exemplar | Use |
|------|----------|-----|
| **fast** | composer-2.5-fast | Triage, explore, shell, routine loop ticks |
| **standard** | claude-4.6-sonnet-medium-thinking | Implementation, checker |
| **premium** | claude-opus-4-8-thinking-high | Security review, skeptic, planning |
| **premium_thinking** | Opus + MAX | Judge, strategic frame, best-of-N |
| **long_horizon** | claude-fable-5-1 | Sustained orchestration, escalation |

Resolve tiers via MCP `suggest_model_tier` (`role`: explorer | builder | judge | checker | **orchestrator**). Override with `PNCORE_FEATURES.modelTierOverrides` and `tierAliases`.

### Escalation queue (cheap → long_horizon)

Default loop tick: **fast** or **standard**. Escalate to **long_horizon** (Fable) only when:

- Two consecutive verification failures on the **same** finding, recorded in STATE; or
- The loop template marks the slice as long-horizon (migration, cross-repo audit).

Document each escalation in STATE (`escalations` table). Downgrade back to standard after the escalated pass succeeds or hits its turn cap.

**Fable knobs:** Fable 5.1 thinking is always on (tune **effort**, not `budget_tokens`); file/memory state for multi-window runs; task budgets when available; prompt-cache stable prefix ($0.25/MTok reads) — see `prompt-provider-knobs.md` (Anthropic / Fable 5.1).

---

## Cursor `/loop` bridge

Cursor’s `/loop` skill schedules recurring local prompts (fixed interval or self-paced). pnCore does **not** replace it; combine:

1. Pick a template from [`loop-catalog/`](loop-catalog/README.md).
2. Create `.pncore/loops/<id>/STATE.md`.
3. Run manually once; read STATE.
4. Arm `/loop <interval> <prompt>` using the template body.
5. Embed **paste-proof** verification and **turn cap** in the prompt.
6. Route ticks via Task `explore` or `shell` on **fast** tier when possible.

Distinct from **`pn-loop`** skill (fix-until-green in one session, no scheduler).

---

## Session end: handoff vs retro

| Pattern | Purpose | pnCore |
|---------|---------|--------|
| **Two questions** | Surface blind spots before close | `/pn-handoff` |
| **Handoff file** | Operational continuity | `.pncore/handoff.md` or loop STATE |
| **Session retro** | Evidence-based mistake taxonomy | `/pn-retro` → `docs/refs/retros/` |
| **Continual learning** | Durable AGENTS.md bullets | `pn-continual-learning` (stop hook) |

Use handoff for **what to do next**; retro for **how the agent behaved**; both can run in one session close.

---

## Dynamic workflows (Claude Code) vs pnCore workflows

| Need | Reach for |
|------|-----------|
| Rerunnable multi-agent audit script | Claude Code **dynamic workflow** |
| Gated product delivery + resume | **`workflow_step`** + `docs/plans/` |
| N competing implementations | **`/pn-best-of-n`** |
| Fix until CI green | **`pn-loop`** |
| Scheduled maintainer | **Loop catalog** + Cursor `/loop` |

---

## Adoption path

1. **Week 1** — One catalog loop, manual run, STATE file, fast/standard routing.
2. **Week 2** — Schedule with Cursor `/loop`; yellow/red HITL colors.
3. **Week 3** — Checker Task on merge-worthy slices (`pn-build-gate`).
4. **Week 4** — Paste-proof `/goal` criteria; cheap→long_horizon escalation.
5. **Ongoing** — `/pn-handoff` or `/pn-retro` at session end; quarterly audit (ADR-0002).

---

## Related resources

- `pn-core://reference/loop-catalog/README.md` — starter dev loops
- `pn-core://reference/subagent-routing.md` — Task + tier table
- `pn-core://reference/workflow-state-schema.md` — MCP workflow state + loop STATE convention
- `pn-core://reference/prompt-provider-knobs.md` — Fable / GPT / Gemini knobs
- Skills: `pn-loop`, `pn-review-optimize-loop`, `pn-session-handoff`, `pn-session-retro`
