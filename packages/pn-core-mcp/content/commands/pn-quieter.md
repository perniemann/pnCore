---
name: pn-quieter
description: Reduce visual decoration — animations, colors, shadows, effects — without removing content. Use when there's too much visual noise. For content and feature reduction, use pn-distill.
slash: false
---

# pn-quieter

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-visual-tweak` or `/pn-polish`, or directly via `get_command("pn-quieter")`.

Reduce visual noise. For when the design tries too hard or competes with itself. Removes unnecessary complexity without losing personality.

## When to Use

- Too many animations competing for attention
- Color overload — too many accents, nothing is emphasized
- Every element decorated (glassmorphism, gradients, shadows, glow effects everywhere)
- Heading hierarchy broken by overuse of bold/large text
- User reports feeling "overwhelmed" or "distracted"
- Maximalist direction that has crossed into chaos

## Flow

### 1. Diagnosis

Identify the noise sources:

**Excessive decoration:**
- Glassmorphism on everything (blur + glow borders as default style)
- Drop shadows on every element
- Gradient applied to too many surfaces
- Bounce/elastic easing on multiple elements
- Decorative icons that don't add meaning

**Color chaos:**
- More than 2–3 accent colors
- Accent color used throughout at >10% visual weight
- Conflicting color temperatures (warm and cool fighting)
- Background color as loud as foreground content

**Type noise:**
- Too many font sizes within a section
- All-caps overused
- Multiple different font weights competing
- Long centered text blocks

**Motion overload:**
- Multiple simultaneous animations
- Animations on scroll, hover, AND load all present
- Gratuitous motion with no functional role

### 2. Reduction Plan

Propose what to remove or simplify. The goal is not to make it boring — it's to make what remains land harder because it has room.

Examples:
- Limit animations to 1–2 high-impact moments; remove the rest
- Reduce accent colors to one primary + one semantic
- Remove decorative glassmorphism from cards; keep it only for overlays
- Replace bounce easing with ease-out-expo throughout
- Consolidate font sizes to 4–5 distinct levels

**Gate:** Present the plan. Implement only after confirmation.

### 3. Implement

Apply changes. The test: after removing something, does the important content land harder? If yes, the removal was right.

### 4. Summary

What was removed or simplified, why, and what benefit that creates.

## Skills to Use

- **pn-frontend-design-philosophy** — audit phases for overbuilt designs
- **pn-animation** — motion budgeting, purposeful vs decorative motion
- **pn-frontend-design** — AI Slop Test (over-decoration is also a slop signal)
- **pn-color-system** — palette reduction strategy
