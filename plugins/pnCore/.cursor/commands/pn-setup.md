---
name: pn-setup
description: Configure pnCore for an existing project — onboard the codebase (project-context, project skill, file rules), capture design context (.pncore-design.md), and capture backend stack context (.pncore-stack.md). Run once per project; re-run when context goes stale. Use for existing projects; for new projects from scratch use pn-new.
---

# pn-setup

**Start every response with:** `[pn-command] 🔺`

Configure pnCore to understand this project. Creates context files that all skills and commands use automatically — eliminating repeated discovery questions.

## When to Run

- On an existing project you want pnCore to understand
- When brand/tone, stack, or codebase conventions have changed
- When design or backend commands ask "run pn-setup first"

## Step 0: What to capture

Ask: "What context do you want to set up? (1) Everything — project integration, design context, and stack context. (2) Project integration only — codebase analysis, project-context.mdc, project skill. (3) Design context only — brand, tone, visual ambition. (4) Stack context only — runtime, framework, database, auth."

Wait for reply (1, 2, 3, or 4). Then run only the selected sections below.

---

## Section A: Project Integration (runs for options 1 and 2)

**Progress:** "pn-setup: Project integration — Step N of 4."

### A1. Analyze the codebase

Explore the workspace to understand its structure, stack, and conventions. Inspect actual files; do not infer from external sources.

**Required inspection:**

- **Root config:** `package.json`, `tsconfig.json`, `vite.config.*`, `next.config.*`, `astro.config.*`, `pyproject.toml`, `Cargo.toml`, etc. Infer stack, runtime, and tooling.
- **Folder structure:** `src/`, `app/`, `pages/`, `components/`, `packages/`, `lib/`, etc. Map layout and entry points.
- **Existing conventions:** Lint config (ESLint, Prettier, Ruff), test setup (Jest, Vitest, pytest), CI config. Note style preferences.
- **Domain hints:** README, docs/, key module names, API surface. Infer purpose and key constraints.

Save a brief analysis summary to `docs/discovery/YYYY-MM-DD-integrate-analysis.md` (create `docs/` if missing). Include: stack, scope, key paths, conventions, inferred constraints.

### A2. Create project-context.mdc

Create `.cursor/rules/project-context.mdc` with `alwaysApply: true`. Include:

- **(a) Triangle:** "Begin every response in this project with the appropriate context tag and 🔺 (Unicode U+1F53A — emoji red triangle pointed up). Default: `[pn-default] 🔺`. Use `[pn-command] 🔺` / `[pn-agent] 🔺` / `[pn-skill] 🔺` / `[pn-plan] 🔺` when a pn command, agent, skill, or plan mode is active. Do this before any other output or tool call. See pnCore rule `pn-visual-indicator` for full guidance."
- **(b) Project context:** One-sentence goal, stack, scope, key constraints — synthesized from the codebase analysis. Be specific to this project.
- **(c) MCP bootstrap:** "When pn-core MCP is available, load `get_rule("pn-build-gate")` and `get_rule("pn-mcp-proactive")` and follow them."
- **(d) Phase gate:** "After each plan phase: verify → spawn pn-reviewer Task (`readonly: true`) on phase diff → fix → user `continue`. See pn-build-gate § Phase-complete gate."

Keep under 30 lines. Create `.cursor/rules/` if it does not exist.

**If the project uses Git:** also create `.cursor/rules/pn-no-cursor-commit-trailers.mdc` with `alwaysApply: true`. Use `get_rule("pn-no-cursor-commit-trailers")` from MCP as the source text (or copy from the pnCore plugin `rules/` folder). That keeps `Made-with:` / Cursor `Co-authored-by` lines out of commits so hooks and CI stay green.

### A3. Create project skill

Create `.cursor/skills/project/SKILL.md` with domain guidance inferred from the codebase:

- **Purpose:** What this project does (from README, entry points, domain).
- **Key constraints:** Stack-specific patterns, auth model, data layer, API style.
- **Patterns:** Conventions observed (file layout, naming, testing approach).

Frontmatter: `name: project`, `description: "Project-specific domain guidance for [project name]."` Keep under 30 lines.

### A4 (Optional): File-glob rules

If the analysis revealed strong conventions, offer to create file-glob rules. Use `ask_question` when available:

"Do you want file-specific rules for [e.g. **/*.ts, **/*.tsx] based on the conventions I found? (1) Yes. (2) No."

- **Yes:** Create one or more `.cursor/rules/*.mdc` with appropriate `globs`. Keep each rule under 50 lines.
- **No:** Skip.

---

## Section B: Design Context (runs for options 1 and 3)

**Progress:** "pn-setup: Design context."

### B1. Check for existing context

Read `.pncore-design.md` from the project root if it exists.

- If complete (all required fields present): show existing context, ask "Does this still apply? Reply 'yes' to keep it, or describe what changed."
- If incomplete or missing: proceed to gather context.

### B2. Gather design context

Ask these questions in one message:

1. **Audience:** Who uses this product and in what context?
2. **Job to be done:** What is the primary thing users come to do? Secondary?
3. **Brand personality:** How should the interface feel? Pick 2–3 words and describe the tone.
4. **Visual ambition:** Functional / Polished / Distinctive / Award-worthy
5. **Reference feel:** Optional — any products or aesthetics that capture the right vibe?
6. **Constraints:** Framework, component library, existing brand colors or fonts, dark mode required?
7. **House philosophy (optional):** Principles every UI surface should follow across your work (e.g. typographic discipline, motion restraint). Skip if not applicable.
8. **Primary reference URL (optional):** A canonical site or product that sets the craft bar (portfolio or flagship). Agents use it as the aesthetic anchor when the spec allows. Skip if none.
9. **Append `<frontend_aesthetics>` to CLAUDE.md (optional):** If the project uses a root `CLAUDE.md` (or similar global instructions), offer to append the block from `pn-core://reference/aesthetics-baseline.md` so models load the stance without opening a skill. User may decline.

Gate: do not save until questions 1–4 and 6 are answered.

**Template on disk:** Canonical copy with a filled-out editorial / craft-forward example lives at `docs/templates/pncore-design.example.md` (in plugin: `docs/templates/` after install). Offer this path when the user wants a starter file without answering every question live.

### B3. Save to `.pncore-design.md`

```markdown
# Design Context

> Generated by pn-setup. Update by running the command again.
> Last updated: {date}

## Audience
{user's answer}

## Job to Be Done
{user's answer}

## Brand Personality
{user's answer}

## Visual Ambition
{functional / polished / distinctive / award-worthy}

## Reference Feel
{user's answer or "none specified"}

## House philosophy (optional)
{short bullets: principles the UI must always follow across your projects — e.g. restraint, typographic edge, motion discipline, or link to a canonical site}

## Primary reference URL (optional)
{URL to a portfolio or product that sets the bar — agents treat this as the aesthetic anchor when choosing direction; leave blank if none}

## CLAUDE.md aesthetics block (optional)
{yes/no — if yes, the `<frontend_aesthetics>` block from aesthetics-baseline was appended to project CLAUDE.md or user rules}

## Constraints
- Framework: {value}
- Component library: {value}
- Brand colors/fonts: {value}
- Dark mode: {value}
```

---

## Section C: Stack Context (runs for options 1 and 4)

**Progress:** "pn-setup: Stack context."

### C1. Check for existing context

Read `.pncore-stack.md` from the project root if it exists.

- If complete: show existing context, ask "Does this still apply? Reply 'yes' to keep it, or describe what changed."
- If incomplete or missing: proceed to gather context.

### C2. Gather stack context

Ask these questions in one message:

1. **Runtime and language:** Primary backend language and runtime? (Node.js + TypeScript / Python / Go / Rust / Ruby / PHP)
2. **Framework:** API framework? (Express / Fastify / Hono / FastAPI / Django / Gin / Axum / Rails / Laravel / other)
3. **Database:** Database and ORM/query builder?
4. **Auth mechanism:** How are users authenticated?
5. **Caching:** Any caching layer? Any CDN?
6. **Hosting:** Where does this run?
7. **API style:** REST, GraphQL, tRPC, or gRPC?
8. **Key third-party integrations:** Critical services?
9. **Observability:** Monitoring/tracing in use?
10. **Known constraints:** GDPR, SOC 2, version pins, SLAs?

Gate: do not save until questions 1–7 are answered.

### C3. Save to `.pncore-stack.md`

```markdown
# Stack Context

> Generated by pn-setup. Update by running the command again.
> Last updated: {date}

## Runtime and Language
{user's answer}

## Framework
{user's answer}

## Database and ORM
{user's answer}

## Authentication
{user's answer}

## Caching
{user's answer}

## Hosting
{user's answer}

## API Style
{user's answer}

## Key Integrations
{user's answer or "none specified"}

## Observability
{user's answer or "none"}

## Constraints
{user's answer or "none specified"}
```

---

## Summary

After completing selected sections, output:

- What was created/updated: project-context.mdc, project skill, .pncore-design.md, .pncore-stack.md (whichever ran).
- Brief recap of inferred stack and constraints (when Section A ran).
- Next steps: "You can now use `pn-build` for new features or `workflow_step('full_dev'|'design', ...)` for incremental builds. `pn-build-gate` will recognize this as an existing project. Design skills read `.pncore-design.md` automatically. Backend skills read `.pncore-stack.md` automatically."

## Guardrails

- Do not infer design context from the codebase — code tells you what was built, not how it should feel. Ask explicitly.
- Do not infer the stack from the codebase alone — ask explicitly. Codebases have legacy layers.
- Ask all questions for each section in one message — do not interview one question at a time.
- Only create file-glob rules when the codebase clearly shows repeatable patterns.
