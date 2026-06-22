---
name: pn-idea-miner
description: Generate product ideas from market signals, trends, and gaps. Use when exploring SaaS opportunities or product discovery; feeds into pn-create-prd.
---

# Idea mining (product discovery methodology)

## When to use

- Product discovery phase: user wants SaaS ideas, feature concepts, or opportunity exploration
- Before pn-create-prd when no concrete product is defined yet
- Market signals available: trends, competitor gaps, user pain points

## Methodology

Common pattern: combine trend research, gap analysis, and feasibility scoring to rank ideas.

1. **Scope:** Geography, vertical, time horizon. Clarify constraints (technical, regulatory, budget).
2. **Gather signals:** Use pn-trend-research or web search for trends, competitors, emerging needs. Look for gaps: underserved segments, outdated tooling, regulatory changes.
3. **Generate ideas:** For each gap or trend, propose 2–3 product concepts. One sentence each; no full spec.
4. **Score:** Fit to signals, feasibility (stack, team), differentiation. Rank by potential.
5. **Output:** Top 3–5 ideas with rationale. Gate: "Proceed with [idea] for PRD?" Options: yes, refine, explore another.

## Output

- Ranked idea list with brief rationale
- Gate: user selects which idea to develop (or refine)
- Pass to pn-create-prd with selected idea

## Integration

- **pn-trend-research:** Overlap with market/competitor research; use for signal gathering.
- **pn-pressure-test:** Optional — before PRD, stress-test the chosen idea (verdict, flaws, MVP wedge).
- **pn-create-prd:** After gate, run pn-create-prd with the selected idea as input.
- **pn-prior-art-research:** When idea is selected, run prior-art before implementation plan.

## Guardrails

- Do not claim "industry standard" or "best practice" for ideation; frame as methodology.
- One idea per PRD; do not mix multiple ideas in one spec.
- Gate on user selection before proceeding to PRD.
