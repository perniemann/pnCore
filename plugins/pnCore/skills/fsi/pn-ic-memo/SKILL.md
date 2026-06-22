---
name: pn-ic-memo
description: Investment committee memo drafting. Structure a full IC memo from deal or thesis inputs: situation overview, investment thesis, market and competitive context, financial summary and valuation, key risks with mitigants, returns analysis, open items, and recommendation. Does not constitute an investment recommendation for end clients — output requires IC sign-off before use.
---

# IC memo

## When to use

- Private equity or credit: preparing a new investment or follow-on for committee approval.
- Corporate M&A: framing an acquisition or strategic investment for internal approval.
- Equity research (internal): documenting the investment case before publishing.
- Any context where a structured investment decision memo is required for stakeholder review.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")`. Confirm what was supplied: deal terms, financial model, market research, diligence notes, management presentation. State what is available and what is absent (absent sections will be flagged as "to be completed").

## Instructions

### 1. Situation overview

One to two paragraphs:

- Who is the company / target? Primary business, end markets, revenue scale, geography.
- What is the transaction / decision? (New investment, follow-on, add-on acquisition, strategic exit, etc.)
- What is the proposed structure? (Equity, debt, hybrid; ownership %; deal size.)
- What is the timeline? (Expected close, IC approval deadline.)

### 2. Investment thesis

Three to five bullet points, each structured as: **Hypothesis** — supporting evidence — what must be true for this to hold. Be specific; avoid generic statements ("strong market position").

Example format:
> **Category-defining moat in mid-market ERP:** Company has 92% gross revenue retention and 4-year average contract length in a segment where competitors average 2 years — moat is contractual stickiness, not switching cost alone. Holds as long as enterprise platform commoditization does not reach the mid-market within the hold period.

### 3. Market and competitive context

Pull from `get_skill("pn-market-research")` output if available, or summarize:

- Market size and growth rate (cite source; flag `[est.]` if estimated).
- Competitive tier the company occupies (leader / challenger / niche).
- Two to three most relevant competitive risks and the company's counter-position.

### 4. Financial summary

Pull from model output (`pn-dcf-model`, `pn-comps-analysis`) if available.

Key table:

| Metric | LTM Actual | Year 1E | Year 2E | Year 3E |
|---|---|---|---|---|
| Revenue ($M) | | | | |
| Revenue growth (%) | | | | |
| Gross margin (%) | | | | |
| EBITDA ($M) | | | | |
| EBITDA margin (%) | | | | |
| Free cash flow ($M) | | | | |
| Net debt / EBITDA | | | | |

Flag all forward estimates as `[est.]`. Note if the model has been audited via `pn-financial-model-audit`.

### 5. Valuation

Entry multiple and implied value:

- Entry EV/EBITDA (or EV/Revenue for pre-EBITDA): state the multiple and compare to comps median.
- Intrinsic value (DCF midpoint): state the implied price vs. proposed entry.
- Downside entry: what does the multiple look like if EBITDA misses by 20%?

Include the football field if comps and DCF output are available.

### 6. Returns analysis

For PE / credit transactions:

| Scenario | Exit Year | Exit Multiple | Exit EBITDA | Exit EV | Exit Equity | MOIC | IRR |
|---|---|---|---|---|---|---|---|
| Base | | | | | | | |
| Bull | | | | | | | |
| Bear | | | | | | | |

State leverage assumptions, fee load, and whether management rollover is included. Flag all as `[est.]`.

For equity research / corporate: state the upside / downside to intrinsic value and the key scenario drivers.

### 7. Key risks and mitigants

Five to seven risks, each with:

- **Risk:** One sentence statement.
- **Severity:** High / Medium / Low (probability × impact).
- **Mitigant:** What partially offsets the risk (not a dismissal — a real structural or contractual offset).
- **Residual:** What remains after the mitigant.

Do not omit high-severity risks; the IC memo is the place to surface them, not suppress them.

### 8. Open items and conditions

List every material open item: pending diligence workstream, management reference, legal review, regulatory approval, financing condition. For each: what is needed, who owns it, by when.

### 9. Recommendation

Draft recommendation for the IC to approve or modify. Must include:

- Proposed action (invest / pass / conditional proceed).
- Key conditions or approvals required before close.
- Hard no-go conditions (deal-breakers if they arise post-IC).

**This is a draft for IC deliberation.** The recommendation does not constitute a final investment decision until IC sign-off. Apply `gate: "human"` — this step is always gated.

## Output structure

```markdown
## Investment committee memo — [Company / Transaction]
**Prepared:** [Date]  **IC Date:** [Date or TBD]  **Confidential — draft for IC review only**

### 1. Situation overview
[2 paragraphs]

### 2. Investment thesis
- [Thesis point 1]
…

### 3. Market and competitive context
[Summary or "See market research appendix"]

### 4. Financial summary
[Table]
Model audit status: [PASS / FLAG / Not audited]

### 5. Valuation
[Entry multiple, DCF midpoint, downside entry, football field if available]

### 6. Returns analysis
[Scenario table]

### 7. Key risks and mitigants
[Risk table]

### 8. Open items
[Table: Item | Owner | Due date]

### 9. Recommendation
[Draft — requires IC sign-off]

> _This memo is draft analyst work product prepared for IC review. It does not constitute an investment recommendation to any client. All forward estimates are subject to revision. Professional review and IC approval required before any action._
```

## Guardrails

- The thesis section must make falsifiable claims — if a thesis point cannot be tested or disproved, rewrite it.
- Do not suppress high-severity risks; an IC memo that omits material risks creates liability.
- Returns analysis figures are estimates; label every forward number `[est.]`.
- Do not use IC memo language for client-facing distribution — this is an internal decision document.

## Red flags — stop

- Thesis points are generic ("large market," "strong management," "good product") with no supporting evidence → stop; require specific evidence before drafting.
- Open items section is empty but deal is complex → stop; enumerate diligence gaps before completing memo.
- Model has not been built or supplied → stop; flag and ask for financial model before completing sections 4–6.

## Integration

- **pn-fsi-analyst-discipline** — always load first; IC recommendation is always `gate: "human"`.
- **pn-comps-analysis** — feeds valuation section.
- **pn-dcf-model** — feeds valuation and returns section; include model audit status.
- **pn-financial-model-audit** — run before using model figures in sections 4–6.
- **pn-market-research** — feeds section 3; include or reference as appendix.
- **approval_checkpoint (MCP)** — use for hard HITL enforcement on IC sign-off if `PNCORE_APPROVAL_TOKEN` is configured.
