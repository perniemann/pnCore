# Best practices

Cross-cutting checklist for design, full_dev, and frontend_audit workflows. Covers a11y, security, performance, design, orchestration, optional cost control, mobile, and WebXR. **Update this document as standards evolve** — it is not tied to a calendar version.

**Resource:** `pn-core://reference/best-practices.md`. The compatibility URI `pn-core://reference/best-practice-2026-03.md` resolves to the same file.

## 1. A11y

- WCAG 2.2 baseline (level A/AA where required).
- **Touch targets (WCAG 2.5.8):** 24×24px minimum for all interactive targets; 44×48px preferred for primary CTAs; 8px spacing between targets.
- **Reduced motion (C39, WCAG 2.3.3):** Respect `prefers-reduced-motion: reduce` — disable or simplify animations and transitions; apply globally in base styles with `animation: none !important; transition: none !important;`.
- **EAA 2026 (EU):** When serving EU users, conform to WCAG 2.1 AA (transitioning to 2.2), EN 301 549; alt text, 4.5:1 contrast, keyboard nav, form labels, heading hierarchy, focus visible, document language.
- Semantic HTML; `role` and `aria-*` where needed; descriptive alt for images.

## 2. Security

- OWASP-aligned: no infer for auth, data sensitivity, or compliance.
- Ask or state "assume [X] until confirmed" for security items in discovery.

## 3. Performance

- **Core Web Vitals:** LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; preload critical assets; explicit width/height on media to avoid CLS; reserve space for async content.
- Lazy loading for below-the-fold media; stable layout to avoid jumpiness.

## 4. Design

- Token-based (colors, spacing, typography); design philosophy alignment.
- Avoid generic AI aesthetics (e.g. Inter everywhere, purple gradients on white).
- **Full dimension checklist + copy-paste block:** `pn-core://reference/aesthetics-baseline.md` (use with project `.pncore-design.md`).
- **Award rubric (visual distinctiveness):** Inventive art direction, cohesive storytelling via layout and motion, consistent design system, custom interaction design — avoid template/AI-generated look.

## 5. Orchestration

- Deterministic workflow steps; human gates before plan and before implement.
- Prefer MCP `workflow_step` when available; ask when plan contains options that need user input (plan accuracy).
- When `full_dev` step 4 returns `parallel: true` and `tasks`, run those specialist tasks in parallel (e.g. Cursor Task tool per task); pass `taskResults` (one summary string per specialist id) when advancing to step 5. Normative detail: `pn-core://reference/RUNBOOK.md`, `pn-core://reference/workflow-state-schema.md`.
- **Phased specialists:** If `specialistList` mixes parallelGroup 0 (e.g. scaffolder) with multiple group-1 specialists, step 4 uses Phase A (sequential) then Phase B (`parallel: true`). Complete Phase A, call `workflow_step` again on step 4 with `specialistSequentialComplete: true` and partial `taskResults`, then run Phase B. After any parallel segment, follow file ownership in `pn-core://reference/parallel-rules.md` and run a merge/conflict check before review (see `pn-build` step 5.5).

## 6. Cost Control (optional)

When `report_usage`, multi-tenant workflows, RAG, or heavy tool use are in play:

- **Meter before optimizing:** Track token and API usage per workflow, session, or tenant; use provider dashboards or MCP `report_usage` / `workflow_usage_totals` when wired.
- **Budgets:** Set soft or hard caps; alert at thresholds (e.g. 80%). Prefer **pn-budget-cost-monitor** for workflow structure and for **hidden token drivers** (tool schemas, duplicated context, RAG top-k, multimodal attachments).
- **Context cost:** **pn-context-engineering** — slim tiers intentionally; do not fund unnecessary input every turn.
- **Tool output hygiene:** Collapse or truncate large tool results before the next model call; LLM-summarize only when collapsed output still exceeds threshold; never re-paste results already in context. See **pn-budget-cost-monitor**.
- **Prompt cache ordering:** Keep stable content (rules, skills, tool schemas) at the context prefix; put volatile tail (chat, tool results) last so provider prompt-cache discounts apply.
- **Workflow dedupe:** Each skill should load once per `run_id` per step; repeated `get_skill` across steps wastes tokens (measure with `npm run measure-tokens`).
- **RAG changes:** **pn-rag-evaluation** — golden sets and regression gates so quality/cost tradeoffs stay measured, not guessed.

## 7. Mobile (iOS / Android)

- **iOS privacy manifests:** Include `PrivacyInfo.xcprivacy` for any API that requires a reason (e.g. file timestamp, user defaults, photos). Required for App Store submission since iOS 17+ (mandatory since May 2024).
- **Android permissions:** Declare only permissions you use; request at point-of-need; handle denial gracefully with rationale UI.
- **Touch targets:** Minimum 44pt (iOS) / 48dp (Android) for all interactive elements; follow respective HIG / Material 3 guidelines.
- **Platform privacy defaults:** Disable tracking without explicit user opt-in; use `AppTrackingTransparency` (iOS) / `ConsentSDK` (Android) flows.

## 8. WebXR / Spatial Computing

- **HTTPS required:** WebXR Device API only works in secure contexts; always serve over HTTPS.
- **Frame rate targets (2026 hardware):** Quest 3 supports 90fps/120fps; Vision Pro runs at 90fps. Target ≤11ms/frame (90fps) or ≤8ms/frame (120fps); check device refresh rate at runtime — do not hardcode 60fps.
- **Fallback:** Provide a non-XR fallback experience; gracefully degrade when `navigator.xr` is unavailable or session request is denied.
- **Permissions:** Request `xr-spatial-tracking` permissions policy; handle denial with a user-facing message.
- **Reduced motion in XR:** Minimize vestibular-triggering motion; provide comfort settings for locomotion.

## 9. Engineering laws applied (pnCore)

Cross-reference for the *Laws of Software Engineering* vs pnCore gap-closure. Owning content uses canonical paths under `packages/pn-core-mcp/content/` (synced to the plugin via `npm run sync:content`).

- **Bus factor:** `CONTRIBUTING.md`, `docs/adr/0001-record-architecture-decisions.md`
- **Linus's Law (review):** `pn-discipline-philosophy` — section F) Review Rules
- **Premature optimization:** `pn-discipline-philosophy` — Measure before optimize, D) Change Rules
- **Inversion (pre-mortem):** `pn-skeptic-challenge` — step 2a
- **Map is not the territory:** `pn-orchestration-philosophy` — Single source of truth, A) Discovery Rules
- **Second-System Effect / Strangler Fig:** `pn-orchestration-philosophy` — B) Prior Art Rules

### 9.1 Wave 2 (additional laws)

- **Hyrum's Law / Postel's Law (API surface):** `pn-backend-philosophy` — Surface preservation; `pn-writing-skills` — skill names as API
- **Goodhart's Law:** `pn-discipline-philosophy` — Measure before optimize (caveat); `pn-skeptic-challenge` — industry alignment Goodhart check
- **Chesterton's Fence:** `pn-discipline-philosophy` — D) Change Rules
- **Boy Scout Rule:** `pn-discipline-philosophy` — D) Change Rules (bounded cleanup)
- **Lehman's Laws:** `pn-discipline-philosophy` — Maintain or rot; `docs/adr/0002-skill-rule-audit-cadence.md`
- **Conway's Law / Inverse Conway:** `pn-orchestration-philosophy` — Architecture mirrors orchestration
- **Brooks's Law:** `pn-orchestration-philosophy` — D) Handoff Rules; pairs with `pn-skeptic-challenge` 3-failed-attempts
- **Hofstadter's Law:** `pn-orchestration-philosophy` — C) Planning Rules
- **Parkinson's Law:** `pn-orchestration-philosophy` — E) Scope Management Rules
- **Gall's Law:** `pn-orchestration-philosophy` — B) Prior Art Rules
- **Pareto Principle:** `pn-orchestration-philosophy` — E) Scope Management Rules

## 10. Prompt → Context → Loop

The 2026 industry stance (OpenAI, Anthropic, Google) is a **stack**, not a single discipline. Each layer wraps the one inside it; the leverage moves outward as agents run longer and more autonomously.

| Layer | Optimize | Unit | pnCore owner |
|-------|----------|------|----------------|
| **Prompt** | Wording, structure, examples, output contract | One turn | `pn-prompt-optimize` (4-Block layout); `pn-image-prompt-engineering` for diffusion |
| **Context** | What enters the window each turn | One inference | `pn-context-engineering` (tiers); `pn-budget-cost-monitor` (stable-prefix ordering, tool-output hygiene) |
| **Loop** | The system that decides what to prompt, when, and when to stop | Many turns | `workflow_step` engine (`workflows.ts`); gates (`workflow_confirm`, `approval_checkpoint`); `pn-loop`, `pn-review-optimize-loop`, `pn-skeptic-challenge` |

- **Loops in code, prompts in content.** Control flow is deterministic (`workflow_step` validates `state` and enforces gates); the LLM assists each step but does not decide sequence. This is loop engineering at the workflow layer.
- **Prompts as versioned code.** Skills, agents, and commands live in git under `packages/pn-core-mcp/content/`; change them via PR, not hosted prompt objects (OpenAI is deprecating reusable `v1/prompts`; shutdown 2026-11-30).
- **Context is finite.** Curate the smallest high-signal token set per turn; prefer just-in-time retrieval (paths, queries, MCP) over pasting large data; keep stable content at the prefix for cache discounts.
- **Maker ≠ checker.** The agent that produced work should not be the only one grading it — `pn-skeptic-challenge` / `pn-reviewer` are separate from the builder; `pn-loop` ends on verification-command evidence, not self-declared "done."
- **Bounded loops.** Every loop has a stop condition and an iteration cap (3-failed-attempts rule; `pn-review-optimize-loop` single retry; skeptic gates).
- **Evals before shipping prompt changes.** Both OpenAI (Promptfoo direction) and Anthropic (capability vs regression suites) treat behavioral evals as non-optional for production prompts. Skill **retrieval** evals and behavioral eval coverage remain tracked gaps — use `pn-rag-evaluation` and workflow skeptic gates before shipping prompt changes.
- **Model-specific knobs.** Stay model-agnostic in content, but when a target model is named apply `pn-core://reference/prompt-provider-knobs.md` (reasoning effort, adaptive thinking, `thinking_level`).
