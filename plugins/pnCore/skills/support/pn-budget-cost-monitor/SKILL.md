---
name: pn-budget-cost-monitor
description: "Track token usage, API cost, and compute budgets; surface hidden token drivers; alert when approaching limits; recommend degradation. Use when running autonomous or multi-tenant workflows, RAG, or heavy MCP tool use with cost control."
---

# Budget and cost monitoring

## When to use

- Autonomous or multi-step workflows with cost control requirements
- Multi-tenant or multi-client operations
- When `report_usage` is available (pn-core MCP) and the client reports token/cost per step
- Before or after high-cost tasks (e.g. full_dev, long builds)
- After adding RAG, large tool schemas, or always-on rules that inflate every turn

## What counts toward cost (API / managed LLMs)

Billable input is usually **everything the provider counts in the context window** for that request, not only the user’s last message:

- **System / developer instructions** and policy blocks
- **Conversation history** the client sends (full thread vs sliding window)
- **Tool definitions** (name, description, parameter schemas) on each API call that includes tools
- **Tool results** pasted back into context (large JSON, stack traces, file reads)
- **Multimodal parts** (images, PDFs) — often much higher than text for the same “display size”
- **Reasoning / hidden model overhead** where the vendor charges separately or includes internal tokens (read pricing docs)

**Output tokens** are explicit completions; **cached input** (provider prompt cache) may be discounted — treat discounts as vendor-specific, not guaranteed across models.

## Easy-to-miss (“hidden”) drivers

| Driver | Why it hurts |
|--------|----------------|
| **Duplicate context** | Same doc pasted in user msg + system + tool output |
| **Fat tool schemas** | Verbose `description` on every parameter multiplies per request |
| **Unbounded retrieval** | RAG pulling top-k large chunks every turn without summarization |
| **`list_*` / discovery dumps** | Dumping full skill lists or logs into chat “for context” |
| **Image / log attachments** | Binary or huge text blocks tokenize aggressively |
| **Retry storms** | Failed steps re-run full context each attempt |

Mitigation pairs with **pn-context-engineering**: load only tiers needed; cap RAG k and chunk size when budgets bite.

**Tool output hygiene (ordering matters):**
1. **Collapse / truncate first** — strip boilerplate, keep structured signal (e.g. error message + stack top, not full stderr dump). Prefer this over LLM summarization; it is lossless-by-design and costs no extra tokens.
2. **LLM-summarize only on overflow** — when collapsed output still exceeds a threshold (e.g. >500 tokens), summarize with the model. Do not summarize as the default path.
3. **Never re-paste** — do not echo a tool result already in context in the next user message.

**Provider prompt cache ordering:**
Place stable content (system rules, always-on skills, tool schemas) at the **top** of the context so it falls within the provider's cached prefix. Volatile content (conversation tail, tool results, per-turn user input) goes **last**. Re-sending static blocks outside the cache boundary cancels the discount.

**Fable 5.1:** cache reads are **$0.25/MTok**. Keep the prefix byte-stable and the history **append-only** (do not rewrite `system` / `tools` or inject-then-delete reminders). Watch hit rate in the host console; MCP cannot set cache markers. See `pn-core://reference/prompt-provider-knobs.md`.

## Workflow

1. **Establish baseline:** If workspace has `.pncore/usage.jsonl` or similar, read recent usage. Establish per-workflow or per-session budget (optional).
2. **Static footprint (repo dev):** From pnCore repo root, `node scripts/measure-tokens.mjs` estimates always-on rules, MCP tool-description bulk, and largest skills — useful for “why is every turn expensive?” in Cursor.
3. **Integrate with report_usage:** When the client invokes `report_usage` after each `workflow_step`, usage is appended to the configured path. Aggregate by workflow, step, or time window.
4. **Compare to budget:** If budgets exist, compare cumulative usage. Flag when approaching threshold (e.g. 80%, 100%).
5. **Recommend:** When over budget: suggest "Shed non-critical work" (skip optional phases), "Pause and confirm with user," "Shrink RAG k / summarize tool output," or "Continue with warning."

## Output

- Cost report: workflow, steps, tokens (input/output), estimated cost, budget status
- Alerts when approaching or exceeding budget
- Recommendations: proceed, degrade, or halt
- When diagnosing: short list of likely hidden drivers (from the table above) tied to the user’s setup

## MCP integration

- **report_usage:** Client reports usage per step; include **`run_id`** from `workflow_step`. Server appends to file when path provided.
- **workflow_usage_totals:** Sums tokens/cost for one **`run_id`** over `.pncore/usage.jsonl` (optional path).
- **workflow_state_save/load:** Can include `usageSummary` in state for resume.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Only user messages matter for cost." | System, tools, and history usually bill too. |
| "We'll optimize after launch." | Baselines disappear; add metering before scale. |
| "One big `get_skill` dump is fine." | Large skills are multiplicative across turns if re-injected. |

## Verification

- Numbers tied to a source: billing export, `report_usage` lines, or provider dashboard — not hand-waved.
- If recommending shrink: name **what** to remove or summarize.

## Guardrails

- Do not block execution by default; budget monitoring is advisory unless explicitly configured as hard limit.
- Document assumptions (e.g. cost per 1K tokens, cached vs uncached) when estimating.
- Per MCP Best Practices: "Track token, API, and compute budgets per tenant; shed non-critical work under pressure."
- **Goodhart:** A token budget is feedback; do not starve safety or verification steps just to win a KPI (see **pn-discipline-philosophy**).

## Integration

- **pn-context-engineering** — Reduce what enters the model each turn.
- **pn-rag-evaluation** — RAG quality vs cost tradeoffs; chunk/k tuning.
- **pn-orchestration-philosophy** / **pn-ship-checklist** — Cost awareness before long orchestrated runs.
