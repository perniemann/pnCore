---
name: pn-delight
description: Add purposeful moments of joy, motion, and personality. Use when the design is correct and complete but feels flat and lifeless.
slash: false
---

# pn-delight

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-visual-tweak` or `/pn-polish`, or directly via `get_command("pn-delight")`.

Add purposeful delight — moments that make the interface feel human and memorable. Every addition must serve a purpose: reduce anxiety, provide feedback, build personality, or reward attention.

## When to Use

- Design is functional and complete but feels mechanical
- No micro-interactions or motion
- No moments that make the user smile
- Preparing for a "wow moment" in a demo or launch

## The Rule

Every delight element must answer: **"What does this communicate or improve?"**

- Celebration animation on task completion → reduces anxiety, rewards effort
- Hover animation that reveals secondary action → teaches the interface
- Staggered card entrance on page load → creates a sense of arrival
- Empty state with a custom illustration → humanizes the product

If the answer is "it looks cool" — remove it. That's decoration, not delight.

## Flow

### 1. Context

Check `.pncore-design.md` for brand personality. Delight must match the brand tone: a data analytics tool gets subtle, precise micro-interactions; a consumer app gets playful, expressive ones.

Load `get_skill("pn-animation")` and consult the motion taxonomy.

### 2. Audit What Exists

- Are there any current animations or transitions?
- What states exist that could benefit from motion? (empty → content load, success, error, hover, focus)
- What are the most emotionally resonant moments in this product? (First use? Task completion? Milestone?)

### 3. Propose Delight Points

Identify 3–5 high-impact moments. For each:
- Where: specific component or interaction
- What: the animation or design detail
- Role: Reveal / Orient / Confirm / Delight (per pn-animation taxonomy)
- `prefers-reduced-motion` fallback

Examples by impact level:

**High impact (start here):**
- Page load: staggered reveal of key content elements
- Task completion: celebration state (confetti, checkmark animation, color flash)
- First data load: skeleton → content transition with care

**Medium impact:**
- Hover states with character (scale, color shift, icon animation)
- Form validation: gentle success feedback, not just red text
- Navigation: active indicator that slides, not teleports

**Low impact (use sparingly):**
- Cursor follower or spotlight effect
- Scroll-triggered reveals for each section
- Parallax (use with extreme restraint)

**Gate:** Present the plan. Implement only after confirmation.

### 4. Implement

Use the project's animation approach: CSS transitions for simple state changes, Motion (Framer Motion) for React declarative animations, GSAP for timeline sequences.

Respect `prefers-reduced-motion` for every animation:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### 5. Summary

Delight moments added, their functional role, reduced-motion coverage.

## Skills to Use

- **pn-animation** — GSAP timelines, Motion, CSS transitions, motion budget, reduced motion
- **pn-frontend-design** — whimsy and delight principles, restraint
- *reference/interaction-design.md* — interaction patterns, feedback states
