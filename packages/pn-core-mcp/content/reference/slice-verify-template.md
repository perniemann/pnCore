# Slice verify artifact (mandatory for phased programs)

Normative template for closing a **plan phase**, **program slice**, or **mini-phase** when executing `docs/plans/` or `docs/WORKFLOW.md` outside `workflow_step`. Agents must write one file per slice before declaring the slice complete or starting the next slice.

**Save path:** `docs/audits/<program-slug>-sN-verify-YYYY-MM-DD.md` (example: `frontend-redo-s2-verify-2026-06-29.md`)

**Canonical program plans:** Cross-reference the plan file (e.g. `docs/plans/frontend-redo-2026-06-29.md`) and list acceptance criteria IDs (FR-1, S2, etc.).

---

## Required front matter (YAML)

Every slice verify file must start with this block. **`checker` and `verify` are mandatory.** Empty or prose-only values fail `/pn-deliver` program checks.

---
program: frontend-redo-2026-06-29
slice: S2
date: 2026-06-29
evidence_qa:
  path: docs/evidence/s2-mock.html
checker:
  kind: task
  task_id: abc123
  artifact: docs/audits/checker-2026-06-29-s2.md
  skip_reason:
review_panel:
  risk: auth
  synthesized_artifact: docs/audits/review-panel-2026-06-29-s2.md
  bugbot:
    task_id: bugbot-xyz
    artifact: docs/audits/bugbot-2026-06-29-s2.md
  security_review:
    task_id: sec-xyz
    artifact: docs/audits/security-review-2026-06-29-s2.md
skeptic:
  verdict: light-pass
  artifact:
verify:
  - cmd: npm test
    exit: 0
  - cmd: npm run build
    exit: 0
  - cmd: npm run test:e2e -- fight-layout
    exit: 0
    note: optional subset or skip reason
user_continue:
  at: 2026-06-29T14:00:00Z
---

*(Inline `#` comments in real files are optional; omit empty keys like `skip_reason` when unused. Omit entire `review_panel` block when the slice is not auth/RLS/payments/secrets.)*

### `review_panel` (optional — high-risk slices only)

When the phase touches **auth, RLS, payments, or secrets** (`pn-build-gate` parallel review panel):

| Key | Required when `review_panel` present | Notes |
|-----|--------------------------------------|-------|
| `review_panel.risk` | Yes | One of: `auth`, `rls`, `payments`, `secrets` |
| `review_panel.synthesized_artifact` | Recommended | Lead merge of checker + bugbot + security findings |
| `review_panel.bugbot.task_id` or `.artifact` | Yes | Task subagent `bugbot`, `readonly: true` |
| `review_panel.security_review.task_id` or `.artifact` | Yes | Task subagent `security-review`, `readonly: true` |

`checker.kind: task` remains **mandatory** — the panel augments the checker; it does not replace it.

---

## Required body sections

### Acceptance (plan criteria → pass/fail)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| (from plan slice table) | PASS / FAIL | file, test name, or audit ref |

### Render verify (when UI in slice)

| Width | Overflow | Notes |
|-------|----------|-------|
| 390 | Pass / Fail | |
| 768 | Pass / Fail / N/A | |
| 1440 | Pass / Fail / N/A | |

**Playwright equivalence:** Named layout/a11y specs at 390/768/1440 that assert plan FR checks count as render-verify when this table cites the spec path (see `pn-core://reference/best-practices.md` §10.1).

### Key changes

- Bullet list of primary files touched (not a full diff).

### Follow-ups (optional)

- Items deferred to later slices or backlog.

---

## Rules

1. **One file per slice** — do not merge S1+S2 into one verify doc unless the plan defines a combined chunk.
2. **`checker.kind: task`** — only valid when a **separate** Task subagent ran with `readonly: true` and `pn-review-optimize-loop` on the slice diff. The builder invoking `/pn-review` in the same session does **not** qualify (`CHECKER-SAME-SESSION` — see `pn-build-gate`).
3. **`USER-SKIP-REVIEW`** — user must have said `skip review` in chat; record verbatim in `user_continue` or `checker.skip_reason`.
4. **`verify`** — list commands run **after** the slice implementation; include exit code 0 or document failure (slice not complete).
5. **Program end** — after the last slice, also produce baseline/closing audit and run `/pn-preflight` (when marketing UI) and `/pn-deliver` per plan § Program completion.
6. **Automation** — `node scripts/validate-slice-verify.mjs .` (from project root with pnCore scripts available); add `--strict-plan` when a redo/program plan lists slices.
7. **`review_panel`** — when `review_panel.risk` is set, `checker.kind` must still be `task` with evidence; `bugbot` and `security_review` each need `task_id` or `artifact`. See `pn-core://reference/subagent-routing.md`.

---

## Minimal example (checker skipped by user)

Save as `docs/audits/my-feature-s3-verify-2026-06-29.md`:

---
program: my-feature-plan
slice: Phase-3
date: 2026-06-29
evidence_qa:
  path: skipped: copy-only CSS tweak; no new layout
checker:
  kind: USER-SKIP-REVIEW
  skip_reason: user said skip review after npm test pass
skeptic:
  verdict: skipped: copy-only per DECISION_LOGIC
verify:
  - cmd: npm test
    exit: 0
user_continue:
  at: skip review
---

### Acceptance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Vote page 2-col tablet | PASS | participation-routes.spec.ts |
