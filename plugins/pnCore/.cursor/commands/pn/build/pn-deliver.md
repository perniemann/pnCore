---
name: pn-deliver
description: Validate output against acceptance criteria, then package results for handoff — summary, file list, test instructions, validation checklist, residual risks, and followups. Runs verify then package in sequence. Use at the end of a build or strict-mode flow before declaring done.
---

# pn-deliver

**Start every response with:** `[pn-command] 🔺`

**Purpose:** Final delivery gate. Validates that what was built matches what was specified, then packages the results for handoff. Fails fast if acceptance criteria are not met — packaging only runs after verification passes.

## When to use this vs. similar commands

| Signal | Use `pn-deliver` |
|--------|-----------------|
| You have a finished build to hand off | Yes |
| You need to verify acceptance criteria before declaring done | Yes |
| You want code quality review on a diff | No — use `/pn-review` |
| You want a plan challenged before building | No — use `/pn-skeptic` or `/pn-grill` |
| The ask is meta-design or process improvement | **No — state the mismatch** ("You invoked `/pn-deliver` but the ask is `Y`; I'll re-route unless you'd rather I run pn-deliver as written") |

**Inputs:**
- Orchestrator output (or discovery spec + change plan)
- Builder output (patches, tests, notes)
- Skeptic output (if run)

---

## Phase 1: Verify Acceptance

**Progress:** "pn-deliver: Phase 1 of 2 — Verify."

### Delivery tier check

Read discovery spec. Apply tier rules:

- **`Delivery tier: full`:** Asset check enforced (no waiver). Run `validate-assets.mjs`; exit 0 required. Tests required for critical paths; no silent waiver. If delivery does not match full criteria, set recommendation to `do_not_ship` and cite: "Discovery specified full; delivery does not meet full tier. See `pn-core://reference/delivery-tier-criteria.md`."
- **`Delivery tier: MVP`:** Asset check same as full (logo, hero, full taxonomy required); test waiver allowed with explicit note. Polish: baseline acceptable.
- **No tier:** Treat as MVP (permissive); skip tier check.

### Program and slice artifact check

When any of these exist, run **before** per-criterion verification:

| Signal | Required evidence |
|--------|-------------------|
| `docs/plans/*redo*.md`, `docs/plans/*-program*.md`, or plan with **FR-** / **slice S1–Sn** tables | Closing audit or baseline + post audit paths cited; each planned slice has a matching `docs/audits/*-sN-verify-*.md` **or** explicit waiver in builder notes |
| `docs/WORKFLOW.md` with per-phase gate table | Same slice-verify files per phase row, or user `skip review` recorded per slice |
| Plan § Program completion lists `/pn-preflight` | `docs/audits/preflight-*.md` with **SHIP: GO** or documented NO-GO with `ship_with_notes` rationale |

**Slice verify validation** — run **`node scripts/validate-slice-verify.mjs .`** (add **`--strict-plan`** when `docs/plans/*redo*.md` or `*-program*.md` exists). Then read each `*-verify-*.md`:

1. YAML front matter includes `program`, `slice`, `checker`, `verify`, `user_continue`.
2. **`checker.kind: task`** → must include `task_id` or `checker.artifact` path; prose "review passed" alone → **fail** (`CHECKER-SAME-SESSION`).
3. **`checker.kind: USER-SKIP-REVIEW`** → must include `skip_reason` and matching user message in notes.
4. **`verify`** → each listed command must show `exit: 0` for `ship`; non-zero → `do_not_ship` or `ship_with_notes` with cited failure.
5. Template: `pn-core://reference/slice-verify-template.md`.

Missing slice verify for a planned slice → **`do_not_ship`** unless builder notes contain an explicit per-slice waiver ("Slice S3 verify deferred: reason").

### Verification steps

1. **Per acceptance criterion:** Set status (pass | partial | fail) and cite evidence (changed files, tests, notes).
2. **Tests validation:** If critical paths changed (auth, web3, DB boundary, new endpoint, new user flow), require at least one relevant test or an explicit waiver in builder notes. For `Delivery tier: full`, no silent waiver.
3. **Quality gate check:** Use pn-verification-before-completion and project quality gates. UI: a11y and states; backend: validation and error strategy; web3: trust boundaries and tx UX; 3D/UE: budgets and validation steps. For `full` tier, apply best practices (`pn-core://reference/best-practices.md`).
4. **Asset check (UI/landing projects):** Run `node scripts/validate-assets.mjs .` when scope includes UI. Validate full taxonomy (logo, hero, feature icons, subject icons, badge icons, empty-state illustrations) for both MVP and Full. Exit non-zero → fail; cite missing paths.
5. **CI impact:** code-only → low/medium; pipeline changes → medium/high.
6. **Recommendation:** `do_not_ship` | `ship_with_notes` | `ship` — per `reference/DECISION_LOGIC.md`.

**Output:** VerifierContract-shaped summary. Schema: `reference/schemas/verifier.contract.json`.

### Gate: fail fast

If recommendation is `do_not_ship`: **stop here.** Output the verification summary with all failures listed. Do not proceed to Phase 2 until issues are resolved. Present: "Verification failed — [summary of failures]. Fix the above before packaging."

---

## Phase 2: Package Delivery

**Progress:** "pn-deliver: Phase 2 of 2 — Package."

Only runs when Phase 1 recommendation is `ship` or `ship_with_notes`.

1. **Summary:** 3–8 bullets: what changed and why.
2. **changed_files:** Sorted unique list from implementation patches.
3. **how_to_test:** Test run instructions (builder tests + lint/typecheck from repo conventions).
4. **validation_checklist:** Short checklist for domains touched.
5. **residual_risks:** Any unresolved must_fix/should_fix; verifier and CI notes.
6. **followups:** Optional hardening or backlog items.

**Output:** DeliveryPack-shaped summary. Schema: `reference/schemas/delivery_pack.contract.json`.
