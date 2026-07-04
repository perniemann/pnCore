---
name: pn-backend-audit
description: Full backend audit — API design, security posture, data model, error handling, and performance. 5-phase deterministic workflow. Use for new codebases, pre-launch review, or technical debt assessment.
---

# pn-backend-audit

**Start every response with:** `[pn-command] 🔺`

When **MCP workflow_step** is available, call `workflow_step("backend_audit", 0, {})` and follow each returned instruction. Before each MCP step, state `"pn-backend-audit: MCP step [N] — [short label from instruction]."` when the instruction names a phase or deliverable.

Otherwise follow the phases below:

## When to use

- Pre-launch backend quality review
- Inheriting or auditing an existing codebase
- Periodic technical debt assessment
- After major feature additions to catch regressions

## Flow (fallback — use MCP path above when available)

**Progress:** Before each block below, state the matching line:

- `"pn-backend-audit: Step 0 of 6 — Stack context and scope."`
- `"pn-backend-audit: Phase 1 of 5 — API design (pn-audit-api)."`
- `"pn-backend-audit: Phase 2 of 5 — Security (pn-audit-security)."`
- `"pn-backend-audit: Phase 3 of 5 — Data model (pn-audit-data)."`
- `"pn-backend-audit: Phase 4 of 5 — Error handling (pn-audit-errors)."`
- `"pn-backend-audit: Phase 5 of 5 — Performance (pn-audit-performance)."`
- `"pn-backend-audit: Final — Summary and scorecard."`

**0. Stack context** — Check `.pncore-stack.md`; if missing run `pn-setup` (stack context option) then ask inline for runtime, framework, DB + ORM, auth. Ask scope: all / API / security / data model / error handling / performance.

**Phase 1 — API Design** (`pn-audit-api`) → save `docs/audits/backend-audit-api.md`

**Phase 2 — Security** (`pn-audit-security` + skill `pn-auth-patterns`) → save `docs/audits/backend-audit-security.md`

**Phase 3 — Data Model** (`pn-audit-data` + skill `pn-database-migrations`) → save `docs/audits/backend-audit-data.md`

**Phase 4 — Error Handling** (`pn-audit-errors` + skill `pn-observability`) → save `docs/audits/backend-audit-errors.md`

**Phase 5 — Performance** (`pn-audit-performance` + skill `pn-caching`) → save `docs/audits/backend-audit-perf.md`

**Final summary** — Scorecard, critical findings, top-5 fix roadmap (Impact × Confidence ÷ Effort), quick wins. Save `docs/audits/backend-audit-summary.md`.
