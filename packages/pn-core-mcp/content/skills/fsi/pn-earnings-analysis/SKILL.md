---
name: pn-earnings-analysis
description: "Post-earnings analysis. Ingest earnings call transcript and/or quarterly filing, compute actuals vs. consensus delta, update key model line items, and draft a structured earnings note (headline, key metrics, model update, thesis read-through, open questions). Use after a quarterly print for equity research coverage or portfolio monitoring."
---

# Earnings analysis

## When to use

- After a company reports quarterly results: transcript available, filing released, or both.
- Portfolio monitoring pass after a position reports.
- As a workflow step in a coverage cadence (replace with fresh data each quarter).

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")`. Confirm what was supplied: transcript, 10-Q/10-K excerpt, press release, or some combination. State source and filing date.

## Instructions

### 1. Establish the consensus baseline

Before reading actuals, record the pre-print consensus (user-supplied or sourced from MCP connector if available):

| Metric | Consensus estimate | Source |
|---|---|---|
| Revenue | $Xm | [source] |
| EBITDA | $Xm | [source] |
| EPS | $X.XX | [source] |
| Key operational KPI (MAU, units, ARR, etc.) | X | [source] |

If no consensus is available, note: "No consensus baseline supplied — beat/miss analysis will be omitted; absolute actuals only."

### 2. Extract actuals from filing or transcript

Pull the same metrics from the supplied source. Cite the exact page, section, or timestamp for each figure. Flag any metric that requires adjustment (e.g. management-defined "Adjusted EBITDA" vs. GAAP EBITDA — show the bridge).

### 3. Beat / miss delta

For each metric:

```
Beat/Miss = Actual – Consensus  |  % delta = (Actual – Consensus) / |Consensus|
```

Label each: **Beat**, **In-line** (±1%), or **Miss**. Note any metric where consensus dispersion was unusually wide (>10% interquartile range) — the beat/miss signal is weaker there.

### 4. Model update

Identify which model line items change given the new print. For each change:

- What changes (e.g. FY revenue, margin guidance range, NWC assumption).
- Direction and magnitude (e.g. "FY revenue +2% vs. prior model; guided midpoint $Xm vs. prior $Ym").
- Whether the change comes from guidance, extrapolation, or agent estimate (`[est.]`).

If no model exists in context, output the update as a list of line-item revisions to apply to the analyst's model.

### 5. Thesis read-through

Two to four sentences: Does the print reinforce, challenge, or leave unchanged the core investment thesis (or monitoring thesis for portfolio)? Identify the one or two data points most relevant to the thesis.

### 6. Management commentary highlights

Pull three to five verbatim or close-paraphrase quotes from the transcript that are most thesis-relevant (guidance tone, competitive commentary, capital allocation). Cite speaker and timestamp or page.

### 7. Open questions

List two to five questions the print raises that require follow-up (next quarter, investor day, or analyst call). Format: question, why it matters to the thesis.

### 8. Human gate

Surface the completed note for analyst review before any distribution or use in a client-facing context. Apply `gate: "human"` if inside a typed workflow.

## Output structure

```markdown
## Earnings note — [Company] [Quarter / Year]
**Reported:** [Date]  **Source(s):** [transcript / filing / press release]

### Headline
[One sentence: top-line beat/miss and EPS beat/miss, plus tone word]

### Key metrics
[Table: Metric | Consensus | Actual | Beat/Miss | % Delta]

### Model update
[Bullet list: line item → change → source]

### Thesis read-through
[2–4 sentences]

### Management commentary
- "[Quote]" — [Speaker], [timestamp / page]
- …

### Open questions
1. [Question] — [Why it matters]
…

> _Draft analyst work product. Professional review required before distribution._
```

## Guardrails

- Beat/miss without a consensus baseline is noise; if no baseline is supplied, omit the delta column and note it.
- Verbatim quotes must be attributed and cited; do not paraphrase without labeling it as paraphrase.
- Do not extend thesis read-through to explicit "Buy / Sell / Hold" — output is analytical framing only.
- If multiple quarters are being compared, note any reclassification or restatement between periods.

## Integration

- **pn-fsi-analyst-discipline** — always load first.
- **pn-comps-analysis** — re-run comps at updated prices if meaningful re-rating occurred.
- **pn-dcf-model** — apply model updates from step 4 to the DCF and note the implied price change.
- **pn-market-research** — use when the earnings print has sector-level implications beyond a single name.
