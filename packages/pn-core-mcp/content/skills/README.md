# Skills structure

Skills are grouped by domain. Cursor discovers them recursively under `skills/`.

| Category | Purpose |
|----------|---------|
| **frontend** | React/Astro/vanilla scaffolds, design philosophy, typography, CSS, grid, SVG, landing pages, Figma-to-code, embedded studio DNA (portfolio / reel / lab) |
| **backend** | Backend philosophy, Node API, payments, DB patterns |
| **ci** | Fix CI, merge conflicts, dev/prod split, smoke tests, ship checklist, deslop, loop |
| **review** | Security audit, config review, browser runtime verify, legacy modernization, error analysis, review-optimize-loop, agent governance (audit trail, compliance evidence, policy charter), GitHub issue triage (GitHub MCP) |
| **gamedev** | Gamedev philosophy, Three.js, game logic, shaders, Blender, Unreal |
| **orchestration** | Orchestration philosophy, context engineering, deprecation and removal, discovery questionnaire, skeptic challenge, prior art research, writing plans, GitHub vertical slices (Issues via GitHub MCP), documentation (format authority), cultural / museum heritage research (tiered sources) |
| **pm** | PRD, user stories, job stories, release notes, AI adoption playbook |
| **plugin** | Create plugin scaffold |
| **discipline** | Discipline philosophy, TDD, source-driven implementation, systematic debugging, writing skills, prompt optimize |
| **integrations** | n8n patterns, web3 contracts, A2A interop, CX agent patterns, RAG evaluation |
| **marketing** | Growth experiments, content strategy, community engagement |
| **support** | Analytics reporting, financial analysis, compliance check, budget and cost monitoring |
| **fsi** | Financial services analyst workflows: discipline and non-advice framing, comparable company analysis, DCF valuation, model audit, earnings analysis, market research, GL reconciliation, IC memo drafting |
| **learning** | Continual learning (AGENTS.md from transcripts), AI fluency curriculum (human upskilling) |

To add a skill: create `skills/<category>/pn-<name>/SKILL.md` with frontmatter (`name`, `description`) and the required sections below.

**`## When to use` (required)** — the primary retrieval anchor. Must appear after the frontmatter (and optional `#` title) and before the first instruction section. Include 2–4 bullet points describing when the skill applies. This is the only strictly required body section.

**Instruction section (one of the accepted aliases):** `## Instructions`, `## Workflow`, `## Approach`, `## Overview`, `## Usage` — all are valid names for the main body of a skill. Choose the one that best fits the skill's shape (step-by-step workflow → `## Workflow`; high-level guidance → `## Overview`; explicit rules → `## Instructions`).

## Skill authoring conventions

### Example prompts section (creative skills — required)

Skills used in creative workflows (animation, video, media, SVG, design) MUST include an **Example prompts** section. This gives users paste-ready invocations that load the skill explicitly. Use four prompt types:

- **Cold start** — describe what you want from scratch (most common entry point).
- **Warm start** — turn existing context (file, brief, CSV, existing page) into output.
- **Format-specific** — request a specific output format or platform variant (9:16, SRT, SVG icon, etc.).
- **Iterate** — refine an existing output (tweak timing, swap colors, re-seed a segment).

Each prompt should include the skill name explicitly (e.g. `"Using pn-animation, ..."`) so the agent loads the skill context before acting.

Place the section immediately before "## Integration" at the end of the skill file.

### Workflow skills — optional sharp edges (recommended)

For skills that encode **quality gates**, **orchestration**, or **review** workflows (not purely creative/media skills), authors **should add** where helpful:

- **Rationalizations** — short table: common excuse → counter-argument (reduces agents skipping steps).
- **Red flags — stop** — conditions that require resetting approach or escalating to the user.
- **Verification** — evidence before claiming done (commands run, artifacts, citations).

Creative skills may omit these when they would add noise; `pn-context-engineering`, `pn-ship-checklist`, and similar process skills should include them.

