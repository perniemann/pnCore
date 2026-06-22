---
name: pn-market-research
description: Sector or theme market research. Define the market, map the competitive landscape, size the opportunity, identify structural drivers and headwinds, and output a structured industry overview with a peer summary table. Use for pitch context, coverage initiation, deal origination, or portfolio sector review.
---

# Market research

## When to use

- Building sector context for a pitch book, initiation report, or IC memo.
- Origination research: mapping a space before identifying targets or themes.
- Portfolio sector review when updating monitoring thesis.
- Deal diligence: competitive landscape section for a CIM or management presentation review.

## Pre-requisites

Load `get_skill("pn-fsi-analyst-discipline")`. State the sector / theme scope, geographic scope, and as-of date.

## Instructions

### 1. Market definition and scope

Before any research: define the market precisely. Ambiguous scope produces unusable output.

- **Sector / theme:** e.g. "North American B2B SaaS for mid-market HR workflows" not "HR software."
- **Geographic scope:** global, regional, or country-specific.
- **Time horizon:** current-state only, or including a forward view (e.g. 2026–2030).
- **What is excluded:** adjacent markets, upstream / downstream segments not in scope.

State this in the deliverable header. If the user's prompt is ambiguous, ask for clarification before proceeding.

### 2. Market sizing

Produce top-down and bottom-up estimates where data permits:

- **Top-down:** Total addressable market (TAM) from a credible source (industry report, regulatory filing, or agent estimate `[est.]`). Note methodology: headcount × spend per seat, units × ASP, etc.
- **Bottom-up:** Sum of reported or estimated revenues for major participants. Note coverage of the total (e.g. "top 10 players = ~60% of estimated TAM").
- **Growth:** CAGR from the sizing source or historical revenue aggregate. Flag if CAGR is extrapolated `[est.]`.

If no sizing data is supplied and no MCP connector provides it, produce the sizing framework and flag all figures as `[est.]`.

### 3. Structural drivers and headwinds

List three to five structural tailwinds and two to three headwinds. For each:

- One-sentence description.
- Evidence or data point (cite source or flag `[est.]`).
- Time horizon (near-term cyclical vs. structural secular).

### 4. Competitive landscape

Map the competitor set into tiers:

| Tier | Description | Example participants |
|---|---|---|
| Tier 1 — Scale leaders | >$Xm revenue or market share >Y% | [names] |
| Tier 2 — Challengers | Meaningful share, growing or repositioning | [names] |
| Tier 3 — Niche / emerging | Focused segment, early or private | [names] |

For each Tier 1 and 2 participant, note: revenue scale, primary differentiation, and one competitive risk.

### 5. Peer summary table

Structured table for public comps or known benchmarks:

| Company | Revenue ($M LTM) | Growth (YoY) | Gross Margin | Key differentiator | Primary risk |
|---|---|---|---|---|---|

Flag private company estimates as `[est.]`. Note if a company was acquired or went private (impacts comparability).

### 6. Ideas shortlist (optional)

When the research is origination-focused, add a short list (3–5 names) of targets, themes, or public expressions worth deeper investigation. For each: one-sentence rationale and the one hypothesis to test. Label this section explicitly as speculative origination framing, not a recommendation.

### 7. Human gate

Surface the sector overview, competitive landscape, and peer table for review. Analyst should verify: market definition matches the intended scope, sizing sources are acceptable, competitor tiers are accurate. Apply `gate: "human"` if inside a typed workflow.

## Output structure

```markdown
## Market research — [Sector / Theme]
**Scope:** [Market definition]  **Geography:** [Scope]  **As of:** [Date]  **Source(s):** [Sources]

### Market sizing
TAM: $Xbn  |  Method: [top-down / bottom-up]  |  Growth: X% CAGR ([period])

### Structural drivers
1. [Driver] — [Evidence / source]
…

### Headwinds
1. [Headwind] — [Evidence / source]
…

### Competitive landscape
[Tier table]

### Peer summary
[Peer table]

### Ideas shortlist (if applicable)
[Speculative origination framing; not a recommendation]

> _Draft analyst work product. Professional review required before use._
```

## Guardrails

- Market sizing without a stated methodology is not useful; always show the arithmetic or flag as rough `[est.]`.
- Competitive tiers are qualitative; note the basis for tier assignment (revenue, share, analyst judgment).
- Do not extend to stock-specific investment recommendations from sector research output.
- Private company data is typically estimated; mark every private-company figure `[est.]`.

## Integration

- **pn-fsi-analyst-discipline** — always load first.
- **pn-comps-analysis** — peer summary from market research feeds the comps universe selection.
- **pn-earnings-analysis** — sector-level drivers provide context for single-name thesis read-through.
- **pn-ic-memo** — market research feeds the "Market and competitive context" section.
