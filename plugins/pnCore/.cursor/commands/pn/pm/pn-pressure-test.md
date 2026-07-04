---
name: pn-pressure-test
description: Startup idea pressure-test — verdict, scorecard, fatal flaws, problem reality, competition, first customers, MVP wedge (Strong/Weak/Pivot). Not for implementation plans; use pn-skeptic or pn-grill for those.
---

# pn-pressure-test

**Start every response with:** `[pn-command] 🔺`

Load and run `get_skill("pn-pressure-test")`.

Brutally practical critique of a **startup idea** — problem, buyer, competition as today's behavior, founder-market fit, and the smallest MVP test. Does not review code or implementation; for technical plan challenges use **`pn-skeptic`** (fast pass) or **`pn-grill`** (interactive).

## When to use

| Signal | Use `pn-pressure-test` |
|--------|------------------------|
| You have a startup / product concept you're not sure is real | Yes |
| You want to know if the problem is real and who actually has it | Yes |
| You want to map the competitive landscape honestly | Yes |
| You have a technical implementation plan to review | No — use `pn-skeptic` |
| You want to explore a design direction | No — use `pn-design-variants` or `pn-grill` |

## How to invoke

Describe the startup idea in 1–5 sentences. Include if known:
- Target customer (who exactly, not "SMBs")
- Problem being solved
- Revenue model
- Current stage (idea / MVP / revenue)

Optionally specify a mode: `pressure-test` (default full) | `problem-validation` | `competition-map` | `first-10-customers` | `mvp-plan`.

## Output

- **Verdict:** Strong / Weak / Pivot
- **Scorecard:** Problem reality, buyer specificity, competition reality, founder-market fit, MVP wedge
- **Fatal flaws:** Top 2–3 reasons this fails (if any)
- **Competition as today's behavior:** What do people do today without this product?
- **First 10 customers:** Who exactly, and how to find them
- **MVP wedge:** The smallest thing you could build/sell to prove the core hypothesis

## Guardrails

- Competition is framed as current behavior, not named competitors (a spreadsheet IS a competitor)
- Problem reality is tested against: who has it badly enough to pay to fix it today?
- No implementation code or product roadmap — this is ideation, not execution
- If the user asks "what should I build?", redirect to `pn-pressure-test` first, then `pn-writing-plans`
