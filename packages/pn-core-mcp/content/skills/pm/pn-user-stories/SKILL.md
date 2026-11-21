---
name: pn-user-stories
description: "User stories (3 C's, INVEST), job stories, and sprint prioritization. Use when breaking features into backlog items, defining acceptance criteria, or ordering a sprint before pn-writing-plans."
---

# User Stories

## When to use

- Breaking a feature or PRD section into backlog items with clear acceptance criteria.
- Preparing sprint-ready stories before pn-writing-plans creates implementation tasks.
- Decomposing a feature into independent, testable units following the INVEST criteria.
- User needs a structured "As a [role], I want [action], so that [benefit]" backlog.

## Workflow

1. **Analyze the feature** based on provided design, PRD, or discovery spec
2. **Identify user roles** and distinct user journeys
3. **Apply 3 C's framework:**
   - Card: Simple title and one-liner
   - Conversation: Detailed discussion of intent
   - Confirmation: Clear acceptance criteria
4. **Respect INVEST criteria:** Independent, Negotiable, Valuable, Estimable, Small, Testable
5. **Use plain language** a primary school graduate can understand
6. **Link to design files** when available (Figma, Miro)
7. **Output user stories** in structured format

## Story Template

**Title:** [Feature name]

**Description:** As a [user role], I want to [action], so that [benefit].

**Design:** [Link to design files when available]

**Acceptance Criteria:**
1. [Clear, testable criterion]
2. [Observable behavior]
3. [System validates correctly]
4. [Edge case handling]
5. [Performance or accessibility consideration]
6. [Integration point]

## Output Deliverables

- Complete set of user stories for the feature
- Each story includes title, description, design link (if provided), and 4-6 acceptance criteria
- Stories are independent and can be developed in any order
- Stories are sized for one sprint cycle
- Save to `docs/backlog/` or include in PRD appendix

## Handoff

After stories are defined, use pn-writing-plans to create implementation tasks and verification steps.

<!-- merged from pn-job-stories (0.22.0) -->
## Job Stories

### When to use

- Expressing user needs in JTBD "When [situation], I want to [motivation], so I can [outcome]" format.
- Creating a situation-and-motivation-focused backlog instead of persona-centric user stories.
- Preparing job-story acceptance criteria before pn-writing-plans creates implementation tasks.

### Workflow

1. **Identify user situations** that trigger the need
2. **Define motivations** underlying the user's behavior
3. **Clarify outcomes** the user wants to achieve
4. **Apply JTBD framework:** Focus on the job, not the role
5. **Create acceptance criteria** that validate the outcome is achieved
6. **Use observable, measurable language**
7. **Link to design mockups** or prototypes when available
8. **Output job stories** with detailed acceptance criteria

### Story Template

**Title:** [Job outcome or result]

**Description:** When [situation], I want to [motivation], so I can [outcome].

**Design:** [Link to design files when available]

**Acceptance Criteria:**
1. [Situation is properly recognized]
2. [System enables the desired motivation]
3. [Progress or feedback is visible]
4. [Outcome is achieved efficiently]
5. [Edge cases are handled gracefully]
6. [Integration and notifications work]

### Output Deliverables

- Complete set of job stories for the feature
- Each story follows the "When...I want...so I can" format
- 6-8 acceptance criteria focused on outcomes
- Stories emphasize user situations and motivations
- Save to `docs/backlog/` or include in PRD appendix

### Handoff

After job stories are defined, use pn-writing-plans to create implementation tasks.

<!-- merged from pn-sprint-prioritization (0.22.0) -->
## Sprint prioritization

### When to use

- Backlog or sprint prioritization.
- RICE, MoSCoW, Value vs Effort frameworks.
- Capacity and velocity consideration.
- Stakeholder alignment on priorities.

### Workflow

1. **Refinement:** Size stories; define acceptance criteria.
2. **Prioritization:** Apply framework; score and rank.
3. **Capacity:** Factor availability; buffer for uncertainty.
4. **Commitment:** Select work; document trade-offs.

### Output

- Ranked backlog or sprint slice with framework scores, capacity notes, and documented trade-offs.

### Guardrails

- Keep scoring criteria visible; flag stakeholder conflicts instead of hiding them in the rank order.

### Integration

- **pn-discovery-questionnaire** — When scope is unclear.
- **pn-writing-plans** — Use for task breakdown after prioritization.
