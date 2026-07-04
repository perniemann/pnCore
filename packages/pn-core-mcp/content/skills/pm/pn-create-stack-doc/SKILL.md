---
name: pn-create-stack-doc
description: "Create a STACK.md documenting chosen tech stack, layers, key dependencies, and rationale. Use when project has multi-stack (frontend + backend + infra) or needs formal stack documentation."
---

# Create Stack Document

## Purpose

Create `docs/STACK.md` that documents the project's tech stack, layers, key dependencies, and rationale. Enables onboarding and consistency across builds.

## When to use

- During project kickoff when discovery indicates multi-stack (frontend + backend, or frontend + backend + infra)
- When stack choices need formal documentation for team or future reference
- When project uses config/stacks.json or custom stack combinations

## Input

- Discovery spec (Technical section: stack, scope, platform, persistence, Database/Data layer, API style, auth)
- config/stacks.json when available (rules, scaffolds, agents per stack)
- priorArtPath when prior-art recommended adapting a stack

## Instructions

1. **Load discovery spec:** Extract stack choices from Technical section. Include: frontend (React, Next, Astro, vanilla), backend (Node, Supabase), database (Supabase, SQL, NoSQL), API style (REST, tRPC, GraphQL), auth model.

2. **Apply template:**

```markdown
# [Project] Stack

## Overview
One paragraph: stack summary and rationale (from discovery and prior-art).

## Layers

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | [framework] | [scope] |
| Backend | [runtime/API] | [scope] |
| Data | [DB/BaaS] | [scope] |
| Auth | [model] | [scope] |
| Infra | [if any] | [scope] |

## Key dependencies
- [package]: [version or "latest"], [why]
- ...

## Rationale
Brief justification for choices (from discovery, prior-art, constraints).
```

3. **Load pn-documentation:** Apply format conventions.

4. **Save to:** `docs/STACK.md`. Create `docs/` if missing.

## Output

- STACK doc at `docs/STACK.md`
- Gate: "Stack doc complete. Proceed?" when in workflow.

## Integration

- **pn-new (Involved mode):** Optional step when multi-stack; runs before refs index.
- **pn-writing-plans:** Plan references stack from discovery; STACK.md formalizes it.
