---
name: pn-discovery-questionnaire
description: "Comprehensive pre-build discovery covering technical, security, design, and requirements. Runs before any scaffold or pn-build / full_dev workflow. Aligns with secure-by-design and requirements elicitation practices. Ask explicitly; never infer for security. Gate: do not proceed until user confirms spec."
---

# Discovery questionnaire

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## Session resume (check first)

Before presenting any questionnaire section, call `workflow_state_load("discovery_questionnaire", slug)` — slug from project name or `"current"` as fallback.

- **Saved state found** (`completedSections` non-empty, `specComplete !== true`): Offer resume ("Found in-progress discovery for [slug], last section: [X]. Resume or start over?"). On Resume: restore answers and continue from next section. On Start over: reset `workflow_state` for this slug and begin §1.
- **No saved state or `specComplete === true`:** Proceed normally from §1.

## When to use

- Before any build, scaffold, or multi-step feature implementation.
- When the user requests a new app, page, plugin, or substantial feature.
- Mandatory for pn-project-builder and pn-build unless user says "skip discovery" or provides a complete spec.
- When invoked by pn-new with Involved intent: always run; never skip based on refs.

## Discovery mode: full vs compact

| Mode | When to use | Sections |
|------|-------------|----------|
| **full** | MCP-only client, no refs, or user says "full discovery"; Involved intent | All 6 sections: Technical, 1b Backend (when scope includes backend), Security, Design 3a–3g, Requirements, Scope. Always ask Security and Backend explicitly; never infer. |
| **compact** | Docs exist (PRD, DESIGN, .ref/, etc.) and user wants faster flow | Same section boundaries as full, but **pre-fill draft answers from refs** (see Ref pre-read) so each turn is shorter. **Still complete sections 1, 1b (when applicable), 2, 3a–3g (when UI in scope), 4, and 5** with the same gates; do not skip Security or Backend. |

**MCP-only:** Prefer **full** when Security or Backend are in scope; compact may omit critical elicitation. When in doubt, use full.

## Questionnaire (ask explicitly; infer only when user has already answered in the prompt)

### 1. Technical

- **Stack:** See `config/stacks.json` for supported stacks. Options: plugin, React, Astro, Next.js, vanilla HTML/CSS/JS, Node API, Python API, Go API, Rust API, Ruby API, PHP API, Babylon.js (3D), or combination. If plugin: single-plugin or multi-plugin (marketplace) repo?
- **Scope:** Single page, multi-page, or full app?
- **Platform:** Web, PWA, mobile (responsive vs native)?
- **Persistence:** LocalStorage, API, DB, or none?
- **Prior art:** Will run pn-prior-art-research before implementation. Skip? (yes/no)

### 1b. Backend tech (when scope includes backend)

When the stack or scope includes backend (e.g. Node API, DB, server, API): ask explicitly before planning. Do not infer. Gate on user confirmation.

- **Runtime:** Node (Express, Fastify, etc.), Python (FastAPI, Flask), Go (Gin, Fiber), Rust (Actix, Axum), Ruby (Rails, Sinatra), PHP (Laravel, Slim), or other?
- **Database / Data layer:** None, **Supabase** (BaaS: auth + Postgres via `@supabase/supabase-js` client), SQL (e.g. Postgres, custom Node API), NoSQL (e.g. MongoDB), or other?
- **API style:** REST, tRPC, GraphQL, Supabase client (when Database = Supabase), or other?
- **Auth model:** None, Supabase Auth (when Database = Supabase), session, JWT, OAuth, API keys, or other?

**When Supabase is selected:** Record explicitly in the spec. The implementation plan MUST include concrete Supabase setup steps: install `@supabase/supabase-js`, add env vars, create client module, implement auth (signUp, signInWithPassword—no placeholder), and configure tables per requirements.

**Payments (when requirements include subscriptions or checkout):** Ask "Payment provider: Stripe, Paddle, or other?" Record in spec. When Stripe: plan MUST include checkout session, webhook, billing page implementation—not placeholder.

If scope has no backend, skip this subsection.

### 2. Security (OWASP Secure by Design)

- **Data sensitivity:** None, PII, health, payments, or other?
- **Auth:** None, session, OAuth, API keys?
- **Compliance:** None, GDPR, HIPAA, or other?
- **Threat surface:** Public, internal, or authenticated-only?

For security items: **never infer**. Ask or state "assume [X] until confirmed."

### 3. Design (custom design focus)

#### 3a. Direction

- **Purpose:** What problem does this solve?
- **Target users:** Who uses it?
- **Tone:** Minimal, playful, utilitarian, luxury, brutalist, industrial, editorial, retro-futuristic, etc. (one clear direction).
- **A11y:** Baseline or strict?
- **EU users / EAA 2026:** Does this serve EU users? If yes, apply EAA 2026 (EN 301 549): WCAG 2.1 AA minimum, alt text, 4.5:1 contrast, keyboard nav, form labels, heading hierarchy, focus visible, document language. See `pn-core://reference/best-practices.md`.
- **Differentiation:** One memorable thing?

#### 3b. Structure and layout (when frontend/UI in scope)

- **Page types:** Landing, dashboard, app, editorial, catalog, tool, or combination?
- **Section flow:** Hero → features → CTA? Problem/solution → social proof → pricing? Custom flow?
- **Layout style:** Structured grid, asymmetric, fluid, or hybrid?
- **Layout distinctiveness:** Standard grid, or editorial/asymmetric for standout composition?

#### 3c. Sections and pages (when frontend/UI in scope)

- **Pages/screens:** Which pages or screens? List main routes/sections.
- **Sections per page:** Hero, features, pricing, testimonials, FAQ, etc.? Which sections per page type?

#### 3d. Colors and theme (when frontend/UI in scope)

- **Palette direction:** Monochrome, duotone, accent-dominant, or brand-specific?
- **Theme:** Light, dark, or both?
- **Reference colors:** Brand colors, inspiration palette, or "choose distinctive"?

#### 3e. Typography (when frontend/UI in scope)

- **Font pairing:** Display + body? (e.g. distinctive display + refined body, or "choose distinctive") — **required** when 3g ambition is award-winning or distinctive.
- **Font choice:** Use distinctive display + body, or accept template default (Geist/Inter)? For award-winning ambition: must choose distinctive; do not use generic fonts.
- **Generic fonts to avoid** (when ambition is award-winning/distinctive): Inter, Roboto, Arial, Geist, Space Grotesk. Record in spec; implementation must not use these.
- **Hierarchy:** Classic, bold, minimal, or editorial?

#### 3f. Components and library (when frontend/UI in scope)

- **Library:** shadcn, Radix, Chakra, MUI, custom, or none? See pn-ui-component-libraries for options.
- **Component philosophy:** Use library defaults, heavy customization, or custom-built?
- **Enforcement:** When Library is shadcn, Radix, Chakra, MUI, etc. (not custom or none): record in spec that all UI elements must use library components; create custom only when the library does not provide the needed component.

#### 3g. Design ambition (when frontend/UI in scope)

- **Ambition:** Functional, polished, or award-winning/distinctive?

When ambition is **award-winning** or **distinctive**, also ask:
- **Hero visual type:** Illustration, product shot, video, abstract, or diagrammatic?
- **Layout preference:** Editorial asymmetric, bold grid, fluid, or other?
- **Asset differentiation:** Custom illustration style, product-in-context, or curated from open-source (unDraw/Storyset)?

Require at least purpose and tone before frontend work.

### 4. Requirements

- **Core functionality:** Bullet list of must-have features.
- **Success metrics:** How is success measured?
- **Constraints:** Timeline, tech limits?
- **Assumptions:** What are we assuming?

### 5. Scope

- **Delivery tier:** MVP | full (required)
  - **MVP:** Core functionality only; minimal polish; ship-fast iteration. Defer nonessential features and advanced states. Logo, hero, and full asset set are still required when UI is in scope.
  - **Full:** All planned features; production polish; complete asset set; tests and verification for critical paths. Ready for handoff or public use.
  - Ask explicitly. Do not infer. If user says "just get it working" or "ship fast," record MVP. If user says "production ready," "complete," or "full featured," record full.
- **Out-of-scope:** Explicit no-go items.
- **Plugin-specific (if applicable):** Plugin name (lowercase kebab-case), purpose, target users, component set (rules, skills, agents, commands, hooks, mcpServers).

## How to ask

Use Cursor's built-in `ask_question` tool when available. If unavailable: call `workflow_confirm` for gates, or output questions in chat — then **stop and wait** for the user's reply before proceeding. See `reference/conventions.md` for the shared gate pattern. Do not infer, apply defaults, or write the spec until user responses are received.

**Batching rule (priority):** When **`ask_question` is available**, use **one tool call per section** (section ids: `1`, `1b`, `2`, `3a`, `3b-3g`, `4`, `5`) — never combine two section ids in a single `ask_question`. When **`ask_question` is unavailable** (chat-only / MCP `workflow_confirm`), compact mode may merge **§1 and §3a only** into one message (2–4 short confirms) to save turns; all other sections stay separate exchanges. Sections **3b–3g** may be grouped in one chat message when UI is in scope and all apply.

## Workflow

1. **Choose mode:** If refs exist and user did not request full discovery, use compact; otherwise full. In compact, still ask Security (2) and Backend (1b) when scope includes backend or sensitive data.

   **Ref pre-read (compact mode only):** Before presenting any section, read available docs and extract answers into a draft map:

   | Ref type | Extracts to |
   |----------|-------------|
   | PRD / requirements | §1 (stack, scope, platform), §1b (runtime, DB, API, auth), §4 (requirements, constraints) |
   | DESIGN / design brief | §3a (purpose, users, tone, a11y), §3b–3g (layout, colors, typography, library, ambition) |
   | Figma export / screenshot | §3d (palette), §3e (typography), §3f (library) |
   | Pitch deck | §3a (purpose, users), §4 (requirements, metrics) |
   | Existing codebase / `package.json` | §1 (stack, platform), §1b (runtime, DB, API) |

   Present extracted values as **draft answers** alongside each question (e.g. "Stack — I see Next.js + Supabase from the PRD. Confirm or correct?"). Do not silently skip questions. Security (§2) and backend (§1b) **must always be asked explicitly** — state extracted value and ask to confirm.

2. Present each section using `ask_question` (or chat output if unavailable). For each item, ask if not in user prompt. Do not infer for critical items (security, auth, data sensitivity).

   **After each section reply, save progress:** Call `workflow_state_save("discovery_questionnaire", slug, state)` with: `slug` (project name in kebab-case, or `"current"`), `mode` (full/compact), `completedSections` (append just-finished section id), `lastCompletedSection`, `answers` (all answers so far), `specComplete: false`. Section IDs: `"1"`, `"1b"`, `"2"`, `"3a"`, `"3b-3g"`, `"4"`, `"5"`. Update slug once a project name is known.

3. Load `get_skill("pn-documentation")` and apply the discovery spec format. Produce the discovery spec (Markdown).
4. Save to `docs/discovery/YYYY-MM-DD-<slug>.md` (slug from project/feature name).
5. **Gate:** Use `ask_question` for the final gate when available. Present: "Discovery spec complete and saved. Proceed with implementation?" Options: yes, add/correct. If ask_question is unavailable, call `workflow_confirm` with question and options; output the returned prompt to the user, then **do not proceed** to pn-writing-plans or specialists until the user replies. Parse their reply before continuing.

   **On user confirmation (yes):** Call `workflow_state_save` with `specComplete: true` to prevent future resume prompts.

## Output

- Discovery spec (Markdown). Format: follow pn-documentation (`get_skill("pn-documentation")`) for discovery spec format. Full reference: `docs/reference/discovery-and-plan-format.md`.
- File path where saved.
- Confirmation gate message. Do not continue implementation until user confirms.
- **Next step:** pn-prior-art-research before plan or scaffold.
- **Success looks like:** Spec saved, user confirmed, next step is prior art (then pn-writing-plans).

## Guardrails

- Use `ask_question` when available; never substitute inferred answers or defaults.
- For security section: never infer. Ask or state "assume [X] until confirmed."
- For design: require at least purpose and tone before frontend work. For design 3a: when scope includes frontend/UI or public-facing content, ask "Does this serve EU users?" and record in spec; if yes, note EAA 2026 / EN 301 549 compliance. For design 3b–3g: when scope includes frontend/UI, ask all subsections. When backend-only, skip 3b–3g. When 3g ambition is award-winning or distinctive: require 3e font pairing and font choice; do not proceed to plan without them.
- When invoked by pn-project-builder or pn-build: present sections one by one and ask; do not substitute a single inferred spec.
- **Skip path:** Only if user explicitly says "skip discovery" OR provides a discovery-style spec document (e.g. "here is my spec: [pasted content]"). Refs (pitch, landing, Figma, .ref/, etc.) inform questions—they do not count as "provides a complete spec." Do not skip when refs exist.
- **When invoked by pn-new with Involved intent:** Never skip. Always use **full** mode; present the questionnaire and gate on user answers. Refs may pre-fill draft answers for user confirmation; do not infer and proceed without asking.
- **Compact mode:** Only when refs exist and full is not required. Must still ask Security (2) and Backend (1b) when scope includes backend or sensitive data. Do not infer security or backend choices.

## Sources

- OWASP Secure by Design Framework — https://owasp.org/www-project-secure-by-design-framework/
