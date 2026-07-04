---
name: pn-animation
description: "Motion philosophy and governance for web interfaces. Covers the motion role taxonomy (Reveal/Orient/Confirm/Delight), library selection guide, motion budgets by page mode, prefers-reduced-motion compliance, and motion map output format. Use when designing a motion system, auditing animations, or choosing libraries. For GSAP timeline API, ScrollTrigger, and plugins, load pn-gsap alongside this skill."
---

# Animation skill

## When to use

- Designing a motion system for a new project (motion tokens, duration scale, easing library).
- Auditing existing animations against the motion role taxonomy and `prefers-reduced-motion` requirements.
- Choosing between GSAP, Motion, and CSS for a given animation context.
- Implementing any intentional UI animation: staggered reveals, scroll-triggered sequences, hover effects, page/route transitions, micro-interactions, or loading/success states.

Every animation must carry a **motion role** (Reveal / Orient / Confirm / Delight). If it fits none, remove it. This is non-negotiable per pn-frontend-design-philosophy.

For full GSAP API — timelines, easing, ScrollTrigger, plugins, framework integrations, and video Frame Adapter — load **`pn-gsap`**. For CSS and Motion (React) code patterns, see [reference.md](reference.md).

## Library selection guide

| Context | Library | Why |
|---------|---------|-----|
| React declarative animation, layout transitions, gestures | **Motion** (Framer Motion successor) | Co-located with JSX; handles layout with `layout` prop; drag/gesture support |
| Timeline control, complex scroll sequences, staggered choreography, vanilla JS | **GSAP** + ScrollTrigger | Best-in-class timeline API; frame-accurate scroll-trigger; works without framework → see **pn-gsap** |
| Simple single-property transitions, hover states, focus states | **CSS transitions** | Zero JS overhead; browser-native; always prefer for simple cases |
| Looping illustrations, icon micro-animations | **CSS keyframes** or **Lottie** | CSS for geometric; Lottie for designer-authored complex illustration loops |
| React + complex scroll sequences | **GSAP inside useGSAP** | `useGSAP` hook handles React lifecycle and cleanup automatically → see **pn-gsap** |

**Install:**
```bash
npm install motion        # Motion (React)
npm install gsap          # GSAP (ScrollTrigger included)
npm install @gsap/react   # useGSAP hook
```

## Motion role taxonomy (required for every animation)

| Role | Purpose | Examples |
|------|---------|---------|
| **Reveal** | Bring content into view communicating hierarchy or sequence | Staggered card entrance, hero text fade-up, section appear on scroll |
| **Orient** | Tell the user where they are or where focus moved | Drawer sliding in from the right, active tab indicator sliding, breadcrumb transition |
| **Confirm** | Acknowledge a user action | Button press scale, form submit checkmark, toast appearance |
| **Delight** | Add personality without harming comprehension | Logo morph on hover, confetti on achievement, cursor trail on portfolio |

If an animation does not fit one of these roles, remove it.

## Motion tokens (define before implementing)

Define in your design system file (`tokens.css`, `globals.css`, or equivalent). See [reference.md](reference.md) for the full token block.

**Budget by page mode (per pn-frontend-design-philosophy):**

| Page mode | Max JS motion budget | Max stagger count | Scroll-trigger density |
|-----------|---------------------|-------------------|----------------------|
| Portfolio / Cinematic | High (GSAP OK) | 8–12 elements | 1 per section |
| Product / SaaS | Medium (Motion OK) | 4–6 elements | 1 per 2 sections |
| Tool / App | Low (CSS preferred) | 2–4 elements | Avoid |
| Catalog / E-commerce | Low (CSS preferred) | 2 elements | Avoid |

**Load choreography:** On primary marketing or landing views, default to **one** coordinated entrance (hero + primary nav or key sections) with staggered delays that reinforce hierarchy — rather than many small unrelated tweens. Tool surfaces may use only Orient/Confirm-level motion.

## prefers-reduced-motion (required)

**Always implement.** Applies to all CSS animations, GSAP timelines, and Motion components. See [reference.md](reference.md) for implementation patterns per library.

CSS baseline — required in globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

## Motion map output format

When producing a motion audit or motion plan, output a motion map:

```
Motion Map: [Page / Component Name]
Generated: YYYY-MM-DD

| Element          | Role    | Library | Trigger    | Duration | Reduced-motion fallback |
|------------------|---------|---------|------------|----------|------------------------|
| Hero heading     | Reveal  | GSAP    | page load  | 700ms    | opacity:1, y:0 (set)   |
| Feature cards    | Reveal  | GSAP    | scroll 80% | 600ms    | visible, no stagger     |
| Tab indicator    | Orient  | Motion  | click      | spring   | instant position switch |
| Form submit btn  | Confirm | Motion  | whileTap   | 300ms    | no scale change         |

Removed: Background parallax → no role
Stagger budget: 8 × 80ms = 640ms (within Portfolio budget)
```

## Anti-patterns

- **Never animate layout properties** (`width`, `height`, `top`, `left`) — use `transform` and `opacity` for GPU-composited animation
- **Never stack multiple motion channels** on one element (hover + scroll + cursor + parallax) — pick one
- **Never tie meaning to animation** — content must be fully readable without it
- **Never skip `prefers-reduced-motion`** — required for WCAG 2.2 SC 2.3.3
- **Never autoplay cinematic scroll effects on mobile** without testing on mid-range devices
- **Never use `will-change: transform` on every element** — only on elements that will definitely animate

## Example prompts

**Cold start:**
> Using `pn-animation`, design the motion system for my portfolio site. It's a cinematic page mode — I need a staggered hero entrance, scroll-triggered section reveals, and a tab indicator Orient animation.

**Warm start — audit existing animations:**
> Run `pn-animation` on my current landing page. Check every animated element has a motion role, the stagger count is within the Portfolio budget, and prefers-reduced-motion is handled.

**Format-specific:**
> Using `pn-animation`, output a motion map for the checkout flow. I want Reveal on entry, Confirm on submission, and nothing else.

**Iterate:**
> The hero entrance feels too slow — bring it from 900ms to 600ms and tighten the stagger from 100ms to 60ms.
> The card hover animation has no motion role — decide whether it's Delight or remove it.

## Integration

- **pn-gsap** — Full GSAP timeline API, ScrollTrigger, plugins, `useGSAP`, perf, and Frame Adapter for video. Load whenever GSAP-specific implementation is needed.
- **Used by:** pn-frontend-design (motion section), pn-writing-plans (motion task in plans), pn-design (step 5 build)
- **Governed by:** pn-frontend-design-philosophy (motion role taxonomy, motion governance rules, Phase 4 Motion Audit)
- **Token source:** pn-design-system (`--duration-*`, `--ease-*` tokens)
- **Accessibility:** pn-ux-patterns (WCAG 2.2 motion rules, focus management during transitions)

## Sources

- GSAP — https://gsap.com/docs/v3/ (full API → see pn-gsap)
- Motion (Framer Motion successor) — https://motion.dev/docs/react-quick-start
- WCAG 2.2 SC 2.3.3 — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- MDN prefers-reduced-motion — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
