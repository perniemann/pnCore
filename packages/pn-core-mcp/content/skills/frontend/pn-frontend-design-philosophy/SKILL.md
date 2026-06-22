---
name: pn-frontend-design-philosophy
description: Defines an authoritative, brand-agnostic frontend design rulebook. Use when designing or reviewing frontends, typography audit, layout audit, state architecture, performance budget, responsive/mobile/touch design, or when establishing design constraints for mixed visual/motion/media/form/conversion sites.
---

# Frontend Design Philosophy

## Purpose

Use this as a frontend design rulebook for sites that mix:

- Strong visual identity
- Typography-led structure
- Motion/scroll experiences
- 2D/3D media
- Forms / tools / product UX
- Conversion goals
- Performance constraints

It is brand-agnostic and execution-ready.

## When to use

- Designing new frontends (components, pages, flows)
- Reviewing existing frontends against consistent criteria
- Establishing design constraints for a team or AI agent
- Auditing typography, layout, motion, media, state, or performance
- Aligning on frontend quality before or during implementation

For workflow phases, scoring, templates, build strategy, and red-flag checklist, see [reference.md](reference.md).

---

## Core Philosophy (non-negotiables)

### One page = one dominant job

Every page must primarily be one of:

- **Portfolio**
- **Product marketing**
- **Editorial / scrollytelling**
- **Tool / app**
- **Conversion / form**
- **Catalog / e-commerce**

Secondary jobs can support, but not compete.

### Typography carries structure

Hierarchy, semantics, and rhythm must be understandable before motion/media load.

### Modularity beats one-off design

Build pages from repeatable blocks, not custom sections everywhere.

### Media proves | text orients

- Use 2D/3D/video for proof and atmosphere
- Use text for direction, meaning, and decisions

### State must be visible

Users should always know:

- Where they are
- What changed
- What is loading
- What to do next

### Motion must serve meaning

Motion is allowed only if it:

- **Reveals**
- **Orients**
- **Confirms**
- **Delights** (without harming comprehension)

### Performance is part of design

Budget media and JS during design, not after implementation. **Core Web Vitals:** LCP ≤2.5s, **INP ≤200ms** (Interaction to Next Paint—responsiveness to clicks/taps/keyboard), CLS ≤0.1. Per **best practices** (`pn-core://reference/best-practices.md`).

### Responsive and touch-first

Layout and interactions must work across viewports and input modes. Mobile-first; design for touch (pointer: coarse) and provide alternatives for hover-only interactions. Never disable zoom.

---

## Design Rulebook (Do / Don't)

### A) Typography Rules

**Do**

- Use a 3-layer type system (display / reading / utility)
- Keep heading grammar consistent across sections
- Use metadata labels (year, role, medium, status, category) as first-class UI
- Match density to page mode (editorial sparse vs catalog dense)
- Use repeated semantic labels to create rhythm and memory

**Don't**

- Don't create too many type roles
- Don't let display type weaken hierarchy
- Don't bury system semantics in body copy
- Don't use decorative type styles on core controls
- Don't mix too many type moods on one page

### B) Layout + CSS Rules

**Do**

- Build repeatable vertical sections
- Use spacing as hierarchy control
- Encode semantics visually (status, warning, CTA, metadata)
- Define component variants instead of duplicating one-offs
- Keep overlays/modals predictable and focus-safe

**Don't**

- Don't hand-style every section
- Don't rely on borders for hierarchy when spacing can do it
- Don't make CTAs look like labels
- Don't hide close actions in overlays
- Don't let hero styling leak into utility UI

### C) Motion + Scroll Rules

**WCAG 2.2 SC 2.3.3 (Animation from Interactions, Level AAA):** Motion animations triggered by user interaction must be disableable unless the animation is essential to functionality or information conveyed. Provide reduced-motion variants and user controls (pause, stop, reduce motion) where applicable.

**Do**

- Tag every motion pattern with a job (Reveal / Orient / Confirm / Delight)
- Use scroll in chapters for long-form storytelling
- Keep motion local when possible
- Provide reduced-motion variants (prefers-reduced-motion; 150–250ms for small UI transitions when simplified)
- Make content understandable without motion
- Allow animations to be disabled unless essential

**Don't**

- Don't animate everything
- Don't stack hover + parallax + cursor + scroll on one module
- Don't tie key meaning only to animation
- Don't use heavy scroll effects on dense reading sections
- Don't ship cinematic motion without performance testing

### D) 2D / 3D / Video Rules

**Do**

- Choose one dominant media type per section
- Use 3D as a focal module, not decorative wallpaper
- Pair galleries with metadata/context
- Show loading states for heavy media
- Give tools a clear input → preview → output flow

**Don't**

- Don't put text + video + 3D + controls in one viewport unless absolutely necessary
- Don't autoplay heavy media without fallback
- Don't hide media loading/failure states
- Don't make media the only source of meaning
- Don't treat 3D as mandatory if 2D can communicate it

### E) State Management Rules

**Do**

- Separate UI, form, URL, async, and recovery states
- Make state transitions visible in UI copy
- Persist meaningful preferences and progress
- Put filters/sort/category in URL state
- Design empty/loading/error/success as first-class states

**Don't**

- Don't silently lose form progress
- Don't keep all important state only in memory
- Don't hide unsupported-state constraints (device/WebGL/etc.)
- Don't reuse one generic error message everywhere
- Don't assume "loading" is obvious without UI feedback

### F) Performance + Resilience Rules

**Do**

- Set budgets by page mode before implementation
- Prioritize text-first render and stable layout
- Lazy-load non-critical media and interactions
- Test on mid-range devices, not only dev machines
- Preserve no-JS and reduced-motion readability

**Don't**

- Don't optimize visuals first and structure later
- Don't ship giant media assets without responsive sizing
- Don't block first render with non-critical JS
- Don't ignore interaction latency while chasing visual polish
- Don't treat fallback states as optional

### G) Responsive + Touch Rules

**Do**

- Design mobile-first: base styles for small viewports; enhance for larger screens
- Use `@media (pointer: coarse)` or `(any-pointer: coarse)` to increase touch target size (44×48px minimum)
- Provide non-hover alternatives for key actions (`@media (hover: none)`—no hover-only menus or tooltips)
- Ensure reflow at 320px without horizontal scroll (WCAG 1.4.10)
- Use relative units (rem, em) and avoid `user-scalable=no` or `maximum-scale=1`
- Space touch targets at least 8px apart

**Don't**

- Don't rely on hover alone for critical functionality—touch-only users have no hover
- Don't use fixed-width containers that force horizontal scroll on small screens
- Don't disable zoom—violates WCAG and harms accessibility
- Don't use tiny touch targets (below 44×48px) for interactive elements

---

## Final Principle

The target style is not "fancy motion" or "award-site design" (trend-chasing flash over substance). Award-worthy = distinctive, intentional, non-generic. Not award-site = avoid Awwwards-only aesthetics without usability.

It is:

**Clear structure + intentional typography + visible state + selective immersion + disciplined performance + responsive and touch-accessible.**

That is the rulebook.
