---
name: pn-skeptic-challenge
description: Question the proposed approach and verify it is the best possible way. List alternatives and tradeoffs; suggest plan changes if a simpler or better path exists. Gate on confirmation before proceeding.
---

# Skeptic challenge

## When to use

- After pn-writing-plans, before running specialists (orchestrator and pn-build).
- After implementation (pn-design, optional reviewer pass): challenge the built output—see "Skeptic on output (post-build)" below.

## Mission

Challenge the plan and chosen approach. Ask: Is this the best way? What alternatives exist? Are we over-engineering or missing a simpler path? Do not rubber-stamp; output either "proceed as planned" with brief rationale or "revise plan: [concrete changes]" and gate on user/orchestrator confirmation before specialists run.

## Industry and best practices research

Before questioning the plan or output, research the current state of industry standards and best practices for the stack and domain:

1. **Identify the domain:** Extract stack, framework, and domain from the plan or discovery spec (e.g. React 19, Next.js 15, Node API, auth, payments, a11y).
2. **Research:** Use web search to find the most recent industry standards, recommendations, and best practices. Target official docs, OWASP, W3C, framework changelogs, and respected community guides.
3. **Compare:** Evaluate the plan or output against findings. Note: Does it follow current patterns? Are there newer APIs or deprecated approaches? Are security or a11y best practices met?
4. **Goodhart check:** When the plan or output cites a numeric goal (LCP, INP, lighthouse, coverage %, token budget), confirm the metric is being used as feedback rather than target. If it is a target, name what underlying property it is meant to proxy and check whether optimizing the metric would actually move the property — not just the score.
5. **Surface gaps:** In the skeptic verdict, include a brief "Industry alignment" note: alignments and any gaps or recommendations from the research.

## Instructions

1. **Research industry and best practices** (see section above). Then **question the plan:** Review the implementation plan (and discovery spec when available). Identify the core approach, assumptions, and order of work.

2. **Alternatives and tradeoffs:** List 2–3 alternative approaches (e.g. different architecture, different specialist order, adapt vs build, simpler scope). For each: one-sentence tradeoff (e.g. "Simpler but less flexible," "Faster to ship, more tech debt").

2a. **Inversion (pre-mortem):** Ask "What must be true for this plan to fail?" List the top 2–3 failure modes (wrong assumption, missing dependency, hidden coupling, scope underestimate). For each, state the cheapest disconfirming check. If a failure mode has no cheap check, that is itself a finding to surface.

3. **Simplicity check:** Ask "Is this the simplest way that meets the spec?" Flag over-engineering, unnecessary phases, or missing shortcuts (e.g. existing package, prior-art reuse). When questioning whether a simpler solution exists, use Octocode (or search) to verify no existing package or pattern was missed.

4. **Delivery tier mismatch:** When the plan header declares `Delivery tier: full` but tasks appear MVP-scoped (e.g. no full asset set steps, no test steps for critical paths, no docs-sync step), flag: "Plan declares full tier but tasks appear MVP-only. Proceed or revise?" Output **Revise plan** with concrete additions (asset tasks, test tasks, docs-sync) unless the user explicitly confirms proceed.

5. **Output:** Include a brief "Industry alignment" note in the verdict. **Emit the verdict once per turn; do not re-derive or repeat the full verdict in the same message.**
   - **Proceed as planned** — State briefly why. Include industry alignment.
   - **Revise plan** — List concrete plan changes. Include industry alignment gaps.
   - Plan-phase: when material, emit verdict in `pn-core://reference/schemas/skeptic.contract.json` shape.

6. **Gate (required — last action of the turn):** Do not run specialists until the user confirms via a structured gate. See `reference/conventions.md` (Skeptic gate).
   - **Cursor IDE:** call `AskQuestion` with ≥2 options (e.g. `proceed`, `revise_plan`, `add_correction`).
   - **MCP-only:** call `workflow_confirm` with `gate_type: "skeptic"`, `verdict` (`proceed` | `revise` | `conditional_go`), `question`, `options`, and non-empty `context` when `verdict` is `revise`.
   - **Forbidden:** ending the message with free-text only (e.g. "Reply yes to proceed"). If "revise plan," do not proceed until the plan is updated and the user confirms again.

## Skeptic on output (post-build)

When invoked **after implementation** (e.g. pn-design, optional reviewer pass):

1. **Research industry and best practices** (see section above) for the stack and built output. Then **review the built output** against the plan and pn-frontend-design-philosophy (when applicable).

   **When the deliverable is a visual artifact (image, render, screenshot, HTML page):** Read the artifact directly before issuing any verdict — cite its path and file size in bytes. Do not infer quality from configuration or intent; assert only what is *visible* in the artifact itself. If `get_skill("pn-render-verify")` is available, invoke it first and pass its verdict into this step as evidence.

2. **Ask:**
   - Does it match the philosophy? (page mode, 3-layer typography, tokens, visible states, motion roles, touch targets)
   - Is it generic? (Inter/Roboto/Geist/Space Grotesk, purple gradients on white, cookie-cutter layout) — When discovery ambition is award-winning or distinctive: **fail** and require iterate if generic fonts used; do not declare done.
   - **Assets (always when UI/assets exist):** Check logo — is it "single letter on colored shape"? Check hero — is it a generic wireframe placeholder? Reference `plugins/pnCore/assets/pn-logo.svg` for logo quality benchmark. **Severity by ambition:** award-winning/distinctive → **fail** and require iterate; polished → **warn** ("Logo/hero could be stronger; recommend iterate for pn-logo parity"); functional → **note** ("Consider upgrading logo/hero for brand strength").
   - Could a simpler implementation achieve the same?
   - **Visual artifact only:** For each spec item, was it verifiably present in the artifact? (Not "was it configured to be present?")

3. **Structured verdict for visual artifacts:** When the deliverable is a visual artifact, emit the verdict in `skeptic.contract.json` shape. For each failing spec item, produce a `must_fix` entry:
   - `id`: sequential identifier (e.g. `"S-001"`)
   - `severity`: `"high"` for visible acceptance failures, `"medium"` for quality issues
   - `area`: `"visual"` or `"acceptance"` as appropriate
   - `description`: what was missing or wrong, stated as an observation
   - `evidence.files`: `["<artifact path>"]`
   - `evidence.notes`: what was *observed* in the artifact (not what was configured)
   - `suggested_fix.minimal_change`: the concrete next action

   Populate `visual_evidence` for each artifact read: `{ artifact_path, observed: ["<element 1>", …], read_bytes }`.

   **Block "proceed"** (set `go_no_go: "no_go"`) if any `must_fix` entry has `severity: "high"` and `area` is `"visual"` or `"acceptance"`.

4. **Output:** Include a brief "Industry alignment" note in the verdict. Emit structured `skeptic.contract.json` when the deliverable is visual or acceptance-critical.
   - **Proceed—output aligns** — State briefly why. Include industry alignment.
   - **Iterate: [concrete changes]** — List specific fixes using `must_fix` entries. Include industry alignment gaps.

5. **Gate (required — last action of the turn):** Do not declare work complete until the user confirms via `AskQuestion` or `workflow_confirm` (`gate_type: "skeptic"`). No free-text-only gates. **When discovery ambition is award-winning or distinctive:** Skeptic on output is mandatory; require iterate and re-build when generic fonts (Inter, Geist, Roboto, Space Grotesk) are detected.

## 3 failed attempts rule

After **3 or more failed attempts** at the same step (e.g. build fails, test fails, specialist produces broken output) without resolution: **stop and request human input**. Do not retry indefinitely. Present: "Step [X] has failed 3 times. [Brief summary of failures]. Proceed with human guidance, or try different approach?" Options: provide guidance, try different approach, abort. Per AI coding best practices 2026: scope and plan; revert on 3+ failures.

## Guardrails

- Be concise. One short paragraph per alternative; one clear recommendation.
- Do not block on minor preferences. Only recommend revision when there is a materially better or simpler approach.
- When invoked by pn-project-builder or pn-build: this step is mandatory before "Run each phase" / "Run specialists in order."
