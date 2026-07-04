---
name: pn-design-variants
description: Explore 3+ radically different design approaches in parallel, then compare and pick the strongest. Based on "Design It Twice." Use before committing to a layout, component design, or architecture choice.
---

# pn-design-variants

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-design-variants")`.

Spawns parallel sub-agents each constrained to a radically different design approach, then compares them. The value is in the contrast — seeing divergent approaches reveals tradeoffs that a single design hides.

## When to use

Before committing to a design or interface shape. Not for implementing — for exploring the solution space.

| Signal | Use `pn-design-variants` |
|--------|-------------------------|
| You have one design and aren't sure it's right | Yes |
| You want to see what the best-case alternative looks like | Yes |
| You've already decided and want to implement | No — use `pn-visual-tweak` or `pn-polish` |
| You want a critique of one existing design | No — use `pn-skeptic` or `pn-grill` |

Good inputs: layout decisions, component shapes, information architecture, navigation patterns, landing page structures, color direction choices.

## How to invoke

Describe the design problem or paste the current design. Optionally specify:
- Number of variants (default: 3)
- Constraints that must hold across all variants (e.g. "must work on mobile", "must use existing component library")
- The selection criteria you care about most (e.g. "simplicity", "conversion", "accessibility")

## Output

For each variant:
- Visual or structural description
- Core bet (what assumption this variant validates)
- Strengths and weaknesses
- Use case it's optimized for

Final comparison table with a recommended pick and rationale.

## Guardrails

- Each variant must be genuinely different — not iterations of the same idea
- No variant gets implementation until the comparison is done and the user confirms a direction
- If the variants converge, flag it and ask for an additional constraint to diverge further
- After the user picks a direction and wants **code** tournaments → `/pn-best-of-n` (not this command)
