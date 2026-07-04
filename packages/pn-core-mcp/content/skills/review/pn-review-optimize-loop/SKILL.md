---
name: pn-review-optimize-loop
description: "Run a review pass (quality gates, pn-review-plugin-submission, pn-deslop, pn-reality-check; pn-evidence-qa optional for UI), then an optimization pass (pn-react-next-perf, pn-systematic-debugging). If issues are found, fix and re-run once. Use for the pn-reviewer agent and the pn-project-builder's own loop."
---

# Review and optimize loop

## When to use

- After a full dev flow or specialist phase when a single review+optimize pass is needed.
- When the user or pn-project-builder requests "review and optimize" or "run the loop."
- As the core workflow for the pn-reviewer agent (repeat until pass).

## Progress (user-visible)

Before each sub-pass below, state one line so the transcript matches `pn-review` / `pn-deliver` style:

- `"pn-review: Step 1 of 4 — Scope."` when clarifying scope; skip if scope is already clear.
- `"pn-review: Step 2 of 4 — Review (quality gates / plugin submission)."` then `"pn-review: Step 2 of 4 — Review (config)."` when config/infra is in scope.
- `"pn-review: Step 2 of 4 — Review (deslop)."` then `"pn-review: Step 2 of 4 — Review (evidence-qa)."` when UI-heavy and running evidence QA; then `"pn-review: Step 2 of 4 — Review (reality-check)."`
- `"pn-review: Step 3 of 4 — Optimize."`
- `"pn-review: Step 4 of 4 — Fix and re-run."` when implementing fixes before a single mandated re-run.

When invoked outside `pn-review`, replace the `pn-review:` prefix with the active command name (e.g. `pn-reviewer:`) but keep the same step labels.

## Workflow

1. **Review phase**
   - For Cursor plugins: apply pn-plugin-quality-gates rule and pn-review-plugin-submission skill. Verify manifest, paths, frontmatter, component discovery.
   - For other projects: apply project quality gates or relevant rules (e.g. pn-node-backend, pn-react, pn-astro, pn-nextjs). List all issues with file and line or component.
   - **Config review:** When changes include config files or infra (docker-compose, env, k8s): apply pn-config-review for connection pools, timeouts, limits. Flag risky numeric changes.
   - **Deslop:** Run the pn-deslop skill on the current diff/changes to remove AI-generated slop (unnecessary comments, defensive try/catch, `any` casts to bypass types, deeply nested code, patterns inconsistent with the codebase). Keep behavior unchanged; minimal, focused edits.
   - **Reality Check (pn-reality-check):** Default to NEEDS_WORK unless overwhelming evidence supports production readiness. Cross-reference spec vs. implementation; require evidence for claims. First implementations typically need 2-3 revision cycles. C+/B- ratings are normal. For UI-heavy deliverables: optionally run pn-evidence-qa for screenshot/visual proof before certification. When bugs or behavior depend on live JS/network/hydration, add **pn-browser-runtime-verify**.

2. **Optimization phase**
   - Where relevant: apply pn-react-next-perf (data loading, boundaries, bundle, re-renders) and pn-systematic-debugging (repro steps, isolation, fixes). Skip pn-react-next-perf for non-React/Next projects. Suggest minimal, targeted changes.

3. **Fix and re-run (once)**
   - If the review or optimization phase found issues: implement fixes, then run this skill again once (review then optimize). If issues remain after that pass, report them and stop; do not loop indefinitely.

## Review norms (comments and change size)

When writing review feedback (human or agent):

- **Severity:** Label findings **Blocker** (must fix before merge), **Optional** / **Nit** (style or non-blocking), or **FYI** (context only). Blockers need a concrete fix or tracking issue.
- **Change size:** Prefer reviewable chunks (rough guide: on the order of ~100 meaningful lines of diff per pass when practical). If larger, split by commit or PR or call **split-to-pr** workflows; do not use size as an excuse to skip security or correctness.
- **Tone:** Approval standard: merge if the change **improves** overall health and meets project conventions — not "only if I would have written it identically."

## Health-regression Blocker

A PR that passes tests but **leaves the touched surface measurably worse** is a Blocker, not a Nit. "Works" is a floor, not a ceiling.

Treat as Blocker when the PR raises any of these on touched files without offsetting deletions or a recorded justification:

- **Complexity displacement.** Refactor extracts a new module, but the deletion test fails: *"If I delete this module, does complexity vanish or scatter?"* Scatter ⇒ Blocker. Concrete proposal must be a consolidation or deletion, not another layer. (See "Deep modules and seams" below.)
- **Net duplication.** Same conditional / transform now lives in ≥2 call sites of an abstraction this PR introduced — the logic leaked past the boundary. (Not the same as DRY-policing existing duplication; the trigger is *new* leakage created by *this* PR.)
- **Thin wrapper without a stated seam.** New function or file whose body is a single delegating call with the same signature, and the PR description does not name the seam it creates (port/adapter, test double, deprecation shim, public-API re-export). Unjustified wrappers ⇒ Blocker; justified wrappers ⇒ FYI.
- **File-size growth on already-large files.** No fixed LOC cap (Goodhart risk — chopping a file mid-function only scatters complexity). But: if a touched file is in the top decile of repo file size *and* this PR grows it, require either a deletion in the same PR or an explicit "carry-forward" note.

**Concrete-fix requirement.** Like every Blocker class, each finding ships with a specific consolidation, deletion, or named-seam justification — not just "this feels off."

**Appeal path.** Author may dispute by naming the seam, citing the boundary, or providing the measurement that contradicts the finding. Agents follow the 3-failed-attempts rule from `pn-skeptic-challenge` — after three rejected appeals on the same finding without new evidence, stop and request human input rather than holding the PR hostage.

## Deep modules and seams

Adapted from Ousterhout (*A Philosophy of Software Design*, §4). Use this on every refactor, not only migrations:

- **Deletion test.** *"If I delete this module, does complexity vanish or scatter?"* Vanish ⇒ the module was carrying its weight. Scatter ⇒ it was a shallow pass-through; merge the callers or rebuild the abstraction deeper.
- **Deep over shallow.** Prefer small interface, concentrated behavior. A function that wraps one call with the same signature and adds no behavior is shallow by definition; either it names a seam (adapter, port, test double, deprecation shim, public-API re-export) or it should not exist.
- **Seam:** Where behavior can change without editing call sites everywhere; **adapter** implements the interface at the seam. Naming the seam in the PR description is the cheap justification.
- **ADR alignment.** Read `docs/adr/` (and scoped `docs/adr/` under bounded contexts). Do not re-litigate recorded decisions unless new friction proves the ADR obsolete — then propose an explicit ADR update, not a silent workaround.

## Guardrails

- One retry only unless explicitly used by the pn-reviewer agent (which may repeat until pass).
- Before claiming pass: use pn-verification-before-completion (run tests/build, read output, then state result).
- Output a short pass/fail summary and a prioritized fix list when issues remain.

## Investigation loop (targeted bug / review)

- After you state a **root-cause hypothesis**, **gate before the next five exploratory reads** (`AskQuestion` or `workflow_confirm`) unless the user already scoped the fix.
- If you read the **same file path twice** without new evidence or state change, **gate now** — do not continue spiraling.
- Before `CreatePlan` for a blocking bug, present findings and gate on proceed vs revise scope.

## Output

- Pass/fail by phase (review, optimize).
- Prioritized fix list if any issues.
- Confirmation when both phases pass.
