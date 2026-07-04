---
name: pn-create-domain-doc
description: "Create a domain/mechanics doc when product has rules, progression, formulas (gamification, scoring, tier systems). Use when scope indicates mechanics-heavy products (RPG, fitness scoring, game loops)."
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
