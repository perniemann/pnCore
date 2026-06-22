---
name: pn-job-stories
description: Create job stories using "When [situation], I want to [motivation], so I can [outcome]" (JTBD format). Use when expressing user situations and motivations, creating JTBD-style backlog items, or focusing on context over roles.
---

# Job Stories

## When to use

- Expressing user needs in JTBD "When [situation], I want to [motivation], so I can [outcome]" format.
- Creating a situation-and-motivation-focused backlog instead of persona-centric user stories.
- Preparing job-story acceptance criteria before pn-writing-plans creates implementation tasks.

## Workflow

1. **Identify user situations** that trigger the need
2. **Define motivations** underlying the user's behavior
3. **Clarify outcomes** the user wants to achieve
4. **Apply JTBD framework:** Focus on the job, not the role
5. **Create acceptance criteria** that validate the outcome is achieved
6. **Use observable, measurable language**
7. **Link to design mockups** or prototypes when available
8. **Output job stories** with detailed acceptance criteria

## Story Template

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

## Output Deliverables

- Complete set of job stories for the feature
- Each story follows the "When...I want...so I can" format
- 6-8 acceptance criteria focused on outcomes
- Stories emphasize user situations and motivations
- Save to `docs/backlog/` or include in PRD appendix

## Handoff

After job stories are defined, use pn-writing-plans to create implementation tasks.
