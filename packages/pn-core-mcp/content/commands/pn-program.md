---
name: pn-program
description: Multi-slice hierarchical orchestration — discovery, contract locking, parallel slice execution in git worktrees, verifier gate, sequential merge queue, program review. Use for large projects or features with ≥2 independent work streams. For single-pipeline work, use /pn-build.
---

# pn-program

**Start every response with:** `[pn-command] 🔺`

## When to use this command

Use `/pn-program` when the scope clearly splits into **2 or more independent vertical slices** that can be built concurrently (e.g. auth + payments + settings, or frontend + backend + infra when each has substantial independent work). For a single work stream, use `/pn-build` — it has lower overhead and delivers the same quality.

**Not for sequential UI surfaces on one repo** (Home → fight → chrome): use **`/pn-frontend-redo`** instead — same-repo slice plan without worktrees or contract locking.

**Hard exit:** If step 1 decomposition yields only one slice, this command instructs you to run `/pn-build` instead and stops. This is not a failure — it is the correct routing decision.

---

## MCP workflow (preferred)

When `workflow_step` is available, call:

```
workflow_step("feature_program", 0, {})
```

The `feature_program` workflow requires `featureProgram: true` in `pn-core://config/features.json` (or `PNCORE_FEATURES` env var). If the tool returns a flag error, see the Enable section below or use the fallback path.

Follow each returned instruction. The workflow has 6 steps:

| Step | Gate | What happens |
|------|------|-------------|
| 0 | human | Discovery (pn-discovery-questionnaire). Outputs: discoveryPath, programSlug, programBranch. |
| 1 | human | Decompose into slices, lock contracts, emit `.cursor/worktrees.json`. **Single-slice exit here if scope is too small.** |
| 2 | model | Per-slice planning (pn-writing-plans + pn-skeptic-challenge per slice). |
| 3 | model | Parallel slice execution — each slice runs `full_dev` from step 3 in its own git worktree. |
| 4 | human | Verifier gate per slice (pn-testing-specialist + contract conformance), then sequential merge queue. |
| 5 | human | Program review (pn-reviewer + pn-skeptic + pn-docs-sync on merged program branch). |

Read `get_skill('pn-program-orchestration')` and `get_skill('pn-slice-contracts')` at step 1 for decomposition and contract guidance.

### Enable the feature flag

Add to `pn-core://config/features.json` (create if absent):

```json
{ "featureProgram": true }
```

Or set the env var on the MCP server: `PNCORE_FEATURES={"featureProgram":true}`.

---

## Manual fallback (when MCP is absent or older)

When `workflow_step` does not expose `feature_program`, orchestrate manually:

### Step 0 — Discovery

Run `get_skill('pn-discovery-questionnaire')`. Save spec to `docs/discovery/YYYY-MM-DD-<programSlug>.md`. Agree on a `programSlug` and `programBranch` (default: `program/<programSlug>`).

### Step 1 — Decompose and lock contracts

Run `get_skill('pn-program-orchestration')` and `get_skill('pn-slice-contracts')`.

**Hard exit:** If only one meaningful slice exists, stop and run `/pn-build` instead.

Define each slice (id, title, ownedPaths, dependsOn, contractsProduced, contractsConsumed). Lock interface contracts in `docs/refs/contracts/<programSlug>/`. Emit `.cursor/worktrees.json`. Gate on user confirmation.

### Step 2 — Per-slice planning

Run `get_skill('pn-writing-plans')` for each slice. Save plans to `docs/plans/<programSlug>/<sliceId>.md`. Run `get_skill('pn-skeptic-challenge')` on each plan. Gate on confirmation.

### Step 3 — Parallel slice execution

Use Cursor's `/worktree` command (or the Agents Window) to launch each slice in its own worktree:

```
/worktree In worktree for slice-api (branch slice/slice-api): run /pn-build starting from specialist routing. Plan is at docs/plans/my-prog/slice-api.md.
```

Each slice runs a `full_dev` workflow (step 3 onward) in its worktree. When all slices complete, collect summaries.

### Step 4 — Verify and merge

For each slice (in dependency order):
1. Run `get_agent('pn-testing-specialist')` and contract-conformance checks in the slice worktree.
2. Merge the slice branch into the program branch.
3. Run build + tests after each merge. Use `get_skill('pn-merge-conflict-fix')` for conflicts.

### Step 5 — Program review

Run `get_command('pn-review')` on the merged program branch. Run `get_skill('pn-skeptic-challenge')` post-build. Run `get_skill('pn-docs-sync')`. Output program summary.

---

## Resume

After an interrupted session:
1. `workflow_state_load("feature_program", "<programSlug>")` — restore state.
2. `workflow_handoff_read(<run_id>)` — read last handoff.
3. `workflow_step("feature_program", <lastStep>, <restoredState>)` — continue.

## Routing guide

| Situation | Route to |
|-----------|---------|
| 1 slice or scope is small | `/pn-build` |
| 2+ independent slices, large feature | `/pn-program` |
| Primarily visual deliverable | `/pn-design` |
| New project from scratch | `/pn-new` → evaluates whether to use `/pn-program` or `/pn-build` |
