---
name: pn-pressure-test
description: Pressure-test a startup idea with early-stage frameworks — verdict, scorecard, fatal flaws, problem reality, competition, first customers, MVP wedge. Use when asked to validate an idea, assess founder-market fit, map competitors and current behavior, find first customers, define a 2-week MVP test, or deliver a strong/weak/pivot call.
---

# Startup pressure test

## When to use

- Validating a startup idea before committing to build anything.
- Stress-testing fatal flaws, competition, and buyer clarity with a structured scorecard.
- Defining the smallest MVP that tests the single riskiest assumption in ~2 weeks.
- Getting a Strong / Weak / Pivot verdict before investing in a PRD or implementation plan.

## Overview

Evaluate a startup idea before building the wrong thing. Be direct and practical: real users, painful problems, observable behavior today, manual traction, and the smallest test that proves or kills the thesis.

This skill is **not** `pn-skeptic` / `pn-grill` (those stress-test **implementation plans**). Here the artifact is the **business idea** and its riskiest assumptions.

## Language

Match the user's language for prose. Keep familiar startup terms in English when clearer: `ICP`, `MVP`, `PMF`, `early adopter`, `switching cost`, `wedge`.

## First move

If the idea is missing, ask once:

```text
Send the startup idea, target customer, and what you want them to do or pay for.
```

If the idea is already provided, start immediately.

## Modes

Infer mode from the user request; if unclear use **`full`**.

| Mode | Focus |
|------|--------|
| `pressure-test` | Fatal flaws and verdict |
| `problem-validation` | Whether pain is real and urgent |
| `competition-map` | Current behavior, direct/indirect substitutes, switching cost |
| `first-10-customers` | Manual plan to find and convert the first ~10 customers |
| `mvp-plan` | Smallest MVP that tests the core assumption in ~2 weeks |
| `full` | Compact pass through all of the above |

For criteria, discovery prompts, and expanded checklists per mode, read **references/playbooks.md** in this skill folder (`skills/pm/pn-pressure-test/references/playbooks.md` under the pnCore plugin root after sync).

## Default output

Default to **compact** output. Include the **scorecard** unless the user asks for narrative-only.

Use this shape:

```markdown
**Verdict**
Strong / Weak / Pivot required

2–3 direct sentences.

**Scorecard**
| Area | Score | Read |
|---|---:|---|
| Pain intensity | 3/5 | ... |
| Buyer clarity | 2/5 | ... |
| Urgency | 3/5 | ... |
| Differentiation | 2/5 | ... |
| Speed to validate | 4/5 | ... |
| Founder advantage | 3/5 | ... |

**Core Assumption**
One sentence.

**Fatal Flaws**
| Risk | Severity | Why It Matters | Fast Test |
|---|---|---|---|
| ... | High | ... | ... |

**Problem Reality**
- Pain: ...
- Early adopter: ...
- Vitamin or painkiller: ...

**Competition**
- Current behavior: ...
- Real enemy: ...
- Differentiation needed: ...

**First 10 Customers**
1. ...
2. ...
3. ...

**MVP**
- Build:
- Cut:
- 2-week test:
```

### Default limits

- Scorecard: always **6 rows** (areas below).
- Verdict: **≤3 sentences**.
- Fatal flaws: **≤3 rows**.
- Problem reality: **≤3 bullets**.
- Competition: **≤3 bullets**.
- First 10 customers: **≤3 numbered actions**.
- MVP: **≤3 bullets** under **MVP**.
- Do **not** add outreach templates, discovery question banks, or weekly milestone lists unless the user asks for more detail.

## Rules

- Be specific to the idea; avoid generic startup platitudes.
- Rank the most dangerous flaws first.
- Name the **single core assumption** that must hold for the business to work.
- Treat **how buyers behave today** as competition; "no competitors" is false until proven.
- Prefer evidence of **past behavior** over hypothetical intent or compliments.
- Prefer manual founder-led validation before ads, automation, or scale.
- Cut scope that does **not** test the riskiest assumption.
- MVP tests **one** riskiest assumption — not a mini full product.
- If the idea is weak, say so and sketch a **pivot path**.
- Do **not** invent market statistics. When facts matter and are uncertain, use web search where appropriate or list what must be verified externally.

## Scoring

Use 1–5 only when tied to evidence from what the user supplied (not vibes):

| Area | What it measures |
|------|-------------------|
| Pain intensity | Depth and frequency of the pain |
| Buyer clarity | Who pays, budget, decision process |
| Urgency | Why now vs later |
| Differentiation | Vs status quo and substitutes |
| Speed to validate | How fast a honest test can run |
| Founder advantage | Unfair edge, access, insight, distribution |

## Deep mode

If the user asks for **`deep`**, **full report**, **brutal**, **be extremely honest**, or **more detail**, expand each section using **references/playbooks.md** as the checklist source:

- Assumptions to validate
- Disconfirming evidence to hunt for
- Customer discovery questions
- Example outreach angles (short, not full spam sequences)
- 2-week milestones
- Pivot options

Keep tone direct and structured.

## Integration

- **pn-idea-miner:** Optional critique step after the user picks an idea.
- **pn-create-prd:** After a **Strong** or revised thesis, PRD can document scope; **Weak/Pivot** should precede any big PRD effort.
