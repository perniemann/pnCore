---
name: pn-create-prd
description: "Create a Product Requirements Document using an 8-section template (summary, contacts, background, objective, segments, value proposition, solution, release). Use when writing a PRD, documenting product requirements, or preparing a feature spec before pn-writing-plans."
---

# Create a Product Requirements Document

## When to use

- Writing a PRD for a new feature or product before any implementation begins.
- Aligning stakeholders with a structured spec (summary, objective, segments, solution, release).
- Choosing between the 8-section template (single feature / pitch) and the feature-matrix template (full app, multi-phase).
- Preparing a feature spec that pn-writing-plans will consume to generate implementation tasks.

## Purpose

Create a comprehensive Product Requirements Document (PRD) for the user's product or feature. This document serves as the authoritative specification, aligning stakeholders and guiding development. Use the discovery spec from pn-discovery-questionnaire when available.

## Context

A well-structured PRD clearly communicates the what, why, and how of a product initiative. Use the **8-section template** for stakeholder/pitch docs, or the **feature-matrix template** for full-app/multi-phase products (phased delivery, many feature areas).

## Template selection

| Discovery scope | Template |
|-----------------|----------|
| Full app, multi-phase (Alpha/Beta/Launch), feature-heavy | Feature-matrix: Product overview, user personas, feature list by area (Auth, Logging, Scoring, etc.) with IDs, priorities, acceptance criteria, phases, out-of-scope, privacy/GDPR when relevant |
| Single feature, pitch, stakeholder doc | 8-section: Summary, contacts, background, objective, segments, value prop, solution, release |

## Instructions

1. **Gather Information**: If the user provides files, read them carefully. When pn-discovery-questionnaire was run, pull context from the discovery spec. Use web search for additional market context when relevant.

2. **Think Step by Step**: Before writing, analyze:
   - What problem are we solving?
   - Who are we solving it for?
   - How will we measure success?
   - What are our constraints and assumptions?

3. **Apply the PRD Template**:

   **When using 8-section template**, create these sections:

   **1. Summary** (2-3 sentences) — What is this document about?

   **2. Contacts** — Name, role, and comment for key stakeholders

   **3. Background** — Context, why now, what changed or became possible

   **4. Objective** — What's the objective? Why does it matter? Key Results (SMART OKR format)

   **5. Market Segment(s)** — For whom are we building? Constraints? (Markets = people's problems/jobs, not demographics)

   **6. Value Proposition(s)** — Customer jobs/needs, gains, pains avoided, differentiation

   **7. Solution**
   - 7.1 UX/Prototypes (wireframes, user flows)
   - 7.2 Key Features (detailed descriptions)
   - 7.3 Technology (optional)
   - 7.4 Assumptions (unproven beliefs)

   **8. Release** — Relative timeframes, first version vs. future versions (avoid exact dates)

   **When using feature-matrix template** (full app, multi-phase): Create sections: Product Overview; User Personas; Feature List & Requirements (grouped by area: e.g. Auth, Logging, Scoring, Progression, each with ID, Priority, Notes/Acceptance Criteria); Out of Scope; Privacy/GDPR when data is sensitive; Implementation Phasing (Alpha/Beta/Launch); Open Questions. Treat that section list as the baseline; rename or regroup areas to match the product domain.

4. **Use Accessible Language**: Write for a primary school graduate. Avoid jargon. Clear, short sentences.

5. **Save Output**:
   - Prefer **`docs/refs/PRD.md`** (matches `workflow_step("project_kickoff")`). Create `docs/refs/` if missing. Legacy single-file layouts may use `docs/PRD.md` only if the project already uses flat `docs/` root for PRD.

## Notes

- Be specific and data-driven where possible
- Link each section back to overall strategy
- Flag assumptions clearly for validation
- Keep the document concise but complete
- After PRD: use pn-writing-plans to create implementation tasks
