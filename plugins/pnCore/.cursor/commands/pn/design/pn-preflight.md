---
name: pn-preflight
description: Marketing UI pre-ship gate — Design Read, tuning dials, strict checklist PASS/FAIL, AI Slop Test. Use before declaring landing/portfolio/editorial pages done.
---

# pn-preflight

**Start every response with:** `[pn-command] 🔺`

Runs the **marketing ship gate** for landing pages, portfolios, and editorial marketing surfaces. Product dashboards and tool UI use **standard** tier (Slop Test only) unless the user requests strict.

## 1. Load references

1. **`pn-core://reference/design-intent.md`** — confirm Design Read and dials exist in plan or session; if missing, produce them first (do not ship).
2. **`pn-core://reference/marketing-ship-gate.md`** — follow tier rules.

**Tier selection:**

| Context | Tier |
|---------|------|
| User invoked `pn-preflight` on marketing UI | **strict** |
| After `pn-design` / `pn-design-dna` on Portfolio / Product marketing / Editorial (not Tool/app) | **strict** |
| `pn-design-dna` / embedded studio DNA | **studio** |
| App shell, dashboard, conversion form in product | **standard** (Slop Test only; skip P-01–P-15 table) |

## 2. Inspect deliverable

Review implemented UI (code + optional screenshot/HTML via `pn-render-verify` when a visual artifact exists). Respect **`.pncore-design.md`** overrides on palette and fonts.

## 3. Emit checklist

Output the PASS/FAIL table from marketing-ship-gate (IDs P-01–P-15 for strict/studio; studio adds DNA bullets from that reference).

Run **AI Slop Test** from `get_skill("pn-frontend-design")`. Count hits; **NO-GO** if ≥3 on strict unless spec documents template intent.

## 4. Verdict

- **`SHIP: GO`** — all strict checks PASS and Slop Test under 3 hits.
- **`SHIP: NO-GO`** — list failing IDs with one-line fixes; map to `pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-bolder`, or `pn-delight` as appropriate.

**Gate:** On NO-GO, do not declare the page done until fixes are applied and preflight re-run (or user explicitly accepts risk).

## See also

- **`pn-design`** — invokes preflight at end of build for marketing modes.
- **`pn-frontend-audit`** — full Phase 1–6 scored audit (broader than preflight).
- **`pn-polish`** — may chain preflight after polish passes.
