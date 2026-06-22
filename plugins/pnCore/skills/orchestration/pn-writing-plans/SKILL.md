---
name: pn-writing-plans
description: Creates bite-sized implementation plans with exact file paths and verification steps. Use when a spec or requirements exist for a multi-step task, before touching code.
---

# Writing plans

## When to use

- A spec or requirements exist for a multi-step task and you need an implementation plan before touching code.
- Refactoring, bug fix, or feature work where exact file paths, code, and verification steps are required.
- Onboarding a contributor to a codebase change — plans assume zero context.
- After a discovery spec (pn-discovery-questionnaire) or PRD is ready and tasks need concrete coding steps.

## Overview

Write comprehensive implementation plans using the discovery spec as input when available (from pn-discovery-questionnaire). Assume the engineer has zero context for the codebase. Document everything: which files to touch for each task, code, testing, how to verify. Give bite-sized tasks. DRY. YAGNI. TDD. Frequent commits. Pull security assumptions, design tone, and scope from the discovery spec into the plan header.

Assume a skilled developer who knows almost nothing about the toolset or problem domain.

**Announce at start:** "I'm using the pn-writing-plans skill to create the implementation plan."

**Before drafting:** Load `get_skill("pn-documentation")` and apply the plan format. When `docs/prd/` or `docs/backlog/` exist, read them and use as additional input for tasks and acceptance criteria.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature>.md`. Full reference: `docs/reference/discovery-and-plan-format.md`.

**GitHub Issues from a plan:** When the next step is to **split an approved plan into tracked Issues** (tracer-bullet vertical slices, dependencies first), use **pn-github-vertical-slices** with the official **GitHub MCP server** ([github/github-mcp-server](https://github.com/github/github-mcp-server)). When using **`workflow_step`** on **`full_dev`**, pass **`createGithubIssues: true`** into step 3 state (after step 2) to enter the gated **`workflowPhase: "github_issues"`** phase before specialist routing.

## Pre-plan: Understand existing code (when modifying)

When the plan modifies **existing** code (refactor, bug fix, legacy change, feature in existing file):

1. **Before drafting the plan:** Use research tools to understand current structure, entry points, and call flow.
2. **If Octocode available:** Use `localSearchCode` → `lspGotoDefinition` / `lspCallHierarchy` / `lspFindReferences` to map relevant symbols.
3. **If Octocode absent:** Use `SemanticSearch` and `Grep` to locate definitions and usages.
4. **Output:** A short "Context" paragraph in the plan header listing key files, entry points, and call relationships.

When building from scratch or scaffolding new files only, skip this step.

## Refactor mode (activate when task is a refactor)

When the task is identified as a **refactor** (restructuring existing code without changing observable behavior), activate refactor mode before drafting the plan:

1. **Verify assertions:** Explore the codebase to confirm the user's description is accurate. Check what the code actually does vs. what the user says it does. Note any discrepancies.

2. **Challenge alternatives:** Ask "Have you considered alternatives?" Present 1–2 different approaches (e.g., different scope, different strategy) with one-sentence tradeoffs each. Do not proceed until user confirms the chosen direction.

3. **Check test coverage:** Look at test files covering the affected area. Note: insufficient coverage? Ask: "Test coverage here is [sparse/adequate]. What's the plan for verifying the refactor doesn't break behavior?"

4. **Tiny commits (Martin Fowler):** Break the plan into the smallest possible commits where every step leaves the codebase in a working state. Each commit should be independently deployable. Phrase each as: "Step N: [action] — [why it leaves the codebase working]."

5. **Decision document:** Append a `## Decision Document` section to the plan:
   ```markdown
   ## Decision Document

   ### Modules changed
   [List modules/components being restructured, not file paths]

   ### Interface changes
   [Public APIs, function signatures, or contracts being modified]

   ### Architectural decisions
   [Why this approach vs. alternatives]

   ### Out of scope
   [Explicit list of things NOT being changed in this refactor]

   ### Testing decisions
   [What makes a good test for this change; which behaviors to verify; prior art for similar tests]
   ```

## Bite-sized task granularity

Each step is one action (2–5 minutes): write failing test → verify it fails → implement minimal code → run tests → commit.

## Plan document header

Every plan must start with:

```markdown
# [Feature Name] Implementation Plan

**Discovery ref:** `docs/discovery/YYYY-MM-DD-<slug>.md`
**Prior art:** [Link or "Build from scratch"]
**Context:** [Key files and call relationships — omit when building from scratch]
**Goal:** [One sentence]
**Architecture:** [2–3 sentences; pull security assumptions, design tone, scope from discovery]
**Delivery tier:** [MVP | full]
**Tech stack:** [Key technologies]

---
```

**Delivery tier rules:** Default to MVP when unspecified. When `full`: include complete asset set, tests for critical paths, and pn-docs-sync.

## Phases (roadmap)

Group all tasks into phases using `## Phase N: [Name]` headings.

| Phase | Contents | Include when |
|-------|----------|--------------|
| **Phase 1: Scaffold + Auth** | Init, scaffold, Supabase client, env vars, auth | Backend or auth in discovery |
| **Phase 2: Core features** | UI components, main flows, design tokens, assets | Frontend/UI in scope |
| **Phase 3: Payments** | Stripe products, checkout, webhook, billing page | Payments in discovery |
| **Phase 4: Tests + Polish** | Critical-path tests, pn-docs-sync, verification | Delivery tier full, or auth/checkout in scope |

Omit phases not in scope. Single-feature or bug-fix plans (< 5 tasks) may use one phase.

## Standard tasks when discovery includes frontend/UI

### Design tokens and base styles

**prefers-reduced-motion (required):** Add a step to implement the reduced-motion block in the base/global styles file — see pn-frontend-design-philosophy for the exact CSS. Phrase as: *"Step N: Add prefers-reduced-motion block to `src/styles/global.css`."*

**Typography (when ambition = distinctive or award-winning):** Require a **named** display + body pair from `pn-typography` / `reference/typography.md` aligned to discovery (Syne + DM Sans is one valid option — not mandatory for every project). Include font loading, CSS variables `--font-display`/`--font-sans`. Do not use Geist, Inter, Roboto, or Space Grotesk unless the spec explicitly chooses them.

**Touch targets (when UI in scope):** Nav links and interactive elements must have min 24×24px touch targets (WCAG 2.5.8); prefer 44×48px for primary CTAs.

### Layout and motion (when ambition = award-winning/distinctive)

Add explicit tasks for:
- **Asset creation** (blocking, before landing section tasks): logo, hero, feature icons, subject icons, empty-state illustrations via pn-assets-manager.
- **Layout distinctiveness:** Asymmetric hero (text 40%/visual 60%), staggered feature cards. Avoid centered symmetric hero and uniform grids.
- **Motion:** At least one tagged motion (Reveal/Orient/Confirm/Delight) with `prefers-reduced-motion` fallback.

### Test tasks (when Delivery tier: full or critical paths in scope)

Include at least one test per critical path: auth (signup/login), checkout (session creation/webhook), and the main conversion flow. Verification: test suite exits 0.

### Core Web Vitals (when UI in scope)

Add a performance task: LCP ≤2.5s, CLS ≤0.1; reserve space for hero and async content; preload critical assets; font-display swap.

### Asset creation (blocking)

When discovery includes frontend/UI: include a **blocking** asset task via pn-assets-manager before landing section tasks.

**Task N: Create assets via pn-assets-manager (blocking)**

- **Files:** `public/logo.svg`, `public/hero-placeholder.svg`, `public/icons/*.svg`, `public/illustrations/empty-*.svg`, `.validate-assets.json`.
- **Steps:** 1) Pass discovery 3g (Design ambition) to pn-assets-manager. 2) Invoke `get_command("pn-assets")`. 3–6) Request logo, hero, icons (feature/subject/age-mode/badge), empty-state illustrations. 7) Create `.validate-assets.json` with `{ "required": [...] }`.
- **Verification:** `node scripts/validate-assets.mjs .` must exit 0. Add `"validate:assets"` script to package.json.
- **Blocking:** Do not start next landing task until verification passes.

## Standard tasks when discovery includes Supabase

When Supabase is in scope: include concrete setup tasks (install `@supabase/supabase-js`, env vars, client module, auth with signUp/signInWithPassword, tables/RLS). Route to pn-backend-developer. Do not use placeholders. See pn-backend-developer for full patterns.

## Standard tasks when discovery includes Stripe

When Stripe/payments in scope: include implementation tasks (products, `POST /api/checkout` session, `POST /api/webhooks/stripe`, billing page). Route to pn-backend-developer or pn-payment-integration. No placeholder implementation. See pn-payment-integration for full patterns.

## Task structure

Each task includes:

- **Files:** Exact paths (create, modify, test)
- **Steps:** Numbered, with exact commands and expected output
- **Code:** Complete code in plan (not "add validation")
- **Verification:** Exact commands with expected result

Example:

```markdown
### Task N: [Name]

**Files:**
- Create: `path/to/file.ts`
- Modify: `path/to/existing.ts:123-145`
- Test: `tests/path/to/test.ts`

**Step 1: Write the failing test** — [code block]
**Step 2: Run test to verify it fails** — `npm test tests/path/test.ts` → FAIL
**Step 3: Write minimal implementation** — [code block]
**Step 4: Run test to verify it passes** — `npm test tests/path/test.ts` → PASS
**Step 5: Commit** — `git add ... && git commit -m "feat: ..."`
```

## Remember

- Group tasks into phases; omit phases not in scope
- Exact file paths always; complete code in plan; exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- Reference pn-verification-before-completion before claiming any step done

## Parallel phases

When multiple specialists run in parallel: follow `reference/parallel-rules.md` for file ownership rules, parallel boundary notes, and the required post-parallel merge step.

## Execution handoff

After saving the plan:

1. **Generate workflow roadmap:** Run `get_skill("pn-create-workflow-roadmap")` to produce `docs/WORKFLOW.md` with model tier assignments and per-step token cost estimates.

2. **Offer execution choice:**

**"Plan and workflow roadmap saved to `docs/plans/` and `docs/WORKFLOW.md`. To implement:**

**1. Full dev loop (this session)** — Use the pn-build command. pn-project-builder routes to specialists task-by-task, then pn-reviewer for final pass.

**2. Manual** — Follow the plan step-by-step; run pn-verification-before-completion before each completion claim.

**Which approach?"**
