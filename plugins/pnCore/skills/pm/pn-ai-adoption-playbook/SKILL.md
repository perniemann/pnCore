---
name: pn-ai-adoption-playbook
description: "Write an organizational AI adoption playbook — stakeholder alignment, phased rollout plan, change management communication, success metrics, and risk/rollback strategy. Use when a team or org is moving from AI experimentation to systematic deployment and needs a structured change management document."
---

# AI Adoption Playbook Skill

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- An organization wants to move from ad-hoc AI experimentation to a coordinated deployment strategy
- A team lead or executive needs a structured rollout plan to present to stakeholders
- There is resistance to AI adoption and a change management narrative is needed
- An existing AI initiative has stalled and needs a structured restart
- You need to define success metrics and a "what done looks like" definition before investing further

---

## Instructions

### 1. Stakeholder alignment

Before any rollout, map the stakeholder landscape:

| Stakeholder | Role | Primary concern | How to address |
|-------------|------|----------------|----------------|
| Executive sponsor | Funds and legitimizes | ROI, competitive risk | Business case with peer benchmarks |
| Team leads | Manage adoption | Team disruption, job security | Phased rollout, upskilling focus |
| Individual contributors | Do the work | Learning curve, fear of replacement | Hands-on time, success stories |
| IT / Security | Enable and protect | Data handling, access control | Agent governance charter |
| Legal / Compliance | Mitigate risk | Liability, IP, privacy | Compliance checklist, policy charter |

Run a stakeholder interview or survey before writing the playbook. Key question for each group: "What would have to be true for you to consider this initiative a success?"

### 2. Adoption phases

Structure the rollout in three phases:

**Phase 1 — Seed (weeks 1–4)**
- Goal: Prove value in a low-risk context; build internal champions.
- Scope: 1–2 volunteer teams, internal use cases only (no customer impact).
- Activities: Install tooling, run Foundation modules (Layer A from `pn-ai-fluency-curriculum`), weekly check-ins.
- Exit criteria: At least 2 teams can complete a real task end-to-end with AI assistance. At least one "I wouldn't have done this without AI" story to share with broader org.

**Phase 2 — Grow (weeks 5–12)**
- Goal: Expand to all teams; introduce workflow-integrated use cases.
- Scope: All product and engineering teams; begin customer-adjacent use cases with governance gates.
- Activities: Layer B curriculum modules, agent governance charter signed, audit trail enabled.
- Exit criteria: >50% of target team members at fluency level 2+. At least one workflow produces a measurable efficiency or quality improvement.

**Phase 3 — Scale (week 13+)**
- Goal: Embed AI use into how work is defined, not just how it's executed.
- Scope: Org-wide including non-technical teams; customer-facing agents with full governance.
- Activities: Layer C curriculum (builder/multiplier), custom skill/rule authoring, regular AI retros, contribution culture.
- Exit criteria: AI use is a standard part of how new projects are kicked off and reviewed.

### 3. Change management communication plan

For each phase, prepare:

**Announcement (before phase start):**
- What is changing and why
- What is not changing (job roles, accountability)
- What support is available (training, champions, office hours)
- How to raise concerns (named contact, anonymous channel)

**During-phase updates (weekly):**
- One concrete win: "Team X used AI to cut their review cycle from 3 days to 4 hours."
- One honest challenge: "Prompt quality is inconsistent — we're running a workshop Thursday."
- One learning: "We found that AI works best when given the full context file, not a summary."

**Phase wrap-up:**
- Metrics vs. targets (see §4)
- What we're keeping, what we're changing
- Who to recognize as early champions

Write these as email drafts or Slack post templates, ready for the sponsor to send.

### 4. Success metrics

Define metrics at three layers. All baselines must be measured before Phase 1 starts:

**Activity metrics (leading indicators — easy to measure early):**
- % of team members who have completed at least one real AI-assisted task this week
- Number of custom skills/rules authored by team members
- Number of AI retro items recorded per sprint

**Quality metrics (mid-term — measure from Phase 2):**
- Defect rate in AI-assisted vs. non-assisted outputs (PR review comments, bug reports)
- Time from task start to first review-ready artifact
- Team satisfaction with AI tooling (quarterly survey, 1–5 scale)

**Outcome metrics (lagging — measure from Phase 3):**
- Cycle time for a defined unit of work (e.g. new feature from brief to deployed)
- Cost per deliverable (where measurable)
- Employee confidence score: "I feel confident using AI tools in my daily work" (1–5)

Set explicit targets before the rollout. Example: "By end of Phase 2, 60% of team members at fluency level 2+; time to first-draft artifact reduced by 30%."

### 5. Risk and rollback strategy

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI output causes production error | Medium | High | Gate: all AI artifacts require human review before merge/deploy |
| Low adoption due to time pressure | High | Medium | Time-box learning: 30 min/week dedicated, manager-sponsored |
| Data leak via AI tool | Low | Critical | Agent governance charter, no PII in prompts policy |
| Key champion leaves org | Medium | Medium | Train two champions per team, not one |
| Tool or vendor changes | Low | Medium | Skills/rules are portable; governance framework is tool-agnostic |

**Rollback trigger:** If adoption drops below 20% of target after Phase 2, or if a governance incident occurs, pause Phase 3. Run a post-mortem using `pn-skeptic-challenge` before re-proceeding.

### 6. Playbook document structure

Produce `docs/ai-adoption-playbook.md` with these sections:

```markdown
# AI Adoption Playbook — <Org/Team Name>

**Version:** 1.0  **Owner:** <Name>  **Last updated:** <date>

## Executive summary (1 page)
## Stakeholder map
## Adoption phases with timeline
## Change management communication templates
## Success metrics with baselines and targets
## Risk register and rollback triggers
## Curriculum and training plan (link to pn-ai-fluency-curriculum output)
## Agent governance (link to pn-agent-governance output)
## Review cadence
```

---

## Output

- `docs/ai-adoption-playbook.md` — full playbook
- Stakeholder map table
- Phase timeline with exit criteria
- Communication templates (announcement, weekly update, wrap-up) for each phase
- Metrics dashboard spec (baselines, targets, measurement method)
- Risk register

## Integration

- **pn-ai-fluency-curriculum** — Learning content; this skill provides the org-level container
- **pn-agent-governance** — Governance charter; must be complete before Phase 2 customer-adjacent use cases
- **pn-create-prd** — If AI adoption is itself a product initiative, produce a PRD alongside this playbook
- **pn-skeptic-challenge** — Run against the playbook before presenting to leadership
- **pn-feedback-analysis** — Use to analyze survey results and retro notes as data accumulates
