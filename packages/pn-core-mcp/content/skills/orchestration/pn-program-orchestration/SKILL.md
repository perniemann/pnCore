---
name: pn-program-orchestration
description: "Conductor playbook for feature_program — multi-slice hierarchical orchestration. Use when decomposing a new project or large feature into ≥2 independent vertical slices that can be built in parallel. Covers when to use, slice decomposition rules, DAG dependency management, merge queue, and resume patterns."
---

# Program orchestration

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

Use this skill when conducting a `feature_program` workflow — decomposing a project into ≥2 independent vertical slices, locking contracts, and orchestrating parallel execution. Also consult when deciding whether to route a task to `feature_program` vs `/pn-build`.

## When to use `feature_program` vs `/pn-build`

Use `workflow_step("feature_program", 0, {})` when the discovery spec reveals **≥2 independent surface areas** that can be built concurrently without one blocking the other. Classic signals:

- A new full-stack app with a distinct frontend slice, backend/API slice, and infra/data-model slice.
- A platform where multiple product verticals (auth, billing, notifications) are being built simultaneously.
- A migration where the new stack runs in parallel with the old one and both have separate work streams.

**Route to `/pn-build` instead when:**

- The feature is a single work stream (one team, sequential tasks, shared files).
- The total scope is small enough that the orchestration overhead exceeds the parallelism gain.
- Discovery produces only one meaningful slice — `workflow_step` will hard-exit and direct you here anyway.
- The user says "just build it."

Rule of thumb: if you hesitate for more than 30 seconds naming a second independent slice, use `/pn-build`.

## Slice decomposition rules

### Vertical slices, not horizontal layers

Each slice should deliver an end-to-end slice of value — a feature or bounded domain, not a layer (not "the frontend layer" of everything). A slice owns its own UI, data, and integration surface.

**Good slice boundaries:**

- `slice-auth` — user identity, sessions, MFA
- `slice-payments` — billing, invoicing, webhooks
- `slice-settings` — user preferences, notification config

**Bad slice boundaries (these are layers, not slices):**

- `slice-frontend` — all frontend across all features (creates coupling)
- `slice-database` — all DB migrations (owned by infra slice instead)

### Slice sizing

Per SWE-Bench Pro evidence (frontier models drop from >70% to <25% accuracy as task size grows from single-issue to multi-file patches averaging 107 lines across 4+ files):

- Target **≤4 files / ≤100 LOC per specialist task** inside each slice.
- Slices that exceed this must be sub-decomposed before step 2 (planning).
- The infra/scaffolding slice (always sequential-first) is an exception — it is allowed to be wider.

### Dependency DAG

Declare `dependsOn` for each slice. The DAG drives the **merge queue order** at step 4: dependencies merge first.

Rules:
- A slice that produces contracts consumed by another slice must be in that slice's `dependsOn`.
- Shared infra (`package.json`, root config, CI, migrations) belongs in a dedicated `infra` slice that all other slices depend on.
- Cycles are rejected by `workflow_step` at step 1. If you find a cycle, extract the shared piece into its own slice.

### Contract locking (step 1)

Before fan-out, lock all cross-slice interfaces. Use `get_skill('pn-slice-contracts')` for the format.

Two patch modes apply after contracts are locked:
- **Minor (additive-only) patch:** Adding optional fields, new endpoints — allowed in-flight. Update contract files, notify consuming slices, continue.
- **Major (breaking) patch:** Renaming/removing fields, changing types, restructuring responses — rewind to step 1. Confirm with user before fan-out resumes.

## Worktree isolation (required at step 3)

Each slice runs in its own **git worktree** (Cursor-native via `.cursor/worktrees.json`):

```
program-branch
├── .worktrees/slice-infra/   ← git worktree, own branch: slice/slice-infra
├── .worktrees/slice-api/     ← git worktree, own branch: slice/slice-api
└── .worktrees/slice-ui/      ← git worktree, own branch: slice/slice-ui
```

Step 1 must emit `.cursor/worktrees.json`. Use `get_skill('pn-slice-contracts')` for the template. Cursor's Agents Window will create isolated checkouts automatically when this file is present.

## Step-by-step conductor guidance

| Step | What to do |
|------|-----------|
| 0 | Run pn-discovery-questionnaire. Ask for programSlug and confirm programBranch. |
| 1 | Decompose slices, lock contracts, emit worktrees.json, validate DAG (no cycles). Hard-exit to /pn-build if only 1 slice. |
| 2 | Run pn-writing-plans once per slice. Run pn-skeptic-challenge on each plan. Gate on confirmation. |
| 3 | Launch parallel slice execution via workflow_step tasks. Pass **`leadModelTier: "long_horizon"`** (or your active tier) in state. When `orchestrationMode` is `lead`, spawn Task subagents per slice — lead does not bulk-edit in slice worktrees. Each slice runs full_dev starting at step 3 on **standard** tier in its worktree. |
| 4 | Sub-phase A: verifier gate per slice (pn-testing-specialist + contract conformance). Sub-phase B: sequential merge in DAG topological order; run build + tests after each merge. |
| 5 | Program review: pn-reviewer + pn-skeptic on the merged program branch. pn-docs-sync. |

## Resume across sessions

After each step, `workflow_handoff_append` is called automatically. To resume:
1. Call `workflow_state_load("feature_program", programSlug)` to restore state.
2. Call `workflow_handoff_read(run_id)` to read the last handoff.
3. Call `workflow_step("feature_program", <lastStep>, <restoredState>)` to continue.

## MCP-absent fallback

When `workflow_step` does not expose `feature_program` (older MCP install):

1. Run `get_skill('pn-discovery-questionnaire')` manually.
2. Decompose into slices following the rules in this skill.
3. Run `/pn-build` once per slice in sequence (no parallel) — or use Cursor's `/worktree` command to run each slice in an isolated checkout.
4. Merge manually in dependency order.
5. Run `get_command('pn-review')` on the integrated result.

This is Alternative A — slower but safe and delivers the same outcome.

## Guardrails

- Never start a slice before step 1 (contracts) is confirmed. Contracts locked after fan-out cannot be changed without reverting slices.
- Each slice's pn-testing-specialist run at step 4 is mandatory before merge. Do not skip.
- If a slice's full_dev run fails 3+ times without resolution, apply the **3 failed attempts rule** from pn-skeptic-challenge: stop, present the failure summary to the user, get human guidance before continuing.
