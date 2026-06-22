---
name: pn-prior-art-research
description: Searches for existing solutions (GitHub, npm, boilerplates), evaluates candidates, recommends adapt vs build-from-scratch with justification. Mandatory before scaffold or implementation plan.
---

# Prior art research

## When to use

- Before scaffolding a new app, plugin, or feature
- Before pn-writing-plans for multi-step implementation
- When user asks for something that may have existing solutions (e.g. "fitness tracker app", "Cursor plugin", "Stripe checkout", "design system", "3D product viewer", "animated landing page")

## Search sources

- **Package discovery:** `packageSearch` (npm/PyPI) — resolve packages by name, get repo URL and metadata
- **GitHub:** `githubSearchRepositories` → `githubSearchCode` (narrow by owner/repo). For adapted projects: `githubViewRepoStructure`, `githubGetFileContent` to inspect before recommending
- **Web search:** "[domain] boilerplate", "[domain] template", "[domain] starter", "Awesome [domain]" lists — fallback when Octocode absent

**Tool availability:** If Octocode MCP tools (`packageSearch`, `githubSearchRepositories`, `githubSearchCode`) are available, use them. Each tool expects structured queries; include `mainResearchGoal`, `researchGoal`, `reasoning` when the tool schema requires it. If Octocode is not installed, use web search and cite URLs. Do not assume tools exist—check availability before calling.

## Domains to include (derive from discovery spec)

Derive domains from discovery spec stack and scope. Do not hardcode domains—include only what the spec indicates.

- **Frontend/visual:** When stack/scope includes UI, web app, or visual output: design systems, component libraries (Radix, Chakra, shadcn), UI kits, design tokens, Figma-to-code tools; animation (Framer Motion, GSAP, Lottie, dotLottie); 3D (Three.js, R3F, Babylon.js, Spline).
- **Games/engines:** When stack/scope includes game dev: Unity (2D Animation, URP), Godot (AnimationPlayer, AnimationTree), Unreal (UET, Unreal Containers, Horde, Python Editor Script examples, BuildGraph templates; Materials/PBR tutorials, Niagara optimization guides, PCG examples, PCGPythonInterop; live asset creation: Render Everything material automation, Pyblish Unreal, Python Quick Scripts; plugin examples: file watcher patterns, Editor Utility Widget batch creation), Three.js, Babylon.js.
- **Backend/API:** When stack/scope includes server, API, or data layer: ORMs, API frameworks, auth packages, webhooks, serverless starters.
- **Infrastructure:** When stack/scope includes deployment, DevOps, or infra: container templates, CI/CD starters, IaC examples, cloud boilerplates.

Form search terms from discovery spec. Run queries for each relevant domain.

## Instructions

1. **Search:** Use discovery spec (stack, scope, core functionality) to form search terms. Run multiple queries; broaden if first pass is empty.
2. **Evaluate 3–5 candidates:** For each: name, repo/package URL, stars/activity, license, fit to spec, pros/cons.
3. **Output table:** Summary of candidates with comparison.
4. **Recommendation:** Adapt project X (with URL) OR build from scratch. Justify: why adapt saves time, or why build is needed (no good fit, licensing, complexity mismatch).
5. **Gate:** Present recommendation and options (yes / override build from scratch / override adapt other URL) — see `reference/conventions.md`. Do not proceed to pn-writing-plans until user confirms or overrides.
6. **Save to:** Load `get_skill("pn-documentation")` and apply the prior-art format. Save to `docs/research/YYYY-MM-DD-<slug>-prior-art.md` (slug from discovery spec). Include discovery ref and recommendation.
7. **Skip path:** User says "no research" or "build from scratch"—skip and note in spec. Do not block.

## Guardrails

- Gate: confirm recommendation with user (see `reference/conventions.md`).
- Never assume nothing exists; always search.
- For niche domains, broaden search terms if first pass is empty.
- Cite repos and packages with full URLs.
- If adapting: plan first task is "Clone/initialize from X; strip unrelated code; align with discovery spec."

## Output

- Prior art research document (path: `docs/research/YYYY-MM-DD-<slug>-prior-art.md`)
- Clear recommendation: adapt [URL] or build from scratch
- Gate: confirm recommendation with user (see `reference/conventions.md`). Do not pass to pn-writing-plans until user confirms or overrides.
- Pass to pn-writing-plans: include prior art ref in plan header when adapting (after gate).

**Evaluation:** Prior-art output can be evaluated for relevance of candidates to the discovery spec, validity of cited URLs, and alignment of the recommendation with the spec. Use for quality checks or evals.
