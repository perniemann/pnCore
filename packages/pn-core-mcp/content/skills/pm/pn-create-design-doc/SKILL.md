---
name: pn-create-design-doc
description: Create a DESIGN doc from discovery spec: vision, aesthetic, IA, user flows, responsive strategy, a11y. Use when documenting design direction before implementation or when project kickoff produces docs.
---

# Create a Design Document

## When to use

- Starting a new feature or project that needs architecture decisions documented before implementation.
- After PRD creation (pn-create-prd), to add technical and design-level detail.
- When multiple implementation approaches exist and a structured document helps the team choose.
- During project_kickoff workflow (step 2 — design doc after PRD).

## Purpose

Create a DESIGN document that captures vision, aesthetic direction, information architecture, user flows, responsive strategy, and accessibility. Use the discovery spec from pn-discovery-questionnaire as input. This document guides implementation and aligns stakeholders on design direction.

## Input

- Discovery spec (from pn-discovery-questionnaire) at `docs/discovery/YYYY-MM-DD-<slug>.md`
- Or: user's request with purpose, tone, scope from discovery

## Instructions

1. **Load discovery spec:** Read the discovery spec. If none exists, use discovery content from the conversation or user-provided context.

2. **Apply the DESIGN template** with these sections. Adapt content to the product—do not use placeholder text. Extract from discovery: purpose, tone, target users, core functionality, scope, technical constraints, design ambition, components.

### Template sections

**1. Vision & Positioning**
- One paragraph: what the product is, who it serves, key differentiator
- Tagline if discovery provides one
- Platform (web, PWA, mobile-first, etc.)

**2. Aesthetic Reference & Recommendations**
- Primary aesthetic direction (from discovery: tone, design ambition)
- Rationale: why this direction fits the product
- Alternatives considered (brief)
- When discovery specifies a style (retro, minimal, editorial, etc.): justify how it supports the product

**3. Visual System**
- Resolution/scale (base grid, breakpoints if known)
- Color: palette direction, theme (light/dark/both)
- Typography: font pairing direction, hierarchy
- UI frames: borders, shadows, overlays
- **Components:** [Library from discovery 3f]. When a library is chosen: all UI elements must use library components; create custom only when the library does not provide the needed component.
- Feedback: micro-interactions, animations, success states
- Reference pn-frontend-design-philosophy when UI/frontend in scope

**4. Information Architecture**
- Tree structure of main sections/screens
- Use discovery scope and requirements to derive IA
- Format as nested list or tree

**5. User Flows**
- 3-click rule: primary actions reachable in ≤3 taps
- Onboarding goal (e.g., first action in <3 min)
- Primary flow: main user journey
- Secondary flows: progress, settings, etc.
- Emotional journey mapping when relevant (highs/lows, reduce anxiety, celebrate progress)

**6. Mobile-First Responsive Strategy**
- Breakpoints and layout per breakpoint
- Touch targets (min 44×44px when mobile)
- Nav placement (bottom nav, sidebar, etc.)

**7. Technical Architecture (High Level)**
- Simple diagram or bullet list: frontend, backend, data layer
- PWA, SPA, or native; offline considerations
- Keep high-level; implementation details go in plan

**8. Accessibility**
- Contrast target (WCAG AA minimum)
- Motion: reduced-motion option
- Labels: accessible names on interactive elements
- Keyboard: full navigation for desktop

**9. Design Principles**
- 5–8 principles derived from discovery (purpose, tone, constraints)
- Examples: legible first, one-thumb friendly, progressive disclosure, graceful degradation

3. **Load pn-documentation:** Apply format conventions (heading hierarchy, date, paths).

4. **Save output:** Prefer **`docs/refs/DESIGN-DOC.md`** (matches `workflow_step("project_kickoff")`). Create `docs/refs/` if missing. Legacy layouts may use `docs/DESIGN.md` if the repo already standardizes on flat `docs/` root.

## Output

- DESIGN doc at **`docs/refs/DESIGN-DOC.md`**
- File path reported to user
- Gate: "Design doc complete. Proceed?" Use ask_question or workflow_confirm when available.

## Integration

- **pn-new (Involved mode):** Step 3 runs this skill after PRD
- **pn-frontend-design-philosophy:** Reference for alignment when UI in scope
- **pn-writing-plans:** Plan references DESIGN doc for design tokens and flows
