# Program decomposition doctrine

Reference for `feature_program` (multi-slice hierarchical orchestration). Covers the vertical-slice model, sizing rules, dependency DAG, decision checklist, and when NOT to use.

## Core idea: vertical slices, not horizontal layers

A **vertical slice** owns a complete, end-to-end unit of functionality — its own UI (when applicable), data model, and integration surface. A horizontal layer splits the codebase by tier (all frontend, all backend) and creates coupling because every feature change touches every layer.

```
Vertical slices ✅          Horizontal layers ✗
────────────────────       ───────────────────────
slice-auth                 layer-frontend (all features)
  ├── src/auth/            layer-backend  (all features)
  ├── src/components/      layer-database (all features)
  └── src/api/auth/

slice-payments
  ├── src/payments/
  └── src/api/payments/
```

Vertical slices allow parallel execution because slices touch different source paths. Horizontal layers cannot be parallelized safely — every agent would modify the same files.

## Sizing rule (SWE-Bench-anchored)

Based on SWE-Bench Pro evidence: frontier models score >70% on single-file patches but drop below 25% on multi-file patches averaging 107 lines across 4+ files.

**Target per specialist task inside a slice:** ≤4 files / ≤100 LOC.

If a slice's plan would require a specialist to touch >4 files or write >100 LOC in one task, sub-decompose the slice into smaller slices before step 2 (planning).

The infra/scaffolding slice is exempt from this limit — it is expected to be wider and runs sequentially first.

## Dependency DAG rules

Every slice declares `dependsOn: string[]` — the list of slice ids it depends on. Rules:

1. **No cycles.** `workflow_step` rejects cyclic DAGs at step 1.
2. **Shared infra is always a dependency.** Any slice that shares `package.json`, root tsconfig, migrations, or CI config must declare `dependsOn: ["slice-infra"]`.
3. **Contract producers are dependencies of their consumers.** If slice-api produces types that slice-ui consumes, then `slice-ui.dependsOn = ["slice-api"]`.
4. **Independent slices have `dependsOn: []`.** These can run and merge in any order.

The DAG toposort determines the merge queue order at step 4: dependencies merge first.

## Hierarchy rules (the "won't break each other" contract)

1. **Filesystem isolation by worktree.** Each slice runs in its own git worktree on its own branch. Two slices physically cannot overwrite each other's working files.
2. **Contracts are immutable mid-run.** Minor (additive-only) patches are allowed; major (breaking) patches rewind to step 1.
3. **Shared infra is a dedicated slice.** `package.json`, lockfile, root tsconfig, CI config — owned by an infra slice that runs first.
4. **No cross-slice imports of non-contract internals.** Slices may only import from `docs/refs/contracts/<programSlug>/` across slice boundaries. Caught at the verifier gate (step 4).
5. **Sequential merge queue.** One slice merges at a time in DAG topological order; build + tests run after each merge.
6. **Integration gate is human.** `approval_checkpoint` ticket required before the merge phase begins.

## Decision checklist: should I use `feature_program`?

Answer each question. If you answer No to any of the first three, use `/pn-build` instead.

| Question | Required answer |
|----------|----------------|
| Does the scope split into ≥2 independent surface areas? | Yes |
| Can slices be built concurrently without one blocking the other for >50% of the work? | Yes |
| Will the parallel speedup exceed the orchestration overhead (contract locking, worktree setup, merge queue)? | Yes |
| Is the team (or session) large enough to run multiple agents in parallel? | Ideally yes (1 agent per slice), but solo-agent mode works — slices run sequentially |
| Are there clear contract seams between slices? | Yes — if unclear, define the contracts first |

## When NOT to use `feature_program`

- **Single work stream.** One developer, sequential tasks, no meaningful independent parallelism.
- **Tightly coupled scope.** Every feature touches the same files (e.g. a god-object refactor).
- **Small feature.** If the total scope fits in a single `full_dev` cycle in under 2 hours, the orchestration overhead is not worth it.
- **Unknown scope.** If you cannot name the second independent slice before starting, use `/pn-build`; you can always introduce a program structure later.
- **Primarily visual deliverable.** Use `/pn-design` — it has the right skeptic-on-output and render-verify gates for design-first work.

## Examples

### Good use of `feature_program`

**SaaS app from scratch (3 slices):**

```
slice-infra:     package.json, tsconfig, CI, DB schema, migrations
  dependsOn: []

slice-api:       Express/Hono routes, controllers, services, tests
  dependsOn: ["slice-infra"]
  contractsProduced: ["docs/refs/contracts/my-app/api-stubs.yaml"]

slice-frontend:  React pages, components, hooks, assets
  dependsOn: ["slice-infra"]
  contractsConsumed: ["docs/refs/contracts/my-app/api-stubs.yaml"]
```

**Platform expansion (2 slices):**

```
slice-billing:   Stripe integration, webhook handlers, invoice service
  dependsOn: []
  contractsProduced: ["docs/refs/contracts/platform/billing-types.ts"]

slice-notifications: Email/push service, billing event listeners
  dependsOn: ["slice-billing"]
  contractsConsumed: ["docs/refs/contracts/platform/billing-types.ts"]
```

### Bad use of `feature_program`

**Single-page feature:** Adding a settings modal to an existing app — one work stream, no parallelism benefit.

**Monolithic "all frontend" slice:** Splitting by layer rather than by domain creates cross-slice coupling and defeats the purpose.

## Relationship to `full_dev` Phase A/B parallelism

`feature_program` operates one tier above `full_dev`. The hierarchy:

```
feature_program (program conductor)
└── full_dev (per-slice build cycle)
    └── Phase A/B parallel specialists (per-slice specialist routing)
```

`full_dev` Phase A/B parallelism (scaffolder → parallel frontend+backend) already exists inside each slice. `feature_program` adds the program tier above it — multiple `full_dev` runs racing in parallel across worktrees.
