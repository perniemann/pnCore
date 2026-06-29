---
name: pn-create-workflow-roadmap
description: Generate a project workflow roadmap (docs/WORKFLOW.md) mapping plan phases to pn-core commands with model tier recommendations and per-step token cost estimates. Runs after pn-writing-plans.
---

# Create Workflow Roadmap

## Purpose

Generate `docs/WORKFLOW.md` — a project execution guide that maps every phase from the implementation plan to specific pn-core commands, recommends model tiers per step, and estimates token costs. Enables cost-aware project planning and session management.

## When to use

- After pn-writing-plans completes and the plan document exists
- During pn-new (Involved mode), after plan and before skeptic review
- When user requests a workflow roadmap, execution guide, or cost estimate for a planned build

**Announce at start:** "I'm using pn-create-workflow-roadmap to generate the project workflow."

**Before drafting:** Load `get_skill("pn-documentation")` and apply the WORKFLOW roadmap format.

## Input

- **Plan document:** `docs/plans/YYYY-MM-DD-<feature>.md` (required)
- **Discovery spec:** `docs/discovery/YYYY-MM-DD-<slug>.md` (required)
- **Prior-art research:** `docs/research/YYYY-MM-DD-<slug>-prior-art.md` (when it exists)
- **Ref docs:** Prefer `docs/refs/PRD.md`, `docs/refs/DESIGN-DOC.md`, etc.; legacy flat `docs/PRD.md` when that is what exists

## Instructions

### 1. Read inputs

Read the plan document, discovery spec, and any ref docs. Extract:
- Project name
- Delivery tier (MVP or full)
- Phase list with tasks per phase
- Stack and scope from discovery
- Security and design requirements that affect model tier selection

### 2. Map phases to commands

For each phase in the plan, determine which pn-core commands/skills run at each step. Use the plan's task descriptions, file types, and scope to select:

| Task type | Command/Skill |
|-----------|---------------|
| Scaffold, project init | pn-scaffolder |
| Frontend components, pages, routes | pn-frontend-developer |
| Backend API, DB, auth | pn-backend-developer |
| Tests | pn-testing-specialist |
| Asset creation (logo, icons, illustrations) | pn-assets-manager |
| Generative media (ComfyUI, T2V, cinematic pipelines) | pn-generative-media-director |
| Design system, visual polish | pn-design |
| Game mechanics, progression | pn-game |
| Security audit, GDPR, RLS | pn-security-auditor |
| Accessibility audit, Lighthouse | pn-frontend-audit |
| Code review, quality gates | pn-reviewer |
| Acceptance verification + delivery | pn-deliver |
| Doc updates | pn-document |

### 3. Assign model tiers

Use these rules to assign model tiers per step:

| Model Tier | Assign when |
|------------|-------------|
| **Highest** | Security audits, WCAG/a11y audits, GDPR analysis, full codebase review, complex multi-file reasoning (10+ files) |
| **High** | Architecture decisions, creative design (animation, assets), DB migration design, domain-specific logic (game mechanics, scoring) |
| **Medium** | Feature development, component building, test writing, planning, discovery, scaffolding, review |
| **Low** | Verification checklists, doc formatting, simple edits, acceptance gates |

### 4. Estimate token costs

Use the token cost reference table from pn-documentation (WORKFLOW roadmap section). For each step:

1. Look up the command/skill in the reference table
2. Use the baseline input/output token estimates
3. For multi-task steps (e.g. pn-frontend-developer building 5 components), multiply by the number of distinct sub-tasks
4. Sum per-phase and per-project totals

### 5. Build the LLM Model Guide

Present a table mapping model tiers to task types. Leave model name slots for the user to fill in, or use model names if the user has stated their available models.

### 6. Create the workflow overview diagram

Build a Mermaid or ASCII diagram showing:
- Phase sequence (left to right or top to bottom)
- Version targets per phase
- Commands used per phase

### 7. Estimate sessions

Each phase maps to one or more Cursor sessions. Estimate based on:
- Number of steps in the phase
- Complexity of steps (security audit = full session; scaffolding = partial session)
- Context window pressure (large codebases or many files = more sessions)

Rules of thumb:
- 1–3 simple steps = 1 session
- 4–6 medium steps = 1–2 sessions
- 7+ steps or security/a11y audits = 2–3 sessions

### 8. Write the document

Follow the WORKFLOW roadmap format from pn-documentation. Save to `docs/WORKFLOW.md`.

**Required sections (in addition to format defaults):**

#### Per-phase gate checklist

For each plan phase, include:

| Phase | Verify | Checker (automatic) | Visual pre-gate | Skeptic intensity | Slice verify |
|-------|--------|-------------------|-----------------|-------------------|--------------|
| N | `npm test` / `build` commands | Spawn pn-reviewer Task (`readonly: true`) on phase diff | `pn-evidence-qa` before UI code when phase includes frontend | strict / standard / light per `DECISION_LOGIC.md` | `docs/audits/<program>-sN-verify-*.md` per `slice-verify-template.md` |

#### Post-build program boundary

```markdown
## Post-build (program end)

1. `/pn-review` or pn-reviewer Task on full diff
2. `/pn-skeptic` post-build on output
3. `pn-docs-sync`
4. `/pn-deliver`
```

#### Operating model

Include the build-phase loop summary from `pn-core://reference/best-practices.md` §10.1.

## Output

- `docs/WORKFLOW.md` saved
- File path reported
- Gate: "Workflow roadmap complete. Proceed to skeptic review?" Use ask_question or workflow_confirm when available.

## Integration

- **pn-writing-plans:** After plan is saved, pn-create-workflow-roadmap runs as the next step
- **pn-new (Involved mode):** Runs after plan, before skeptic challenge
- **FLOW.md:** Positioned between Plan and Skeptic in the standard flow
- **pn-documentation:** Format authority for the WORKFLOW doc type
