---
name: pn-create-domain-doc
description: "Create a domain/mechanics doc and its ubiquitous-language glossary when a product has rules, progression, formulas or domain terms. Use for mechanics-heavy or domain-heavy products."
---

# Create a Domain / Mechanics Document

## Purpose

Create a DOMAIN document (or game-design-doc style) that captures core loop, progression system, rules, formulas, and mechanics. Use when the product has gamification, scoring, tiers, quests, or domain-specific rules that must be documented before implementation.

## When to use

- During project kickoff when discovery indicates mechanics-heavy scope
- Trigger: discovery mentions progression, tiers, scoring, gamification, quests, levels, badges, RPG, fitness scoring, or similar
- When the user requests documentation of domain rules or game mechanics
- Skip when scope is simple CRUD, landing page, or tool without progression/mechanics

## Input

- Discovery spec (from pn-discovery-questionnaire)
- PRD when available (for feature context)
- User's request with domain context

## Instructions

1. **Check scope:** If discovery has no progression, scoring, tiers, quests, gamification, or domain rules, skip and output: "Scope does not include mechanics. DOMAIN doc not needed."

2. **Load discovery spec:** Read discovery for purpose, core functionality, scope, and any mentioned mechanics.

3. **Apply the DOMAIN template** with sections relevant to the product. Include only sections that apply; omit irrelevant ones.

### Template sections

**1. Core Loop**
- Diagram or narrative: main user loop (e.g., Log → Earn → Level → Repeat)
- One-sentence player (user) role

**2. Progression System**
- **Levels/Tiers:** Table of thresholds, names, XP or points required
- **Formulas:** Scoring formula (e.g., XP = MET × duration × body_factor); document variables
- **Rolling window:** If applicable (e.g., 28-day sum), describe how it works
- **Level-up / level-down:** Behavior on threshold cross
- **Visual feedback:** XP bar, badges, animations

**3. Quest / Challenge Types** (when applicable)
- Table: type, example, reward, frequency
- Streak definition (minimum criteria, backfill rules)
- Quest UI: progress bars, completion feedback

**4. Badges & Achievements** (when applicable)
- Rarity tiers
- Example badges and unlock criteria
- Avoid vanity badges (e.g., login count)

**5. Balance & Tuning Notes**
- Formula derivation or worked examples
- Source data (e.g., MET Compendium, WHO guidelines)
- Tuning process post-launch
- Anti-gaming measures (caps, validation)

**6. Anti-Patterns to Avoid**
- Pay-to-win, punitive messaging, grind pressure
- Overjustification (extrinsic vs intrinsic motivation)
- Product-specific anti-patterns from discovery

4. **Load pn-documentation:** Apply format conventions.

5. **Save output:** Prefer **`docs/refs/DOMAIN-DOC.md`** (matches `workflow_step("project_kickoff")`). Create `docs/refs/` if missing. Legacy: `docs/DOMAIN.md` if the project already uses flat `docs/` root.

## Output

- DOMAIN doc at **`docs/refs/DOMAIN-DOC.md`** when created
- Or: "Scope does not include mechanics. DOMAIN doc not needed." when skipped
- Gate: "Domain doc complete. Proceed?" when created. Use ask_question or workflow_confirm when available.

## Integration

- **pn-new (Involved mode):** Step 4 runs this skill conditionally when scope includes mechanics
- **pn-writing-plans:** Plan references DOMAIN doc for formulas and rules
- **pn-create-refs-index:** Include DOMAIN doc in index when present

<!-- merged from pn-domain-language (0.22.0) -->
## Domain language

### When to use

- When domain terms are being used inconsistently in a conversation or codebase
- When starting a complex domain model and want shared vocabulary
- When the user asks "let's define our terms" or mentions DDD, ubiquitous language, or domain model
- When onboarding to a codebase with domain-specific vocabulary

### Workflow

#### 1. Scan for domain terms

Read the current conversation (and relevant codebase files if available) for:
- Domain-relevant nouns (entities, value objects, aggregates, events)
- Domain-relevant verbs (operations, transitions, commands)
- Concepts that appear under multiple names
- Terms that seem overloaded or ambiguous

#### 2. Identify problems

- **Same word, different concepts:** "account" used for both a billing entity and a user authentication identity
- **Different words, same concept:** "purchase", "order", "transaction" all meaning the same thing
- **Vague or overloaded terms:** "process", "handle", "manage" — too generic to be meaningful
- **Implicit concepts:** things that are real in the domain but have no agreed-upon name

#### 3. Propose a canonical glossary

Be opinionated. When multiple words exist for the same concept, pick the best one and mark the others as aliases to avoid.

Group terms into clusters when natural categories emerge (by lifecycle, actor, subdomain). If all terms belong to one cohesive domain, one table is fine.

#### 4. Write to `UBIQUITOUS_LANGUAGE.md`

Create or update the file in the workspace root:

```markdown
# Ubiquitous Language

## [Domain cluster name]

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **[Term]** | [One sentence: what it IS, not what it does] | [synonym1, synonym2] |

## Relationships

- A **[Term]** belongs to exactly one **[Other Term]**
- An **[Term]** produces one or more **[Other Term]**

## Example dialogue

> **Dev:** "[Question using domain terms precisely]"
> **Domain expert:** "[Answer using terms precisely]"
> [3–5 exchanges that demonstrate how terms interact and clarify boundaries]

## Flagged ambiguities

- "[term]" was used to mean both **[Term A]** and **[Term B]** — these are distinct: [brief distinction]. Use **[Term A]** for [context], **[Term B]** for [context].
```

#### 5. Output inline summary

After writing the file, summarize in chat:
- How many terms extracted
- Key ambiguities resolved
- Any terms that need domain expert input to resolve

### Re-running

When invoked again in the same conversation or project:
1. Read existing `UBIQUITOUS_LANGUAGE.md`
2. Incorporate new terms from subsequent discussion
3. Update definitions if understanding has evolved
4. Re-flag any new ambiguities
5. Rewrite the example dialogue to incorporate new terms

### Rules

- **Be opinionated.** Pick the best term; don't hedge with "this could be called X or Y."
- **Flag conflicts explicitly.** Call out ambiguous terms in "Flagged ambiguities" with a clear recommendation.
- **Only domain terms.** Skip generic programming concepts (array, function, endpoint) unless they carry specific domain meaning.
- **Tight definitions.** One sentence max. Define what it IS. Not what it does.
- **Show relationships.** Use bold term names and state cardinality where obvious.
- **Write an example dialogue.** 3–5 exchanges between a dev and domain expert demonstrating precise term usage.
