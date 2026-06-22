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

## Anthropic (Claude 4.6+ / Opus 4.8 / Fable 5)

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
