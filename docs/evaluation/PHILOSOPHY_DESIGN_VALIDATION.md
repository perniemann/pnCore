---
title: Philosophy design validation (evaluator-only)
updated: 2026-04-22
---

# Philosophy Design Validation (evaluator doc — do not expose to agent)

Reusable prompts to validate that frontend skills produce philosophy-aligned output instead of generic aesthetics. **Evaluators only:** pass criteria and this doc must not be in agent context. In an empty chat you paste only the prompt; the agent must not see this file or the criteria.

**How to run a test:** Open a new chat. Paste only the prompt from one of the sections below (nothing else). Use the design workflow if you want discovery + skeptic; otherwise the build-gate may apply. Do not mention "pressure scenario", "pass criteria", or this doc to the agent.

**Reference:** Success criteria derive from pn-frontend-design-philosophy, its reference.md, and **best practices** (`pn-core://reference/best-practices.md`; a11y, performance, design). Aligned with WCAG 2.2 and Core Web Vitals (LCP, INP, CLS).

---

## 1. SaaS Dashboard Hero

**Prompt to paste (only this in chat):**

> Build a SaaS dashboard hero section. Use pn-frontend-design and pn-frontend-design-philosophy. Vanilla HTML/CSS is fine. Make it distinctive, not generic.

**Pass criteria (evaluator only):**

| Criterion | Pass | Fail |
|----------|------|------|
| Page mode | Product mode identified; primary job clear | Unclear mode or competing intents |
| Typography | 3-layer system (display/reading/utility); no Inter, Roboto, Space Grotesk | Generic fonts or unclear hierarchy |
| Color | Cohesive palette from tokens; no purple gradient on white | Purple-on-white cliché, raw hex values |
| Motion | Tagged (Reveal/Orient/Confirm/Delight) or absent | Untagged motion or animation without role |
| Reduced motion | prefers-reduced-motion respected (disable or simplify when specified) | Animations ignore reduced-motion preference |
| States | Loading/empty/error considered for any async content | No state design |
| Tokens | Color, spacing, typography from design tokens | Inline values, magic numbers |
| Touch | 24×24px minimum (WCAG 2.2 SC 2.5.8); 44×48px preferred for touch; no hover-only critical actions | Tiny targets (<24px), hover-only UI |
| Performance | Stable layout (no CLS); above-the-fold media LCP-friendly | Layout shift, unoptimized hero assets |

---

## 2. Portfolio Landing Page

**Prompt to paste (only this in chat):**

> Design a portfolio landing page for a creative professional. Use pn-frontend-design and pn-frontend-design-philosophy. One dominant job. Distinctive, not generic.

**Pass criteria (evaluator only):**

| Criterion | Pass | Fail |
|----------|------|------|
| Page mode | Portfolio mode; primary CTA and proof type identified | Unclear mode |
| Typography | 3-layer system; distinctive display + refined body | Inter/Roboto/Space Grotesk |
| Layout | Repeatable blocks; modular sections | One-off custom sections everywhere |
| Media | One dominant type per section; loading state if heavy | Text + video + 3D + controls competing |
| Motion | Functional role or absent; reduced-motion considered | Decorative motion, no role |
| Reduced motion | prefers-reduced-motion respected (disable or simplify when specified) | Animations ignore reduced-motion preference |
| Tokens | Spacing, type, color from tokens | Raw px, hex |
| Responsive | Mobile-first; 320px reflow; touch targets 24×24px min (WCAG 2.5.8), 44×48px preferred | Fixed width, horizontal scroll |
| Performance | Lazy loading for below-fold media; stable layout (no CLS) | No lazy load, layout shift |

---

## 3. Product Feature Card Component

**Prompt to paste (only this in chat):**

> Create a product feature card component. Use pn-frontend-design, pn-frontend-design-philosophy, and pn-design-system. Should support loading and empty states. Distinctive design.

**Pass criteria (evaluator only):**

| Criterion | Pass | Fail |
|----------|------|------|
| Typography | 3-layer mapping; utility layer for labels/metadata | Extra type roles or generic fonts |
| Tokens | All color, spacing, radius from design tokens | One-off values |
| States | Loading and empty designed as first-class states | No state handling |
| Semantic styling | Status/warning/CTA encoded visually per philosophy Section B | Flat, undifferentiated |
| Touch | 24×24px minimum (WCAG 2.5.8), 44×48px preferred; 8px spacing between | Below minimum |
| Reduced motion | prefers-reduced-motion respected for any transitions | Transitions ignore reduced-motion |
| Performance | Stable layout for loading/empty states (no CLS) | Layout shift during state changes |

---

## 4. Form with Validation

**Prompt to paste (only this in chat):**

> Build a contact form with validation. Use pn-frontend-design, pn-frontend-design-philosophy, and pn-ux-patterns. Show error and success states. Touch-friendly.

**Pass criteria (evaluator only):**

| Criterion | Pass | Fail |
|----------|------|------|
| State visibility | Error, success, loading visible; specific messages | Generic "Something went wrong" |
| Form flow | Validation on blur/submit; one round of errors; confirmation state | No feedback, silent failure |
| A11y | Labels, focus visible (2.4.11), contrast (WCAG 2.2); no zoom disabled | Missing labels, no :focus, user-scalable=no |
| Touch | 24×24px minimum (WCAG 2.5.8), 44×48px preferred; no hover-only | Tiny touch targets |
| Reduced motion | prefers-reduced-motion respected for validation feedback | Animations ignore reduced-motion |
| Typography | Utility layer for validation/status messages | Status buried in body |

---

## 5. Editorial Section with Scroll

**Prompt to paste (only this in chat):**

> Create an editorial section with scroll-triggered content. Use pn-frontend-design and pn-frontend-design-philosophy. Typography-led, minimal motion. Content understandable without motion.

**Pass criteria (evaluator only):**

| Criterion | Pass | Fail |
|----------|------|------|
| Typography | Carries structure; readable before motion | Hierarchy depends on animation |
| Motion | Tagged role (Reveal/Orient/Confirm/Delight); local when possible | Untagged, stacked effects |
| Reduced motion | Content understandable without motion | Key meaning only in animation |
| Layout | Repeatable vertical sections; spacing as hierarchy | Hand-styled one-offs |

---

## How to Use (evaluators)

1. **Run test:** New chat. Paste only the prompt. Do not mention criteria or this doc.
2. **Baseline (RED):** Run without/with current skills. Document output: fonts, colors, layout, states, motion.
3. **Edit skills** per plan.
4. **Re-run (GREEN):** Paste same prompt again. Score against pass criteria in this doc.
5. **Iterate** if any criterion fails.
6. **Checkpoints:** 1–2 after Phase 1; 1–3 after Phase 2; all after Phase 3 (per pn-writing-skills methodology).
