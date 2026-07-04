---
name: pn-user-stories
description: "Create user stories following the 3 C's (Card, Conversation, Confirmation) and INVEST criteria. Use when breaking down features into backlog items, defining acceptance criteria, or preparing stories before pn-writing-plans."
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
