---
name: pn-writing-skills
description: "Applies TDD to skill authoring: validation scenarios first, then SKILL.md. Use when creating new skills, editing existing skills, or verifying skills work before deployment."
---

# Writing skills

## When to use

- Creating a new SKILL.md file and want test-driven authoring (scenarios first, content second).
- Editing an existing skill to verify it works as expected before deployment.
- Auditing skill quality: checking retrieval triggers, section completeness, guardrail coverage.
- Teaching someone how to author high-quality pnCore skills.

## Overview

**Writing skills is test-driven development applied to process documentation.**

You write test cases (validation scenarios), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

**Required background:** Understand the pn-tdd skill (RED-GREEN-REFACTOR). This skill adapts TDD to documentation.

## What is a skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help agents find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides.

**Skills are NOT:** Narratives about how you solved a problem once.

## TDD mapping for skills

| TDD concept | Skill creation |
|-------------|-----------------|
| Test case | Validation scenario |
| Production code | Skill document (SKILL.md) |
| Test fails (RED) | Agent violates rule without skill |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes while maintaining compliance |
| Write test first | Run baseline scenario before writing skill |
| Watch it fail | Document exact rationalizations agent uses |
| Minimal code | Author SKILL.md addressing those violations |
| Watch it pass | Verify agent now complies |

## When to create a skill

**Create when:**
- Technique wasn't intuitively obvious
- You'd reference this again across projects
- Pattern applies broadly (not project-specific)
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions (use rules or project docs)
- Mechanical constraints (automate with validation)

## Cursor plugin skill structure

For pnCore and Cursor plugins:

```
skills/
  skill-name/
    SKILL.md    # Required; frontmatter + content
```

**Frontmatter (YAML):**
- `name`: Letters, numbers, hyphens only
- `description`: Include both WHAT (one line) and WHEN (trigger scenarios). Avoid summarizing full workflow.

**Description rule:** Lead with what the skill does (one sentence), then "Use when" and trigger conditions. This improves discovery; avoid putting the full workflow in the description so agents read the full skill.

```yaml
# Bad: Summarizes workflow
description: Use when executing plans - dispatches subagent per task with review

# Good: WHAT + WHEN (third person)
description: Creates bite-sized implementation plans with exact file paths. Use when a spec exists for a multi-step task, before touching code
```

**Skill names and descriptions are a public API.** Once a skill is referenced by another skill, rule, agent, or external project (`get_skill("pn-...")`), its name and description become observable behavior callers depend on (Hyrum's Law). Renames require a deprecation cycle; description rewrites that change activation behavior require an ADR. Treat skill `name` and `description` like exported function signatures, not labels.

## SKILL.md structure

- **Overview:** Core principle in 1–2 sentences
- **When to use:** Bullet list with symptoms and use cases
- **Core pattern / workflow:** Steps, tables, or code
- **Quick reference:** Table or bullets for scanning
- **Common mistakes:** What goes wrong + fixes
- **Output:** What to produce

## The iron law (same as TDD)

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Applies to new skills AND revisions to existing SKILL.md files.

Author SKILL.md before testing? Delete it. Start over.
Revise SKILL.md without testing? Same violation.

## RED-GREEN-REFACTOR for skills

**RED:** Run validation scenario WITHOUT the skill. Document exact behavior, rationalizations, violations.

**GREEN:** Author minimal SKILL.md addressing those failures. Run same scenario WITH skill. Agent should comply.

**REFACTOR:** Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

## Bulletproofing against rationalization

- Close every loophole explicitly
- Add rationalization table (excuse → reality)
- Add red flags list (stop and start over)
- "Violating the letter is violating the spirit"

## Quality checks

- Name: letters, numbers, hyphens
- Description: "Use when..." + triggers, no workflow summary
- One excellent example (not multi-language)
- Common mistakes section
- Reference pn-plugin-quality-gates when creating plugin skills
- Reference pn-create-plugin-scaffold for plugin structure

## SkillSpector hygiene

Before merging skill changes, run `npm run validate:skill-security` (NVIDIA SkillSpector, static-only). Review CAUTION findings against the authoring rules in this section and the SkillSpector hygiene guidance below.

## Output

- Skill that passes validation scenarios
- Verification that agents comply with skill present
- Reference pn-tdd for the underlying discipline; pn-create-plugin-scaffold for plugin authoring.
