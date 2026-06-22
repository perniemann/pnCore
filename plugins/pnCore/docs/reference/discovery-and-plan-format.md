# Discovery spec & plan format reference

Canonical format for discovery specs and implementation plans. Skills and agents should use this when creating or consuming these documents.

## Docs folder structure

**MCP `project_kickoff` (canonical)** — refs bundle:

```
docs/
├── refs/
│   ├── README.md           # pn-create-refs-index (index of refs; entry point)
│   ├── PRD.md              # pn-create-prd
│   ├── DESIGN-DOC.md       # pn-create-design-doc
│   ├── DOMAIN-DOC.md       # pn-create-domain-doc (optional)
│   ├── STACK.md            # pn-create-stack-doc (optional)
│   ├── MCP-ARCHITECTURE.md # pn-create-mcp-architecture (optional)
│   └── UI-DESIGN-SPEC.md   # pn-ui-design-specs (optional)
├── discovery/              # pn-discovery-questionnaire
├── research/               # pn-prior-art-research
└── plans/                  # pn-writing-plans (during full_dev / build; not in project_kickoff)
```

**Also (after planning):** `docs/WORKFLOW.md` from pn-create-workflow-roadmap (with `pn-writing-plans`), not part of `project_kickoff`.

**Legacy flat layout:** Some repos use `docs/PRD.md`, `docs/DESIGN.md`, `docs/REF-INDEX.md` at repo root; prefer **`docs/refs/`** for new projects using `workflow_step("project_kickoff")`.

## Discovery spec

**Save path:** `docs/discovery/YYYY-MM-DD-<slug>.md` (slug from project or feature name).

### Sections

1. **Technical** — Stack (see `config/stacks.json`): frontend (React, Astro, Next.js, vanilla), backend (Node, Python, Go, Rust, Ruby, PHP), 3D (Three.js, Babylon.js, Unreal, Godot, Unity), or combination. Scope (single page / multi-page / full app), platform (web, PWA, mobile), persistence (LocalStorage, API, DB, none), prior-art skip (yes/no). When backend in scope: Runtime and Database/Data layer (None, Supabase, SQL, NoSQL, other). When Supabase: record explicitly; plan must include Supabase setup steps.
2. **Security** — Data sensitivity, auth, compliance, threat surface. Never infer; ask or state assumption.
3. **Design** — 3a Direction (purpose, target users, tone, a11y, differentiation). When frontend/UI in scope: 3b Structure and layout; 3c Sections and pages; 3d Colors and theme; 3e Typography; 3f Components and library; 3g Design ambition. Require at least purpose and tone before frontend work. For award-winning or distinctive design, all subsections (3a–3g) must be answered.
4. **Requirements** — Core functionality, success metrics, constraints, assumptions.
5. **Scope** — Delivery tier: MVP | full (required), out-of-scope, plugin-specific if applicable (name, purpose, target users, component set).

### Gate

Do not proceed to plan or scaffold until the user confirms. Next step after confirmation: pn-prior-art-research, then pn-writing-plans.

---

## Plan document

**Save path:** `docs/plans/YYYY-MM-DD-<feature>.md`.

### Header

- **Title:** `# [Feature Name] Implementation Plan`
- **Discovery ref:** Path to discovery spec (`docs/discovery/YYYY-MM-DD-<slug>.md`).
- **Prior art:** Link to `docs/research/YYYY-MM-DD-<slug>-prior-art.md` when pn-prior-art-research was run; or "Adapting: [repo/package URL]"; or "Build from scratch."
- **Goal:** One sentence describing what this builds.
- **Architecture:** 2–3 sentences; pull from discovery spec (security, design tone, scope).
- **Delivery tier:** MVP | full (from discovery spec).
- **Tech stack:** Key technologies/libraries from discovery.

### Phases (roadmap)

Group tasks into phases. Phases create milestones, enable "run phase N" handoffs, and align with specialist execution order. Adapt to discovery scope; omit phases not in scope.

**Standard phases (include when in scope):**

| Phase | Contents | When to include |
|-------|----------|-----------------|
| **1. Scaffold + Auth** | Clone/init (if adapting), scaffold, Supabase client, env vars, auth (signUp, signIn, protected routes) | Backend or auth in scope |
| **2. Core features** | Landing, UI components, main flows, design tokens, assets (logo, hero, icons) | Frontend/UI in scope |
| **3. Payments** | Stripe products, checkout, webhook, billing page | Stripe or payments in discovery |
| **4. Tests + Polish** | Critical-path tests, pn-docs-sync (README, CHANGELOG), final verification | Delivery tier full, or auth/checkout in scope |

**Scope-adaptive:** If no backend → skip Phase 1 (or use "Scaffold only"). If no payments → skip Phase 3. Single-page or bug-fix plans may use fewer phases; use at least one phase label.

**Format:**
```markdown
## Phase 1: Scaffold + Auth
[Tasks...]

## Phase 2: Core features
[Tasks...]
```

### Tasks

- Bite-sized (2–5 min per task).
- Each task: **Files** (Create / Modify / Test with exact paths), **Steps** (numbered, exact commands and expected output), full code in plan (no "add validation" without the code).
- Verification: exact command and expected result (e.g. `npm test …` → PASS / 0 failures).

### Adapt-from-prior-art

When prior art recommends adapting a project: first task must be "Clone/initialize from [repo/package URL]; strip unrelated code; align with discovery spec." Subsequent tasks assume the adapted base.
