# Documentation — Templates Reference

Full document templates and format structures. For doc type rules and conventions, see [SKILL.md](SKILL.md).

---

## Workflow roadmap template (`docs/WORKFLOW.md`)

```markdown
# [Project Name]: pn-core Workflow

**Status:** [Active | Draft]
**Scope:** [e.g. Full project lifecycle -- Phase 0 through v1.0]
**Source:** [Refs to PRD.md, discovery spec, plan doc]

---

## LLM Model Guide

| Model | Use for | Cost |
|-------|---------|------|
| **[user's highest model]** | Security audits, WCAG audits, GDPR analysis, full codebase review | Highest |
| **[user's high model]** | Architecture decisions, creative design, DB migration design | High |
| **[user's medium model]** | Feature development, component building, test writing, planning | Medium |
| **[user's low model]** | Verification checklists, doc formatting, simple edits, scaffolding | Low |

---

## Workflow Overview

[Mermaid or ASCII diagram showing phases and pn-core commands per phase]

---

## Phase N: [Name] -- [version]

**Sessions:** [estimated count]

### Step N: `[pn-command]` -- [description]

**Model tier:** [Highest | High | Medium | Low]
**Est. tokens:** ~[input]K in / ~[output]K out

- [substep summary]
- [substep summary]

### Step N+1: `pn-deliver` -- Verify & Package

**Model tier:** Low/Medium
**Est. tokens:** ~22K in / ~9K out

- [ ] [acceptance criterion]

---

## Session Management

| Phase | Version | Sessions | Notes |
|-------|---------|----------|-------|
| ... | ... | ... | ... |

## Cost Summary

| Metric | Estimate |
|--------|----------|
| Total input tokens | [range] |
| Total output tokens | [range] |
| Highest-tier steps | [count] |
| Estimated sessions | [count] |
```

### Token cost reference

Baseline per skill invocation (single pass). Multiply by step count for multi-step phases.

**Roadmap tier → pnCore model tier:** Low = `fast`, Medium = `standard`, High = `premium`, Highest = `premium_thinking`, Orchestration = `long_horizon`. Use Orchestration for lead sessions on multi-slice programs and loop orchestration (`suggest_model_tier` role `orchestrator`). See `pn-create-workflow-roadmap` §3, rule **`pn-orchestrator-lead`**, `pn-core://reference/subagent-routing.md`, and `pn-core://reference/loop-orchestration-guide.md`.

| Skill/Command | Est. Input | Est. Output | Model Tier |
|---|---|---|---|
| pn-discovery-questionnaire | 8–15K | 3–6K | Low (`fast`) |
| pn-create-prd | 10–15K | 5–8K | High (`premium`) |
| pn-create-design-doc | 10–15K | 5–8K | High (`premium`) |
| pn-prior-art-research | 15–25K | 5–10K | Medium (`standard`) |
| pn-writing-plans | 15–25K | 10–20K | High (`premium`) |
| pn-create-workflow-roadmap | 10–15K | 5–10K | Medium (`standard`) |
| pn-scaffolder | 10–15K | 10–15K | Medium (`standard`) |
| pn-frontend-developer | 20–40K | 15–30K | Medium (`standard`) |
| pn-backend-developer | 20–40K | 15–30K | Medium (`standard`) |
| pn-testing-specialist | 15–25K | 10–20K | Medium (`standard`) |
| pn-assets-manager | 10–20K | 5–15K | Low (`fast`) |
| pn-design | 15–25K | 10–20K | High (`premium`) |
| pn-game | 15–25K | 10–20K | High (`premium`) |
| pn-reviewer | 20–35K | 5–10K | Medium (`standard`) |
| pn-security-auditor | 20–35K | 5–10K | Highest (`premium_thinking`) |
| pn-frontend-audit | 20–35K | 5–10K | Highest (`premium_thinking`) |
| pn-deliver (verify) | 10–15K | 3–5K | Low (`fast`) |
| pn-deliver (package) | 10–15K | 5–8K | Medium (`standard`) |

---

## Prior-art research template

```markdown
# Prior Art: [Feature/Project]

**Discovery ref:** `docs/discovery/YYYY-MM-DD-<slug>.md`

## Candidates

| Name | Repo/package | Stars | License | Fit | Pros | Cons |
|------|--------------|-------|---------|-----|------|------|
| ... | ... | ... | ... | ... | ... | ... |

## Recommendation

**Adapt:** [project URL] — [one-sentence justification]

OR

**Build from scratch** — [one-sentence justification]
```

---

## SVG spec template

```markdown
# SVG Spec: [Purpose/Name]

## Purpose
Type, scope, output path.

## Identity
Content, depiction, reference.

## Style
Direction (minimal, retro, modern, etc.).

## Animation
Level, technique, prefers-reduced-motion.

## Colors
Palette, background, accent.

## Size
viewBox, aspect ratio.

## Constraints
File size, a11y, inline vs standalone.
```

---

## CHANGELOG template

```markdown
## [version] - YYYY-MM-DD

### Added
- Entry 1

### Changed
- Entry 1

### Fixed
- Entry 1
```

- Version: semver (e.g. `0.2.1`). Date: `YYYY-MM-DD`.
- Section headers: Added, Changed, Fixed, Removed, Security (use as needed).
- Entries: one line each; user-facing changes only.
