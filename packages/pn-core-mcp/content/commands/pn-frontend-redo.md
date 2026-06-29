---
name: pn-frontend-redo
description: Audit-driven frontend remediation on an existing app — baseline audit, slice plan, sequential UI slices with maker-checker gates, preflight, deliver. Use instead of pn-program for same-repo sequential surfaces (Home → fight → chrome). Not for greenfield (pn-design) or parallel vertical slices (pn-program).
slash: false
---

# pn-frontend-redo

**Start every response with:** `[pn-command] 🔺`

**Purpose:** Run a **UI-only remediation program** on an existing codebase: audit → plan slices → implement sequentially with artifact-backed gates → ship. Does **not** replace sim/backend work; scope is components, CSS, copy, and visual integration.

## When to use vs similar commands

| Signal | Use |
|--------|-----|
| Existing app; UI direction locked; need execution not re-discovery | **Yes** |
| Greenfield or full-stack feature | No — `/pn-build` or `/pn-design` |
| ≥2 **parallel independent vertical slices** (auth + payments) with contracts | No — `/pn-program` |
| Single bounded tweak (one section) | No — `/pn-visual-tweak` |
| Audit only, no implementation yet | No — `/pn-frontend-audit` only (Session 1) |
| Scorecard exists; need roadmap only | `/pn-frontend-audit` → plan doc; stop |

## Prerequisites

- **`.pncore-design.md`** at project root (or run `pn-setup` design context first).
- **`docs/refs/DESIGN-DOC.md`** or equivalent approved visual spec (optional but recommended).

## Routing vs `/pn-program`

| Pattern | Command |
|---------|---------|
| Sequential **surfaces** on one repo (Home → fight pages → chrome) | **`get_command("pn-frontend-redo")`** |
| Parallel **vertical slices** with worktrees + locked contracts | **`/pn-program`** |
| One component / one page tweak | **`/pn-visual-tweak`** |

---

## Session 1 — Baseline (planning only)

1. Read `.pncore-design.md` and design spec.
2. **`/pn-frontend-audit`** — scope all public routes (or plan-defined scope). **Do not implement.**
3. Save baseline to `docs/audits/<slug>-baseline-YYYY-MM-DD.md`.
4. **`pn-writing-plans`** — produce `docs/plans/<slug>-frontend-redo-YYYY-MM-DD.md`:
   - Success criteria (FR-* ids)
   - Slice table S1–Sn (routes, files, acceptance, pnCore commands)
   - Out of scope (backend, sim, etc.)
   - Program completion checklist (preflight → polish → audit → deliver)
5. **`pn-create-workflow-roadmap`** — optional `docs/WORKFLOW.md` slice gate table.
6. **`/pn-skeptic`** on the plan before Session 2.

**Gate:** User confirms plan before any slice code.

---

## Session 2+ — One slice per session (default)

For each slice **Sn** in the plan:

1. **Evidence first (UI):** `pn-evidence-qa` or mock/wire at 390 + 1440 **before** first line of slice code. Record path in slice verify.
2. **Build:** `pn-frontend-developer` — run design substeps in order when applicable: `pn-typeset` → `pn-colorize` → `pn-arrange` (see `/pn-design` § Build).
3. **Verify:** Plan-listed commands (`npm test`, `build`, `lint`, targeted e2e).
4. **Checker (mandatory):** Task subagent `readonly: true` + `pn-review-optimize-loop` on **slice diff only**. **Not** `/pn-review` in builder session (`CHECKER-SAME-SESSION`).
5. **Fix** checker findings; do not start next slice in checker turn.
6. **Skeptic:** Risk-tiered per `DECISION_LOGIC.md` (strict after auth; light for copy-only).
7. **Slice verify artifact:** `docs/audits/<slug>-sN-verify-YYYY-MM-DD.md` per `pn-core://reference/slice-verify-template.md`.
8. **User `continue`** before next slice.

**Default:** 1 slice = 1 session unless user opts into multi-slice.

---

## Program completion (after last slice)

| Step | Command | Output |
|------|---------|--------|
| 1 | `/pn-preflight` strict (Home + primary marketing routes) | `docs/audits/preflight-*.md` |
| 2 | `/pn-polish` | fix remaining roadmap items |
| 3 | `/pn-frontend-audit` | compare to baseline; confirm FR-* |
| 4 | `pn-docs-sync` | README + refs alignment |
| 5 | **`/pn-deliver`** | handoff pack — **required**; validates slice verify artifacts |

---

## MCP workflow (optional)

When available, use **`workflow_step("frontend_audit", …)`** for baseline and closing audits only. Slice implementation follows **manual plan + build-phase loop** (`pn-core://reference/best-practices.md` §10.1) until a future `frontend_remediation` workflow ships.

---

## Skills and rules

- **pn-build-gate** — Phase-complete gate, CHECKER-SAME-SESSION, slice verify
- **pn-frontend-design-philosophy** — Scorecard and anti-patterns
- **pn-create-workflow-roadmap** — WORKFLOW.md gate tables
- **slice-verify-template** — Mandatory close artifact per slice
