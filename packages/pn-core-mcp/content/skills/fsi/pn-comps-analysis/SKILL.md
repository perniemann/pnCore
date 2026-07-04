---
name: pn-comps-analysis
description: "Comparable company analysis (trading comps). Select a peer set, pull or structure key trading multiples (EV/EBITDA, EV/Revenue, P/E, EV/EBIT), compute spread statistics, and output a structured comps table with narrative commentary. Use for valuation context in pitches, IC memos, or coverage notes."
---

# Comparable company analysis

## When to use

- Building valuation context for a pitch deck, CIM, IC memo, or initiation.
- Calibrating an entry / exit assumption against the current trading market.
- Quick-turn peer benchmarking during earnings or deal process.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")` before producing any output. State scope, as-of date, and source at the top of the deliverable.

## Instructions

### 1. Define the peer universe

- Start from the subject company's primary SIC / GICS code and revenue band.
- Select 6–12 peers with at least three of: same subsector, comparable revenue scale, same geographic exposure, similar margin profile.
- Exclude peers with recent M&A distortion, restatements, or trading halts unless they are material comps (note and flag them).
- Document the exclusion rationale; the selection methodology is part of the deliverable.

### 2. Collect multiples

Preferred sources (in order): user-supplied data file → MCP financial data connector (if configured in workspace `.mcp.json`) → public filings footnote → analyst estimate (flag as estimate).

Key multiples to structure:

| Multiple | Numerator | Denominator | Notes |
|---|---|---|---|
| EV / LTM Revenue | Enterprise value | Last-twelve-months revenue | Useful for high-growth, negative EBITDA |
| EV / NTM Revenue | Enterprise value | Next-twelve-months consensus revenue | Forward-looking; flag as estimate |
| EV / LTM EBITDA | Enterprise value | LTM adjusted EBITDA | Core valuation anchor |
| EV / NTM EBITDA | Enterprise value | NTM consensus EBITDA | Forward; flag as estimate |
| P / NTM EPS | Market cap | NTM consensus EPS | Equity-value multiple; use for profitable peers |

State the enterprise value calculation: `EV = Market cap + Net debt + Minority interest + Preferred`. If balance sheet data is unavailable, note the gap and use market cap as a proxy with a caveat.

### 3. Compute spread statistics

For each multiple, compute: **low, 25th pct, median, 75th pct, high, mean**. Flag outliers (>2σ from mean) — include them in the range but exclude from the trimmed median when noted.

### 4. Implied value range for the subject

Apply the 25th–75th percentile band from each multiple to the subject's corresponding metric. Output a football field:

```
EV/LTM EBITDA  [25th–75th band]  →  Implied EV: $Xm – $Ym
EV/NTM EBITDA  [25th–75th band]  →  Implied EV: $Am – $Bm
EV/NTM Rev     [25th–75th band]  →  Implied EV: $Cm – $Dm
```

### 5. Commentary

Two to four sentences covering: where subject trades vs. peers (premium / discount), primary driver of any spread (growth delta, margin, geographic mix), and any peer-set limitation to flag for the reader.

### 6. Human gate

Present the completed comps table, football field, and commentary. Do not finalize or embed in any downstream deliverable until the analyst confirms: peer set is appropriate, multiples are verified against sources, implied range is reasonable. Apply `gate: "human"` if inside a typed workflow.

## Output structure

```markdown
## Comparable company analysis
**Subject:** [Company]  **As of:** [Date]  **Source(s):** [Data sources]

### Peer set
[Table: Company | Subsector | Revenue ($M LTM) | EV/LTM EBITDA | EV/NTM EBITDA | EV/LTM Rev | P/NTM EPS]

### Spread statistics
[Table: Multiple | Low | 25th | Median | 75th | High | Mean]

### Implied value — [Subject]
[Football field table]

### Commentary
[2–4 sentences]

> _Draft analyst work product. Professional review required before use._
```

## Guardrails

- Never synthesize a market cap, EV, or multiple if no source is supplied — flag the gap.
- NTM consensus figures are estimates; label them as such in every row.
- Peer set exclusions must be documented; unexplained exclusions undermine the analysis.
- Do not extend to "Buy / Sell / Hold" framing; output is valuation context only.

## Integration

- **pn-fsi-analyst-discipline** — always load first.
- **pn-dcf-model** — combine football field outputs to form a full valuation summary.
- **pn-ic-memo** — comps table feeds the valuation section of the IC memo.
- **pn-earnings-analysis** — re-run comps at updated market prices post-earnings.
