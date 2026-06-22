---
name: pn-dcf-model
description: Discounted cash flow valuation. Structure revenue and margin assumptions, build a free cash flow bridge, derive WACC, compute terminal value, and output an implied equity value range with sensitivity tables. Use standalone or as the second leg of a full valuation summary alongside pn-comps-analysis.
---

# DCF model

## When to use

- Building intrinsic-value context for a coverage initiation, IC memo, or deal fairness frame.
- When trading comps are distorted (no close peers, cyclical trough/peak, structural transition).
- Sensitivity analysis to stress-test acquisition price or exit assumption.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")` before producing any output. State scope, as-of date, and sources at the top.

## Instructions

### 1. Scope and inputs declaration

Before building, declare:

- Projection period (typically 5 or 10 years; state why).
- Base-year revenue and EBITDA (from filing or user-supplied; cite).
- Working capital and capex intensity assumptions (from historical or industry norm; flag if estimated).
- Tax rate assumption (effective statutory; note deferred tax treatment if material).

If any input is estimated rather than sourced, mark it `[est.]` in the model and enumerate all `[est.]` items at the end for reviewer attention.

### 2. Revenue and margin build

Year-by-year for the projection period:

- **Revenue:** Base × (1 + growth rate). State growth assumption rationale: analyst consensus, historical CAGR, management guidance, or agent estimate flagged `[est.]`.
- **EBITDA margin:** Trajectory from current to terminal margin. State whether margin expansion is assumed and why (operating leverage, mix shift, cost program).
- **D&A:** As % of revenue or absolute; consistent with capex.
- **EBIT = EBITDA – D&A.**

### 3. Free cash flow bridge

For each projection year:

```
EBIT
– Tax on EBIT (EBIT × effective tax rate)
= NOPAT
+ D&A
– Capex
± Change in net working capital
= Unlevered free cash flow (UFCF)
```

Present as a table. Flag any year with negative UFCF and note whether it is expected (investment phase) or an assumption gap.

### 4. WACC

Components:

| Input | Source / Method |
|---|---|
| Risk-free rate | 10-year government bond yield (user-supplied or noted as `[est.]`) |
| Equity risk premium | Damodaran or user-supplied; cite vintage |
| Beta | Peer-set median unlevered beta, re-levered at target capital structure; or Bloomberg 5-year weekly if available |
| Cost of debt | Current debt coupon or credit spread + risk-free; tax-effected |
| Capital structure | Target D/(D+E) from management guidance or peer median |

Output: `WACC = X.X%`. State each component. If inputs are estimates, output a WACC range (±50–100bps) and carry it into sensitivity.

### 5. Terminal value

Two methods; use both as a cross-check:

- **Exit multiple:** Apply a terminal EV/EBITDA multiple (typically peer median or slight discount for risk) to final-year EBITDA. Cite peer median source.
- **Gordon Growth:** `TV = UFCF_n × (1 + g) / (WACC – g)`. Terminal growth rate `g` should not exceed long-run GDP growth for the relevant economy; flag if it does.

Compute TV as % of total enterprise value — if >75%, note the sensitivity caveat prominently.

### 6. Implied enterprise and equity value

- Sum PV of UFCF + PV of terminal value = Enterprise value.
- Equity value = EV – Net debt – Minority interest – Preferred.
- Implied share price = Equity value / Diluted shares outstanding.

### 7. Sensitivity tables

Produce two sensitivity tables (2×2 minimum, 3×3 preferred):

1. WACC × Terminal growth rate → Implied EV.
2. WACC × Exit multiple → Implied EV (if exit-multiple TV used).

Mark the base case clearly.

### 8. Human gate

Present assumptions summary, FCF table, WACC derivation, TV calculation, and sensitivity tables. Gate on analyst review: assumptions are defensible, `[est.]` items are replaced or acknowledged, sensitivity range is reasonable for the deal / coverage context.

## Output structure

```markdown
## DCF valuation — [Subject]
**As of:** [Date]  **Projection period:** [N years]  **Source(s):** [Data sources]

### Assumptions
[Table: Input | Value | Source]
[est.] items: [list]

### Free cash flow summary
[Table: Year | Revenue | EBITDA% | EBIT | Tax | D&A | Capex | ΔNWC | UFCF | PV(UFCF)]

### WACC derivation
[Table: Component | Value]
WACC: X.X%

### Terminal value
Exit multiple method: $Xm  |  Gordon Growth method: $Ym  |  TV as % of EV: Z%

### Implied value
EV: $Xm  |  Equity value: $Ym  |  Implied price: $Z.ZZ

### Sensitivity
[WACC × g table]
[WACC × exit multiple table]

> _Draft analyst work product. All assumptions require professional review. [est.] items must be replaced with verified inputs before use._
```

## Guardrails

- Terminal value >75% of EV is a red flag; note it and widen the sensitivity range.
- Never omit the `[est.]` log; untracked assumptions are a model-risk failure.
- Do not present a point estimate as a conclusion — always pair with sensitivity.
- Do not use to produce "price target" language for distribution without professional sign-off.

## Integration

- **pn-fsi-analyst-discipline** — always load first.
- **pn-comps-analysis** — combine football fields; comps-derived exit multiple feeds DCF TV.
- **pn-financial-model-audit** — run after DCF is complete to check balance, hardcodes, and formula integrity.
- **pn-ic-memo** — DCF output feeds the valuation section; sensitivity tables go in the appendix.
