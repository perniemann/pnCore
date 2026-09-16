# Prompt provider knobs

Model-specific prompting knobs for `pn-prompt-optimize`. Stay model-agnostic by default; apply these only when the user names a target model, and record what you applied in the optimized prompt's Notes. **Update as providers change** — not tied to a calendar version.

**Resource:** `pn-core://reference/prompt-provider-knobs.md`.

## OpenAI (GPT-5.x family)

- **Reasoning vs GPT models:** Reasoning models plan internally — give them the goal and constraints, not step-by-step chain-of-thought scaffolding. GPT models benefit from more explicit how-to instructions.
- **`reasoning.effort`:** Tune effort (low → high) instead of padding the prompt with "think step by step." Agentic / long-running rollouts: low–medium is usually enough; raise for hard planning or debugging.
- **Agentic prompts:** Tell the model to resolve the full query before yielding, decompose into sub-tasks, reflect after each tool call, and track progress with a TODO/rubric. Add tool-call preambles only at notable steps.
- **Instructions vs input:** High-level behavior (role, tone, rules) goes in the system/`instructions` channel; task-specific data goes in the user/`input` channel.
- **Prompts as code:** Reusable hosted prompt objects (`v1/prompts`) are deprecated (shutdown 2026-11-30). Keep prompts in versioned files with typed parameters; cover changes with evals (Promptfoo is the recommended successor to the OpenAI Evals platform).
- **Pin snapshots:** Pin production prompts to a specific model snapshot and re-run evals when upgrading.

## OpenAI (GPT-6 Astra)

Astra-era coding agents need **less** hand-holding than Sol/Luna-era prompts. Revisit skills, `AGENTS.md`, and task prompts when the session model is this capable. Do not add a second always-on essay.

- **Skill descriptions:** Short, **narrow WHEN**. Bad: “Use when working with databases, queries, models, or persistence.” Good: “Use when adding or changing a migration, or reviewing its rollout.” Front-load trigger words — Codex shortens descriptions when the catalog exceeds about 2% of context (~8000 characters for the **whole list**).
- **Progressive disclosure:** Root `SKILL.md` is a router. Load `reference.md` / scripts only for the active workflow.
- **Recipes:** Drop numbered itineraries that weaker models needed. Keep refuse paths, HITL for irreversible work, and `workflow_step` gates. Slim the prose, not the gate.
- **AGENTS.md:** Point at docs when the task needs them. Do not require architecture.md + database.md + deployment.md before every edit.
- **Persistence:** Define completion in the task (“implement, run local disposable tests, fix failures caused by this change”). A “stop after first implementation” line pulls the model to an earlier stop. Do not encode “run tests without asking” as a global `workflow_step` preamble — that collides with involved-intent HITL.
- **Multi-model repos:** Guidance that helps Sol or Luna can overconstrain Astra. Keep shared outcomes in skills; put model-specific procedure in this file and apply it only when the user names the target model.

## Anthropic (Claude 4.6+ / Opus 5 / Fable 5.1)

- **Start on Opus:** Daily-driver work stays on Opus (`premium` / `premium_thinking`). Use **Fable 5.1** (`long_horizon`) for multi-hour loops, orchestration, or when Opus at high effort still fails your evals.
- **Thinking is always on** for Fable 5.1. Control spend with **effort** (`low` → `max`), not `thinking: disabled`. MCP cannot set `output_config`; this is operator / Cursor-slider guidance.
- **Effort (Fable 5.1):** Default **low/medium** for routine / explore / mechanical turns. Raise for skeptic, judge, security, or strategy **without swapping model** (keeps the prompt cache). Mid-conversation effort change does not bust cache on Fable 5.1.
- **Cache:** Fable 5.1 cache reads are **$0.25/MTok**. Keep history **append-only**; do not rewrite `system` or `tools` mid-session. Load a skill once; do not inject-then-delete per-turn reminders.
- **Anti-patterns (Fable 5.1):** Drop emphasis boosters (“IMPORTANT”, “you MUST”), scratchpad / “think step by step” scaffolds, stale few-shots, contradictory rules, and restacked “verify then verify” liturgy. Keep pnCore MCP gates (`workflow_step`, maker≠checker, `/pn-deliver`) — slim the *prose*, not the refuse path.
- **Forced `tool_choice`:** `any` or a named tool is invalid on Fable 5.1 (HTTP 400). Do not recommend it in optimized prompts. Use `auto` plus explicit “when to call this tool” text.
- **Adaptive thinking:** Prefer adaptive thinking for multi-step tool use and long-horizon agent loops over manual `budget_tokens`.
- **Structure:** XML tags (or Markdown headers) to delimit instructions, context, examples, and inputs. Consistent, descriptive tag names; nest when content is hierarchical.
- **Examples:** 3–5 diverse, canonical few-shot examples wrapped in tags — not an exhaustive edge-case list.
- **Long context:** Put long documents/data at the top, with the query and instructions at the end; ask the model to ground answers in quoted passages first.
- **Be clear and direct, add motivation:** Explain *why* a constraint matters; Claude generalizes from the rationale. For "above and beyond" output, ask for it explicitly.
- **Agentic state:** For multi-context-window work, have the model save progress to a file and resume on a fresh window. Maker ≠ checker: a separate pass verifies "done."
- **Subagents:** Capable models orchestrate subagents natively; if you see overuse, add explicit guidance on when *not* to delegate (single-file edits, sequential work, shared state).
- **Reversibility:** For autonomous runs, instruct confirmation before hard-to-reverse or shared-system actions.

## Google (Gemini 3.x)

- **Simplify:** Gemini 3 is a reasoning model — drop heavy chain-of-thought scaffolding; it may over-analyze verbose legacy prompt engineering. Be concise and direct.
- **`thinking_level`:** Control reasoning depth (high for planning/debugging, low for high-throughput) instead of CoT prompting.
- **Temperature 1.0:** Keep the default. Lowering temperature can cause looping or degraded performance on complex reasoning.
- **Thought signatures:** Capture `thoughtSignature` from each response and return it exactly on subsequent turns; missing signatures error on function calling.
- **Context placement:** With large data (books, codebases, long video), put instructions/questions *after* the data and anchor with "Based on the information above…".
- **Verbosity:** Default output is terse; explicitly steer for a conversational persona if needed.

## Cross-provider (all current models)

- **Max iterations:** Every agent loop has a turn/iteration cap to prevent unbounded runs.
- **Structured tool errors:** Tools return structured error objects the model can reason about, not raw exceptions.
- **Minimal high-signal context:** Smallest set of tokens that reliably yields the outcome; just-in-time retrieval over dumping data; stable prefix for cache discounts (see `pn-context-engineering`, `pn-budget-cost-monitor`).
- **Evals on change:** Capability suite (behavior you want) plus regression suite (must not break) before shipping prompt changes.
