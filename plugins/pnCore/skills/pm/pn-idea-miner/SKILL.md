---
name: pn-idea-miner
description: "Generate product ideas from market signals, trend research, and gaps. Use when exploring SaaS opportunities or product discovery; feeds into pn-create-prd."
---

# Idea mining (product discovery methodology)

## When to use

- Product discovery phase: user wants SaaS ideas, feature concepts, or opportunity exploration
- Before pn-create-prd when no concrete product is defined yet
- Market signals available: trends, competitor gaps, user pain points

## Methodology

Common pattern: combine trend research, gap analysis, and feasibility scoring to rank ideas.

1. **Scope:** Geography, vertical, time horizon. Clarify constraints (technical, regulatory, budget).
2. **Gather signals:** Use § Trend research below or web search for trends, competitors, emerging needs. Look for gaps: underserved segments, outdated tooling, regulatory changes.
3. **Generate ideas:** For each gap or trend, propose 2–3 product concepts. One sentence each; no full spec.
4. **Score:** Fit to signals, feasibility (stack, team), differentiation. Rank by potential.
5. **Output:** Top 3–5 ideas with rationale. Gate: "Proceed with [idea] for PRD?" Options: yes, refine, explore another.

## Output

- Ranked idea list with brief rationale
- Gate: user selects which idea to develop (or refine)
- Pass to pn-create-prd with selected idea

## Integration

- **pn-pressure-test:** Optional — before PRD, stress-test the chosen idea (verdict, flaws, MVP wedge).
- **pn-create-prd:** After gate, run pn-create-prd with the selected idea as input.
- **pn-prior-art-research:** When idea is selected, run prior-art before implementation plan.

## Guardrails

- Do not claim "industry standard" or "best practice" for ideation; frame as methodology.
- One idea per PRD; do not mix multiple ideas in one spec.
- Gate on user selection before proceeding to PRD.

<!-- merged from pn-trend-research (0.22.0) -->
## Trend research

### When to use

- Market opportunity assessment before build.
- Competitive landscape and positioning.
- Emerging trend identification.
- Validation for pn-prior-art-research or product strategy.

### Workflow

1. **Scope:** Market, geography, time horizon.
2. **Gather:** WebSearch/WebFetch for trends, competitors, signals.
3. **Analyze:** Patterns, gaps, opportunities.
4. **Synthesize:** Insights with confidence; actionable recommendations.

### Output

- Market or trend brief with scope, sources, confidence level, and concrete product or strategy implications.

### Guardrails

- Label speculation vs sourced facts; prefer primary or recent sources over stale SEO pages.

### Integration

- **pn-prior-art-research** — Overlap; use for solution/technology landscape.
- **pn-discovery-questionnaire** — When requirements need structure.
