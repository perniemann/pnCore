---
name: pn-distill
description: Remove content, sections, and features that don't earn their place — information architecture reduction. Use when there's too much stuff on the page. For visual decoration reduction, use pn-quieter.
slash: false
---

# pn-distill

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by `/pn-visual-tweak` or `/pn-polish`, or directly via `get_command("pn-distill")`.

Radical simplification. For when too much has accumulated — features, decoration, copy, navigation — and the core value is buried. Remove until only what earns its place remains.

## When to Use

- Landing page isn't converting — too much competing for attention
- Dashboard is cluttered — users don't know where to look
- Component has grown complex — needs to be redesigned from intent
- Before a redesign: strip the current version to understand what's essential
- "We added a lot of stuff, let's clean it up"

## The Principle

Every element should answer: **"If I removed this, would the user lose something essential?"**

If no: remove it.

## Flow

### 1. Intent First

Before removing anything: what is this page/component/flow trying to accomplish?

- Primary action: what should the user do?
- Primary message: what should the user understand?
- Primary emotion: how should the user feel after using it?

Everything that doesn't serve one of these three is a candidate for removal.

### 2. Audit for Removal

**Content:**
- Text that restates what's already shown elsewhere
- Section introductions that say what the heading already says
- Feature lists where 20% get 80% of attention — cut the 80%
- Supporting stats or proof that duplicate the primary proof

**Visual:**
- Decorative elements that don't reinforce brand or message
- Icons used as filler, not communication
- Background patterns or textures serving no atmospheric purpose
- Shadow, border, and background stacking (element inside bordered card inside shadowed section)

**Navigation:**
- Menu items users never click
- Secondary CTAs competing with the primary
- Multi-level navigation for a small surface area

**Interaction:**
- Animations with no functional role
- Hover states that reveal nothing useful
- Modals for simple confirmations

### 3. Reduction Plan

List everything to remove or consolidate. Categorize:
- **Remove:** No loss of function or value
- **Consolidate:** Two things doing the same job — keep one
- **Defer:** Important but not for this view — move to detail page or second screen

**Gate:** Present the plan. Implement only after confirmation (removals are hard to recover).

### 4. Implement

Apply removals. After each major removal: does the remaining content land harder? Is the primary action clearer?

### 5. Summary

What was removed, what was consolidated, and how the clarity-to-complexity ratio improved.

## Skills to Use

- **pn-frontend-design-philosophy** — Phase 1 (page mode), phase 6 (performance/resilience)
- **pn-frontend-design** — AI Slop Test (over-complexity is also a slop signal)
- *reference/ux-writing.md* — copy reduction, removing redundancy
- *reference/spatial-design.md* — negative space as a design element
