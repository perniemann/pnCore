---
name: pn-grill
description: "Stress-test a plan or design through Socratic one-question-at-a-time interrogation. Each question includes a recommended answer. Walks every branch of the decision tree until all assumptions are resolved. Use when you want to be challenged on a plan before building, or when invoked by pn-grill command."
---

# Grill

## When to use

- Before implementing a plan: "grill me on this plan"
- When exploring a design decision and unsure about the approach
- After pn-writing-plans, as an alternative to pn-skeptic-challenge when interactive dialogue is preferred over a single-pass report
- When the user says "grill me", "challenge this", "stress-test this plan"

## Difference from pn-skeptic-challenge

`pn-skeptic-challenge` is an automated single-pass review that runs in the build pipeline — it produces a report and a proceed/revise verdict. `pn-grill` is an interactive dialogue — it asks questions one at a time, tells you what it thinks the answer should be, and walks every branch until all assumptions are resolved. Use `pn-grill` when you want a conversation, not a report.

## Workflow

### 1. Gather the plan or design to stress-test

If not already provided, ask: "What plan or design do you want me to grill you on? Paste it or describe it."

Do not proceed to questioning until the plan/design is clear.

### 2. Identify the decision tree

Mentally map the main branches:
- Core approach / architecture decisions
- Key assumptions (what must be true for this to work)
- Alternatives not chosen (and why)
- Dependencies and sequencing
- Scope and what's explicitly out of scope
- Risk areas (where could this go wrong)

If the plan/design is in the codebase, explore it first: use `localSearchCode`, `lspGotoDefinition`, or `SemanticSearch` to understand current structure before questioning. Do not ask the user questions that can be answered by reading the code.

### 3. Interrogate — one question at a time

For each branch, ask **one question at a time**. After each question:
1. State your **recommended answer** — what you think the right answer is and why
2. Wait for the user's response
3. If the user agrees: note it as resolved, move to the next branch
4. If the user disagrees: follow the disagreement — ask the next question to resolve the new branch it opens

**Question format:**
> **[Branch]:** [Question]
>
> *My recommendation: [Recommended answer and brief rationale]*

#### Parallel-objects mode (orchestrator-only)

When invoked by an orchestrator that is running `pn-grill` over **N > 1 parallel objects** in the same round (e.g. `pn-business-strategy-orchestration` running a head-to-head across 3 angles, where 6 questions × 3 angles = 18 sequential prompts would be user-hostile), the orchestrator MAY batch **one load-bearing question per object, per round**, in a single `AskQuestion` form. Constraints:

- The orchestrator MUST be the caller (a direct user invocation of `pn-grill` always uses the one-question default).
- Each batched question still carries its own `My recommendation: …` line; recommendations are not merged.
- The form contains **at most N questions**, where N is the number of parallel objects. Multiple questions about the same object in one form is forbidden.
- The "load-bearing" question is the one whose answer flips the verdict for that object. Pick that one; defer the rest to sequential follow-ups only if the load-bearing answer keeps the object alive.
- Branch-tracking still applies per object: `[Object X / Branch Y resolved]`.

For all other callers and contexts, the one-question default in step 3 stands.

**Example questions by category:**
- Approach: "Is this the simplest solution that meets the requirements? My recommendation: yes — the added complexity of [X] isn't justified given [Y]."
- Assumptions: "Does this assume [X] is always true? My recommendation: no — handle the case where [X] is false explicitly."
- Alternatives: "Have you considered [alternative approach]? My recommendation: stick with current plan — [alternative] adds [complexity/coupling] without clear benefit."
- Scope: "Should [feature/behavior] be in scope for this change? My recommendation: out of scope — add it as a follow-up to keep this change focused."
- Risk: "What happens if [failure scenario]? My recommendation: add a fallback for [specific case] — the rest can fail gracefully."

### 4. Track resolved branches

Keep a running count. After each answer, note: "[Branch X resolved]" and state the next branch.

### 5. Stop when all branches are resolved

When all major branches are resolved, output a brief summary:
- Decisions confirmed
- Any plan changes implied by the interrogation
- "Grill complete. [N] branches resolved, [M] plan changes recommended."

## Guardrails

- Ask one question at a time — never batch multiple questions about the same object (parallel-objects mode permits one batched question **per object** per round; see step 3)
- Always provide a recommended answer — do not ask open-ended questions without a position
- If a question can be answered by exploring the codebase, explore instead of asking
- Do not rubber-stamp — challenge assumptions that seem weak, even if the user seems confident
- Stop when resolved, not when you've asked N questions — some plans need 3 questions, some need 20
