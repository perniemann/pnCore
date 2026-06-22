---
name: pn-ai-fluency-curriculum
description: Design an AI fluency curriculum for a team or organization — skill-level assessment, learning path design, hands-on exercise plans, and progress tracking. Use when onboarding a team to AI agent tooling, building internal AI education programs, or helping individuals move from passive AI use to confident, autonomous AI collaboration.
---

# AI Fluency Curriculum Skill

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Onboarding a team that is new to AI agents (Cursor, pnCore, or other tooling)
- Building a structured internal AI education or upskilling program
- Designing a self-paced learning track for an individual engineer, designer, or manager
- Assessing where a team currently sits on the AI fluency spectrum
- Creating practical exercises and checkpoints, not just reading lists

---

## AI fluency levels

| Level | Label | Description |
|-------|-------|-------------|
| **0** | Observer | Aware AI exists; has not used it on real work |
| **1** | Prompter | Uses AI reactively — one-off questions, copy-paste outputs |
| **2** | Collaborator | Iterates with AI on real tasks; understands output quality signals |
| **3** | Orchestrator | Directs multi-step agentic workflows; can debug agent failures |
| **4** | Builder | Designs, ships, and governs AI-powered features or tools |
| **5** | Multiplier | Improves how their whole team uses AI; creates skills/rules/agents for others |

Most teams start spread across levels 1–2. The curriculum goal is to pull everyone to at least level 3 and grow level 4–5 champions.

---

## Instructions

### 1. Assess the team's current level

Run a quick calibration:

1. Ask each team member to rate themselves on the 0–5 scale above.
2. Ask: "Describe the last time you used an AI tool to complete a real work task. What happened?" — listen for iteration depth, not just outcome.
3. Ask: "What stops you from using AI more?" — common answers: trust in output, speed, not knowing the right prompts, fear of mistakes.

Produce a **team fluency map**: anonymized distribution across levels, with top blockers noted. Use this to calibrate which modules to prioritize.

### 2. Design the learning path

Build from a three-layer curriculum:

**Layer A — Foundation (Level 0 → 2, ~2 weeks)**

| Module | Goal | Format |
|--------|------|--------|
| A1: What agents actually do | Correct mental model of LLMs and agents | 30-min read + Q&A |
| A2: Prompt craft basics | Write prompts that get useful first drafts | Paired exercise with real task |
| A3: Output evaluation | Judge quality, catch errors, iterate | Review workshop |
| A4: Safe use in production | What not to share, when to review outputs | Policy walkthrough |

**Layer B — Workflow integration (Level 2 → 3, ~3 weeks)**

| Module | Goal | Format |
|--------|------|--------|
| B1: pnCore install and first run | Get tooling working; run one full pn-build | Hands-on session |
| B2: Discovery to plan | Use `pn-discovery-questionnaire` → `pn-writing-plans` on a real or practice project | Paired exercise |
| B3: Specialist routing | Understand how orchestrator delegates to specialists; edit a plan step | Workshop |
| B4: Review and deliver | Run `pn-review` and `pn-deliver`; read the output critically | Workshop |
| B5: Debugging agent failures | What to do when an agent produces a wrong artifact | Incident simulation |

**Layer C — Builder and multiplier (Level 3 → 5, ongoing)**

| Module | Goal | Format |
|--------|------|--------|
| C1: Authoring skills | Write a custom `SKILL.md` for a recurring team task | Project |
| C2: Authoring rules | Write a glob-triggered `.mdc` rule for a team standard | Project |
| C3: MCP workflow integration | Connect `workflow_step` to a real project workflow | Project |
| C4: Agent governance | Design the governance charter for a production agent | Workshop + deliverable |
| C5: Teaching others | Pair with a Level 1 team member and bring them to Level 2 | Mentorship |

### 3. Design hands-on exercises

For each module, the exercise must use **real or realistic work**, not toy examples. Format:

```
Exercise: <module id> — <title>
Duration: <minutes>
Setup: <what the learner needs ready>
Task: <specific thing to accomplish>
Success signal: <how the learner knows they've done it correctly>
Reflection: <1–2 questions to discuss after>
```

Example (B1):

```
Exercise: B1 — First pnCore run
Duration: 45 min
Setup: Cursor installed, pnCore plugin installed, a real or practice project folder open
Task: Run /pn-new on the project. Complete the discovery questionnaire. Accept or edit the generated plan. Run one build step.
Success signal: A `docs/PLAN.md` exists with steps that match the project. At least one artifact was produced by the build step.
Reflection: What did the agent get right? What would you have done differently? Where did you have to correct it?
```

Provide at least one exercise per module. For Layer C, the exercise IS the deliverable.

### 4. Track progress

Use a simple tracking table, kept in a shared doc or `docs/ai-fluency-progress.md`:

```markdown
| Name | Baseline level | Target level | A modules done | B modules done | C modules done | Current level |
|------|---------------|-------------|----------------|----------------|----------------|---------------|
| ...  | 1             | 3           | A1, A2         | B1             |                | 2             |
```

Check in every two weeks. Do not use completion of modules as the proxy — use demonstrated behavior change: "Has this person's last 3 AI interactions improved vs. 4 weeks ago?"

### 5. Cultural practices that sustain fluency

Beyond the curriculum, embed these into team rhythm:

- **AI retros:** Add one agenda item to every sprint retro: "What AI use worked well? What failed? What did we learn?"
- **Prompt library:** Shared doc or repo of team-specific prompts and skill invocations that worked.
- **Skill/rule contributions:** Treat authoring a new pnCore skill as a first-class engineering contribution.
- **Pair AI sessions:** When onboarding a new team member, pair them with an experienced user for one real task per week for 4 weeks.
- **No-blame incident reviews for AI errors:** When an AI output causes a problem, run a brief post-mortem — not to blame the user, but to improve the prompt, rule, or process.

---

## Output

- Team fluency map (assessment results)
- Prioritized module sequence for this specific team
- Exercise scripts for the highest-priority modules
- `docs/ai-fluency-progress.md` tracking table
- Cultural practices checklist

## Integration

- **pn-ai-adoption-playbook** — Organizational change management layer; this skill handles the learning content
- **pn-continual-learning** — Agent-side memory; pairs with the human-side learning loop this skill creates
- **pn-discovery-questionnaire** — Teams should run this as a Layer B exercise on a real project
- **pn-writing-plans** — Core skill for Layer B; learners produce real plans
