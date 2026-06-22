---
name: pn-financial-model-audit
description: Audit a financial model (spreadsheet, structured table, or agent-produced model) for hardcoded values, broken formula logic, balance-sheet balance, circular references, and missing cross-checks. Use after any DCF, LBO, comps, or 3-statement model is built before it is used in a deliverable.
---

# Financial model audit

## When to use

- After `pn-dcf-model`, `pn-comps-analysis`, or any LBO / 3-statement build, before the model feeds a deliverable.
- When a user supplies a spreadsheet or table for review.
- As a quality gate in a modeling workflow step before proceeding to memo or presentation.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")`. Identify what was supplied: agent-produced structured output, user-uploaded file, or inline table.

## Audit checklist

### 1. Hardcode detection

- Scan each row and formula for values that should be calculated but are typed as constants.
- Common offenders: tax rate typed as a number instead of referencing an assumption cell; D&A that does not roll from a schedule; NWC changes that are zero rather than formula-driven.
- Flag each hardcode: location (row / column / step), expected behavior, suggested fix.

### 2. Formula integrity

- Verify that each calculated line follows from the stated formula (e.g. `UFCF = NOPAT + D&A – Capex – ΔNWC`).
- Check for sign errors: cash outflows (capex, NWC increase) must be subtracted; inflows (D&A add-back) added.
- Check that growth rates are applied to the correct base (prior-year, not base-year, for compound growth).
- Check that discount factors use consistent periodicity (annual vs. mid-year convention; state which and apply uniformly).

### 3. Balance checks

For 3-statement models:
- Assets = Liabilities + Equity (balance sheet check; flag any period that does not balance).
- Cash flow statement: net change in cash reconciles to balance sheet cash movement.
- Retained earnings roll: opening RE + Net income – Dividends = Closing RE.

For DCF / LBO:
- PV of UFCF + PV of TV = EV (verify discounting arithmetic).
- Equity bridge: EV – Net debt – Minority – Preferred = Equity value.
- Returns check (LBO): sponsor equity = purchase equity – fees; exit equity = exit EV – exit debt; MOIC = exit equity / sponsor equity.

### 4. Circular references

- Flag any circular dependency (e.g. interest expense referencing ending debt, which depends on interest). Note whether it is intentional (iterative solve) and whether iteration is enabled.
- If not intentional, suggest the decoupling fix.

### 5. Sensitivity table validation

- Verify that sensitivity axes are independent variables (not outputs).
- Confirm base case is correctly marked and matches the main model output.
- Check that the sensitivity range is economically plausible (e.g. WACC range spanning the plausible borrowing + equity cost window; not arbitrarily wide or narrow).

### 6. Assumption log completeness

- Verify every `[est.]` item from the model build is listed and flagged for analyst review.
- Flag any assumption that has no source and is not marked `[est.]`.

## Output

Produce a structured audit report:

```markdown
## Model audit — [Model name / type]
**Audited:** [Date]

### Hardcodes found
[Table: Location | Current value | Expected behavior | Suggested fix]
None found / [N] issues

### Formula errors
[Table: Line | Issue | Suggested correction]
None found / [N] issues

### Balance checks
[Pass / Fail per check; detail on failures]

### Circular references
[None / list with resolution guidance]

### Sensitivity validation
[Pass / Flag; notes]

### Assumption log
[est.] items: [list]  |  Unsourced unlabeled items: [list]

### Summary verdict
PASS — model is internally consistent and ready for deliverable use.
OR
FLAG — [N] issues require resolution before use: [priority list]
```

## Guardrails

- An audit finding of "PASS" does not validate the economic assumptions — it validates internal consistency only. State this in the summary.
- Do not modify the model during audit; list findings for the analyst to action.
- Treat audit findings as advisory; the analyst decides whether to fix or accept and note.

## Integration

- **pn-dcf-model, pn-comps-analysis** — run this skill after build, before output feeds downstream.
- **pn-ic-memo** — include audit verdict (PASS / FLAG + issue count) in the IC memo model section.
- **pn-fsi-analyst-discipline** — audit findings are model-risk items; gate on human review when FLAG verdict is issued.
