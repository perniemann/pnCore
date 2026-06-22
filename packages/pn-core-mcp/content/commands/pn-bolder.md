---
name: pn-bolder
description: Amplify a timid, safe, or generic design — more visual weight, stronger personality, clearer point-of-view. Use when the design is technically correct but forgettable.
slash: false
---

# pn-bolder

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-visual-tweak` or `/pn-polish`, or directly via `get_command("pn-bolder")`.

Amplify the design. For when it works but doesn't say anything. Increases visual weight, personality, and distinctiveness without breaking the functional design.

## When to Use

- Design is clean but forgettable
- "This could be any product" feeling
- Too safe: all Inter, neutral palette, uniform spacing, centered everything
- Client or stakeholder says "make it pop" (translate this: add a point-of-view)

## Flow

### 1. Diagnosis

Load `get_skill("pn-frontend-design")` and run the AI Slop Test. Identify which "timid" patterns are present:

- Generic font (Inter, Geist, system-ui)?
- Neutral palette with no brand hue?
- Everything centered and symmetric?
- Uniform spacing — no rhythm?
- No motion or micro-interactions?
- Identical cards?
- No visual hierarchy through scale, weight, or space?

### 2. Amplification Plan

Propose 3–5 specific changes ranked by visual impact. Examples:
- Font: swap generic for a distinctive display font with strong personality
- Color: introduce a brand-driven accent color, tint the neutrals
- Composition: break centering with asymmetric layout, offset hero text
- Scale: increase heading size dramatically, create more contrast between display and body
- Motion: add entrance reveal, hover states with character
- Details: replace generic icons, add a texture or pattern in a background section
- Typography weight: use a heavier font weight for display text

**Gate:** Present the plan. Implement only after confirmation.

### 3. Implement

Apply changes. Prioritize changes with the highest visual impact for the least disruption to layout.

Run the AI Slop Test again after: is the result still immediately identifiable as generic AI output? If yes, push further.

### 4. Summary

What was changed, what "safe" patterns were replaced, before/after description.

## Skills to Use

- **pn-frontend-design** — AI Slop Test, aesthetic direction, anti-patterns
- **pn-frontend-design-philosophy** — Named Anti-Patterns Catalog
- **pn-typography** — font selection, bold choices
- **pn-color-system** — brand-driven palette
- **pn-animation** — purposeful motion
