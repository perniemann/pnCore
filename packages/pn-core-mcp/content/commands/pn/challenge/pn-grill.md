---
name: pn-grill
description: Interactive Socratic stress-test — one question at a time with recommended answers, walks every branch until resolved. Use for dialogue before building. For a fast automated single-pass challenge, use pn-skeptic instead.
---

# pn-grill

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-grill")`.

Stress-tests a plan or design through interactive Socratic dialogue — not a single-pass report. One question at a time. Each question comes with a recommended answer. Every decision branch gets walked until resolved.

## When to use this vs. similar commands

| Command | Mode | Best for |
|---------|------|---------|
| `pn-grill` | Interactive, conversational | You're uncertain — want to think through an approach before committing |
| `pn-skeptic` | Automated single-pass | Fast pipeline review; you want a verdict, not a conversation |
| `pn-pressure-test` | Startup idea | Evaluating a business concept, not a technical plan |

Use `pn-grill` when you have a design decision, architecture choice, or product direction you're not sure about and want to explore via dialogue rather than receive a static report.

## How to invoke

Paste or describe your plan, design, or proposal. The command will:
1. Ask the highest-priority clarifying question with a recommended answer
2. Follow your answer with the next question
3. Continue until all major branches are resolved
4. End with a summary of resolved decisions and any remaining open questions

## Output

- A structured decision log (question → answer → implication)
- Resolved decisions with rationale
- Remaining open questions flagged for further investigation

## Guardrails

- One question at a time — never proceed to implementation until the dialogue is complete
- Recommended answers are suggestions, not commands; user can override
- If the user says "stop", summarize decisions reached so far
