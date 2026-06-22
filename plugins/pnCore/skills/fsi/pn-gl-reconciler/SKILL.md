---
name: pn-gl-reconciler
description: General ledger reconciliation and break analysis. Ingest a trial balance and subledger (or equivalent source), identify open items and breaks, trace each break to a root cause category, and produce a structured break report routed to the appropriate approver. Does not post journal entries or mark items settled — all resolution actions require human sign-off.
---

# GL reconciler

## When to use

- Month-end or period-end close: comparing GL trial balance to subledger, sub-system, or bank statement.
- Break investigation: a prior reconciliation flagged open items that need root-cause triage.
- Pre-audit preparation: clean up open items before external review.
- NAV tie-out support for fund admin workflows.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")`. Confirm what was supplied:
- GL trial balance (by account, period).
- Subledger or contra source (bank statement, sub-system export, custodian report).
- Prior reconciliation (if this is a continuation / aging review).

State the as-of date and account scope at the top of the output.

## Instructions

### 1. Ingest and normalize

- Parse both sources to a common format: account code, description, debit/credit, period, amount.
- Normalize sign convention: establish which is the "book" side and which is the "source" side; state the convention.
- Flag any line where currency, date, or account mapping is ambiguous before proceeding.

### 2. Match

For each GL line, attempt to match to a source line using:

1. **Exact match:** Same amount, same date, same reference number.
2. **Partial match:** Same amount, different date (timing item) or different reference (possible re-booking).
3. **Aggregate match:** Multiple source lines sum to one GL line or vice versa (split / aggregate posting).

Record match status for every line. Do not discard unmatched items.

### 3. Identify breaks

A **break** is any GL line with no matched source line (or vice versa). For each break:

| Field | Value |
|---|---|
| Account | |
| Description | |
| Amount | |
| Age (days since first appearance) | |
| Book side / Source side | |
| Prior period carry-forward? | |

### 4. Root cause triage

Categorize each break into one of:

| Category | Description |
|---|---|
| **Timing** | Transaction in GL but not yet in source (or vice versa); expected to clear within N days |
| **Booking error** | Wrong account, wrong amount, or duplicate posting on one side |
| **Missing entry** | Transaction in source with no corresponding GL entry |
| **Reclassification needed** | Posted to wrong cost center, entity, or account; correct posting exists elsewhere |
| **Disputed / investigation** | Amount or transaction cannot be explained by available data; requires external input |

For each break, state the category and the cheapest next action to resolve it (e.g. "Timing — check payment clearing file dated T+2"; "Booking error — compare to original invoice; likely duplicate"; "Disputed — escalate to controller with source documentation").

Do not resolve any break unilaterally. All resolution actions are recommendations for the human approver.

### 5. Aging summary

Group breaks by age bucket: 0–30 days, 31–60 days, 61–90 days, >90 days. Items >60 days in the "Disputed" category require escalation.

### 6. Routing

For each break category, route to the appropriate function:

| Category | Route to |
|---|---|
| Timing | Cash / ops team to confirm clearing |
| Booking error | Preparer to correct posting; reviewer to approve |
| Missing entry | Preparer to book; controller to approve |
| Reclassification | Preparer + cost-center owner; controller to approve |
| Disputed >60 days | Controller + CFO; document in aging memo |

### 7. Human gate — mandatory

The output of this skill is a break report and routing recommendation. **No journal entries are posted, no items are marked settled, no account is signed off without explicit human approval.** Present the full break report and await sign-off before any resolution is recorded. Apply `gate: "human"` if inside a typed workflow.

## Output structure

```markdown
## GL reconciliation — [Account / Entity]
**As of:** [Date]  **Period:** [Period]  **Source(s):** [GL system / subledger / bank]

### Summary
Total GL lines: X  |  Matched: Y  |  Open breaks: Z  |  Net break amount: $A

### Break detail
[Table: Account | Description | Amount | Age (days) | Category | Next action | Route to]

### Aging summary
[Table: Bucket | Count | Amount]

### Escalations required
[List of >60-day Disputed items with recommended escalation path]

> _This is a reconciliation work product staged for human review. No journal entries have been posted. All resolution actions require approver sign-off._
```

## Guardrails

- Never post, mark settled, or approve a journal entry — state this as a hard boundary in the output.
- If a break cannot be categorized with available data, label it "Disputed" and escalate; do not guess.
- Age calculation must use the date of first appearance of the break, not the current reconciliation date.
- Items that were open in a prior period and carry forward must be flagged explicitly — they indicate a process gap, not just a timing item.

## Red flags — stop

- Agent is about to generate a journal entry for posting → stop; produce a draft for approver review only.
- More than 20% of GL lines are unmatched → stop and surface to controller before completing triage; data quality may be insufficient for reliable root-cause analysis.
- Any break is labeled as PII (personal account, employee record) → stop; redact and route to HR / legal.

## Integration

- **pn-fsi-analyst-discipline** — always load first; human gate on recon output is structural.
- **approval_checkpoint (MCP)** — use for hard HITL enforcement on sign-off when `PNCORE_APPROVAL_TOKEN` is configured.
- **pn-compliance-check** — escalate when breaks involve regulatory capital accounts, reserve calculations, or fund distribution amounts.
