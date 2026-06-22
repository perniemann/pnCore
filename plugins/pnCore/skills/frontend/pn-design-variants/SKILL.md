---
name: pn-design-variants
description: Generate 3+ radically different designs or API interfaces in parallel using sub-agents, then compare and synthesize. Based on "Design It Twice" from A Philosophy of Software Design. Use before committing to a single design approach — for UI layouts, component APIs, module interfaces, or system architecture choices.
---

# Design variants

## When to use

- Before choosing a UI layout, component shape, or page structure
- When designing a module or API interface and unsure which shape is best
- When the user says "show me options", "design it twice", or "explore alternatives"
- As an alternative to pn-design when multiple directions are worth exploring before committing

## Principle

From "A Philosophy of Software Design" by John Ousterhout: your first idea is unlikely to be the best. Generate multiple radically different designs, then compare. The value is in the contrast — seeing divergent approaches reveals tradeoffs that a single design hides.

## Workflow

### 1. Gather requirements

Ask:
- "What problem does this [module/UI/interface] solve?"
- "Who are the callers or users? (other modules, external users, tests, end users)"
- "What are the key operations or interactions?"
- "Any constraints? (performance, compatibility, existing patterns, tech stack)"
- "What should be hidden inside vs. exposed?"

Do not generate designs until requirements are clear.

### 2. Generate designs — parallel sub-agents

Spawn 3+ sub-agents using the Task tool simultaneously. Each sub-agent must produce a **radically different** approach — enforce this by assigning each a different constraint:

```
Prompt template for each sub-agent:

Design a [UI/interface/module] for: [description]

Requirements: [gathered requirements]

Your constraint for this design:
- Agent 1: "Minimize surface area — aim for the fewest methods/props/interactions"
- Agent 2: "Maximize flexibility — support edge cases and future use cases"
- Agent 3: "Optimize for the most common use case — make the happy path frictionless"
- Agent 4 (optional): "Take inspiration from [specific paradigm or library — e.g. React hooks, Unix pipes, spreadsheet formulas]"

Output:
1. Interface/layout signature (types, props, methods, or wireframe description)
2. Usage example — how a caller or user interacts with it in practice
3. What this design hides internally
4. Trade-offs of this approach (strengths and weaknesses)
```

Do not let sub-agents produce similar designs — enforce the constraints.

### 3. Present designs

Show each design sequentially so the user can absorb each before comparison:

For each design:
- **Name/constraint:** [Agent's assigned constraint]
- **Interface/layout:** [Signature, props, wireframe, or schema]
- **Usage example:** [How it's actually used]
- **What it hides:** [Complexity kept internal]
- **Trade-offs:** [Strengths and weaknesses]

### 4. Compare designs

After presenting all designs, compare them on:

**For interfaces and APIs:**
- Interface simplicity: fewer methods, simpler params = easier to use correctly
- Depth: small interface hiding significant complexity = good; large interface with thin implementation = avoid
- General-purpose vs. specialized: flexibility vs. focus
- Ease of correct use vs. ease of misuse
- Implementation efficiency: does the shape allow efficient internals?

**For UI layouts:**
- Information hierarchy: does the layout guide attention to what matters most?
- Cognitive load: how many decisions does the user face at once?
- Extensibility: does it accommodate future content without breaking?
- Distinctiveness: does it have a clear visual point-of-view?

Write the comparison in prose, not tables. Highlight where designs diverge most — that's where the real tradeoff is.

### 5. Synthesize

Often the best solution combines insights from multiple options. Ask:
- "Which design best fits your primary use case?"
- "Any elements from other designs worth incorporating?"

Produce a recommended synthesis if the user wants one, or let them choose.

## Anti-patterns

- Do not let sub-agents produce similar designs — if they converge, re-spawn with more extreme constraints
- Do not skip the comparison — the value is in the contrast
- Do not implement during this skill — this is about interface/layout shape, not code
- Do not evaluate based on implementation effort — evaluate on interface quality

## Skills to use

- **pn-frontend-design-philosophy** — When designs are UI layouts: apply page mode, typography layers, spatial rhythm criteria
- **pn-ux-patterns** — When comparing interaction patterns: apply usability and accessibility lens
- **pn-backend-architecture** — When comparing module or API interfaces: apply depth, cohesion, and coupling criteria
