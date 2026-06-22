# pn-core Conventions

Shared patterns referenced throughout skills, commands, and agents.

---

## User confirmation gate

Whenever a plan or action needs explicit user confirmation before proceeding:

Use `ask_question` when available. If unavailable, call `workflow_confirm` with question and options; output the returned prompt, then **stop and wait** for the user's reply before continuing. Do not infer choices or apply defaults.

Short form used in file references: **"Gate: confirm with user (see conventions)."**

---

## Batching questions

Present **one section at a time**. Do not output the next section until the user has answered the current one.

---

## ask_question vs workflow_confirm

| Client | Tool | When unavailable |
|--------|------|------------------|
| Cursor IDE | `ask_question` | Call `workflow_confirm` if MCP is available; otherwise output question in chat and stop |
| MCP-only | `workflow_confirm` | Output returned prompt; stop and wait |

**Cursor + MCP:** After `AskQuestion`, when the pn-core MCP server is connected, call `workflow_confirm` with the same `question`, `options`, `gate_type`, and `context` so `.pncore/gate-log.jsonl` records a `gate_id` (audit trail). Then stop until the user replies.

---

## Skeptic gate

After **pn-skeptic-challenge**, **pn-skeptic** agent/command, or any workflow step that says "run skeptic," the **last action of the assistant turn** must be a structured gate — not free-text "Reply yes."

| Verdict | Suggested options (labels) |
|---------|----------------------------|
| Proceed | `proceed`, `revise_plan`, `add_correction` |
| Revise plan | `apply_revisions`, `revise_plan`, `add_correction`, `proceed_unrevised` |
| Conditional go | `proceed`, `apply_must_fix`, `revise_plan` |

**Forbidden:** gates with only `yes` / `no` when a real choice exists (use the table above).

**MCP `workflow_confirm` parameters for skeptic gates:**

- `gate_type`: `"skeptic"` (also: `"plan"`, `"design"`, `"discovery"` for non-skeptic gates; default `"plan"`)
- `verdict`: `"proceed"` | `"revise"` | `"conditional_go"`
- `context`: summary of verdict and must-fix items (required when `verdict` is `"revise"`)
- `must_fix_summary`: optional short list for revise gates

When `gate_type` is `"skeptic"` and `verdict` is `"revise"`, the tool rejects calls with fewer than two options or empty `context` (`INVALID_GATE`).

---

## Skip paths

Honor explicit skip instructions from the user: "skip discovery", "skip skeptic", "no research", "build from scratch". Do not block when the user opts out. Note the skip in the spec or plan.

---

## 3 failed attempts rule

After **3 or more failed attempts** at the same step without resolution: stop and request human input. Do not retry indefinitely.
