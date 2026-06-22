# ADR-0001: feature_program — hierarchical parallel workflow

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** pnCore maintainers  

---

## Context

As of May 2026, the pnCore system provides a single-pipeline `full_dev` workflow: discovery → prior art → plan → specialists (Phase A sequential + Phase B parallel) → review. This covers most features well, but large projects with 2+ independent surface areas (e.g. auth + payments + settings in a new SaaS app) are bottlenecked because:

1. Specialists within one `full_dev` run can race in parallel (Phase B), but the entire program is a single plan.
2. There is no mechanism to run two independent `full_dev` streams simultaneously with isolation and a safe merge strategy.
3. Without isolation, parallel agents in the same working directory create predictable failures: merge conflicts, duplicated implementations, semantic contradictions (per [Augment Code 2026 multi-agent guide](https://www.augmentcode.com/guides/how-to-run-a-multi-agent-coding-workflow)).

**The request:** users need a workflow that supports hierarchical dev phases — a program tier above the existing `full_dev` slice tier — where independent slices race in parallel and a deterministic integration gate merges them.

---

## Decision

Add a `feature_program` workflow type to `workflowTypeEnum` in `pn-core-mcp`, gated behind a `featureProgram` feature flag (default `false` for v1 preview). The workflow implements six deterministic steps:

| Step | Gate | Key output |
|------|------|-----------|
| 0 | human | Discovery spec, programSlug, programBranch |
| 1 | human | slices[], contracts locked, .cursor/worktrees.json emitted, DAG validated |
| 2 | model | Per-slice plans (pn-writing-plans + skeptic-challenge per slice) |
| 3 | model | parallel: true + tasks[] (each slice runs full_dev step 3 in its worktree) |
| 4 | human | Verifier gate per slice + sequential merge queue in DAG topological order |
| 5 | human | Program review (pn-reviewer + pn-skeptic + pn-docs-sync) |

---

## Alternatives considered

### A: Skill + command only (no new MCP workflow type)

A `pn-program-orchestration` skill teaching the orchestrator to call `/pn-build` N times via Cursor's `/worktree` command. No MCP changes.

**Rejected because:** Loses deterministic gating. The `workflow_step` spine is the load-bearing primitive for state validation, human gate enforcement, and cross-session resume. Without it, the program has no canonical state machine and no `approval_checkpoint` integration.

### B: Full plan as written with custom glob-validator

The original plan included a `scripts/validate-program-ownership.mjs` script and an ownership manifest schema enforced by a new `npm run check:ownership` step.

**Rejected (post-skeptic revision) because:** Cursor 3 (April 2026) ships native worktree isolation. Each slice in its own git worktree on its own branch physically cannot overwrite another slice's working files. The custom validator is redundant and weaker than the off-the-shelf solution. Worktrees + git merge already surface conflicts at the filesystem level.

### C (chosen): New workflow type + worktree isolation

Full `feature_program` MCP workflow with Cursor worktrees (`/cursor/worktrees.json`) as the isolation primitive. Deterministic six-step state machine; `full_dev` untouched; single-slice programs hard-exit to `pn-build`.

---

## Rationale

### Industry alignment (May 2026)

The decision covers all six patterns from the Augment Code 2026 multi-agent guide:

1. **Spec-driven decomposition with contracts** — step 1 locks interfaces before fan-out.
2. **Git worktree isolation per slice** — each slice in its own Cursor worktree with setup via `.cursor/worktrees.json` ([Cursor worktrees docs](https://cursor.com/docs/configuration/worktrees)).
3. **Coordinator / specialist / verifier role split** — conductor (feature_program) + existing specialists.json + pn-testing-specialist per slice at step 4.
4. **Per-task model routing** — existing specialists.json parallelGroups, unchanged.
5. **Automated verification gates** — step 4 verifier gate + step 5 program review.
6. **Sequential merges with conflict detection** — step 4 merge queue in DAG topological order.

SWE-Bench Pro evidence anchors the slice sizing rule: target ≤4 files / ≤100 LOC per specialist task inside a slice, keeping each agent in the >70% accuracy band.

### Why feature flag (default off)

The `feature_program` workflow is a new orchestration tier. In v1 it is behind `featureProgram: false` to allow one production cycle of manual testing before auto-routing. v1.1 plan: `pn-new` auto-routes to `feature_program` when discovery returns ≥2 independent slices and the flag flips to default-on.

### Why DAG cycle rejection at step 1

A cyclic dependency (A depends on B depends on A) produces no valid merge order. Rejecting it deterministically at step 1 — before any worktrees are created or any code is written — is the cheapest possible failure mode.

---

## Consequences

**Positive:**

- Large projects can now be decomposed and built in parallel with deterministic isolation.
- File-ownership enforcement is provided by the OS (git worktrees) rather than a fragile glob-validator.
- Contract-first development is the default: no slice can start without locked interfaces.
- `full_dev` is unchanged; existing workflows, commands, and tests are unaffected.
- v0 spike confirmed: Cursor Agents Window supports ≥3-level agent nesting (program → slice → specialist) with independent run_ids; no architectural blocker.

**Negative / risks:**

- New orchestration tier adds user-facing complexity. Mitigated by hard single-slice exit and routing guidance in pn-new + pn-build.
- Cross-slice import of non-contract internals is caught only at the verifier merge gate (step 4), not at write time. An ESLint-level enforcement is deferred to v2.
- Nested agent depth (3 levels) is confirmed feasible but has not been load-tested at the upper bound (10 parallel agents per level). Practical mitigation: keep slice count ≤5 in v1.

---

## Related files

- `packages/pn-core-mcp/src/workflows.ts` — `featureProgramSteps`, `toposortSlices`, `getWorkflowStep` cases
- `packages/pn-core-mcp/src/features.ts` — `featureProgram` flag
- `packages/pn-core-mcp/content/skills/orchestration/pn-program-orchestration/SKILL.md`
- `packages/pn-core-mcp/content/skills/orchestration/pn-slice-contracts/SKILL.md`
- `packages/pn-core-mcp/content/commands/pn-program.md`
- `packages/pn-core-mcp/content/reference/program-decomposition.md`
- `plugins/pnCore/reference/parallel-rules.md` — cross-slice section
- `plugins/pnCore/reference/schemas/program_state.contract.json`
