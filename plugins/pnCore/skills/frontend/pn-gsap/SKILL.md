---
name: pn-gsap
description: Deep GSAP API reference — timelines, easing, ScrollTrigger, plugins (SplitText, Flip, DrawSVG, MorphSVG, MotionPath), framework integrations (React useGSAP, Vue, Svelte), and performance patterns. Use when implementing GSAP-powered animations; load alongside pn-animation for motion role taxonomy and budgets.
---

# GSAP deep API

## When to use

- Writing or debugging GSAP timelines, tweens, or ScrollTrigger sequences.
- Choosing the right plugin (SplitText, Flip, DrawSVG, MorphSVG, MotionPath, etc.).
- Integrating GSAP inside a framework (React / Vue / Svelte) correctly.
- Recording GSAP animations deterministically as video via a Frame Adapter (see `pn-html-to-video`).
- Auditing performance: GPU compositing, `will-change` usage, ticker frequency.

For **motion role taxonomy** (Reveal / Orient / Confirm / Delight), motion budgets, and `prefers-reduced-motion` requirements, load `pn-animation` alongside this skill.

## Install

```bash
npm install gsap            # core + all free plugins (ScrollTrigger, Draggable, Observer, etc.)
npm install @gsap/react     # useGSAP hook for React
```

Club plugins (SplitText, Flip, DrawSVG, MorphSVG, MotionPath, ScrambleText, GSDevTools) require a GSAP Club or Business licence. Import from the `gsap/dist/` bundle or from the npm-authenticated `@gsap/` scoped package.

## Core API

### Tween

```js
import { gsap } from 'gsap';

// from — animate from these values to current
gsap.from('.hero', { opacity: 0, y: 40, duration: 0.7, ease: 'power3.out' });

// to — animate from current to these values
gsap.to('.card', { scale: 1.04, duration: 0.2, ease: 'power2.out' });

// fromTo — explicit start and end (frame-accurate; preferred in video adapters)
gsap.fromTo('.title',
  { opacity: 0, y: 32 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
);

// set — instant (no duration); use for initial state before timeline plays
gsap.set('.nav', { opacity: 0, y: -16 });
```

### Timeline

```js
const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.6 } });

tl.from('.hero-heading', { opacity: 0, y: 40 })
  .from('.hero-sub',     { opacity: 0, y: 24 }, '-=0.4')  // 0.4s overlap
  .from('.hero-cta',     { opacity: 0, scale: 0.9 }, '-=0.3')
  .from('.hero-image',   { opacity: 0, x: 60 }, '<');       // same start as previous

// Label-based positioning
tl.addLabel('features', 2)
  .from('.feature-card', { opacity: 0, y: 32, stagger: 0.1 }, 'features');

// Repeat and yoyo
const loop = gsap.timeline({ repeat: -1, yoyo: true });
loop.to('.pulse-dot', { scale: 1.3, duration: 0.8, ease: 'sine.inOut' });
```

**Position parameter cheat-sheet:**

| Value | Meaning |
|-------|---------|
| `"+=0.2"` | 0.2s after previous ends |
| `"-=0.4"` | 0.4s before previous ends (overlap) |
| `"<"` | Same start time as previous |
| `"<0.2"` | 0.2s after previous starts |
| `2.5` | Absolute 2.5s from timeline start |
| `"myLabel"` | At named label |

## Easing

```js
// Standard library
'none' / 'linear'
'power1.out' / 'power2.out' / 'power3.out' / 'power4.out'   // decelerating (most common)
'power1.in'  / 'power2.in'  / 'power3.in'  / 'power4.in'    // accelerating
'power1.inOut' ... 'power4.inOut'                              // symmetric
'sine.out' / 'sine.inOut'                                      // gentle sinusoidal
'expo.out' / 'expo.in'                                         // aggressive deceleration / acceleration
'elastic.out(1, 0.3)'                                          // spring-like overshoot
'back.out(1.7)'                                                // slight overshoot
'bounce.out'                                                   // bouncing landing
'steps(8)'                                                     // staircase (pixel art, ticker)

// Custom cubic-bezier (import from design tokens)
CustomEase.create('easeOutStrong', '0.22, 1, 0.36, 1');
```

## ScrollTrigger

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Reveal on scroll (once:true = plays once and stays)
gsap.from('.section-heading', {
  opacity: 0,
  y: 48,
  duration: 0.7,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.section-heading',
    start: 'top 85%',
    once: true,
  },
});

// Scrub (timeline tied to scroll position)
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.story',
    start: 'top top',
    end: '+=150%',
    scrub: 1,     // 1s lag smoothing; use true for instant
    pin: true,    // pins .story for the scroll distance
  },
});
tl.from('.story-text',   { opacity: 0, x: -60 })
  .from('.story-visual', { opacity: 0, x:  60 }, '<');

// Batch — stagger reveals without individual triggers per element
ScrollTrigger.batch('.card', {
  onEnter: (elements) => gsap.from(elements, {
    opacity: 0, y: 32, stagger: 0.08, duration: 0.6, ease: 'power3.out',
  }),
  once: true,
  start: 'top 88%',
});
```

**ScrollTrigger rules:**
- One pinned sequence per page — stacked pins fight each other.
- Always call `ScrollTrigger.refresh()` after layout changes (e.g. images load, accordion opens).
- Mobile: `ScrollTrigger.normalizeScroll(true)` to smooth iOS momentum scroll.
- Destroy on unmount in frameworks: `ScrollTrigger.getAll().forEach(t => t.kill())` or the scope cleanup from `useGSAP`.
- Never pin inside a flex/grid child without fixing its height — GSAP needs a measurable container.

## Key plugins

### SplitText (Club)

```js
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

const split = SplitText.create('.hero-heading', { type: 'words,chars' });

gsap.from(split.chars, {
  opacity: 0,
  y: 24,
  rotateX: -20,
  stagger: 0.03,
  duration: 0.5,
  ease: 'power3.out',
  onComplete: () => split.revert(),  // restore original DOM after animation
});
```

### Flip (free)

```js
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);

// Capture state before DOM change, then animate to new layout
const state = Flip.getState('.card');
// ... move .card to new container / reorder list ...
Flip.from(state, { duration: 0.5, ease: 'power2.inOut', stagger: 0.05 });
```

### DrawSVG (Club)

```js
import { DrawSVG } from 'gsap/DrawSVG';
gsap.registerPlugin(DrawSVG);

gsap.from('path#line', { drawSVG: '0%', duration: 1.2, ease: 'power2.inOut' });
```

### MotionPath (free)

```js
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.avatar', {
  motionPath: { path: '#track', align: '#track', autoRotate: true },
  duration: 4,
  ease: 'none',
});
```

## Framework integrations

### React — useGSAP (preferred)

```tsx
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function HeroSection() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline();
    tl.from('.hero-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' })
      .from('.hero-sub',     { opacity: 0, y: 24, duration: 0.6 }, '-=0.4');
  }, { scope: container });  // scopes selectors to this container; auto-kills on unmount

  return (
    <div ref={container} className="hero">
      <h1 className="hero-heading">...</h1>
      <p className="hero-sub">...</p>
    </div>
  );
}
```

`useGSAP` vs `useEffect` for GSAP:
- `useGSAP` auto-reverts all tweens and kills ScrollTriggers on unmount — use it.
- `useEffect` requires manual `return () => ctx.revert()` — error-prone.

### Vue — onMounted + onUnmounted

```ts
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';

const container = ref<HTMLElement | null>(null);
let ctx: gsap.Context;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.hero-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' });
  }, container.value!);
});

onUnmounted(() => ctx.revert());
```

### Svelte — use:action

```ts
import { gsap } from 'gsap';

function gsapReveal(node: HTMLElement) {
  const ctx = gsap.context(() => {
    gsap.from(node, { opacity: 0, y: 32, duration: 0.6, ease: 'power3.out' });
  });
  return { destroy: () => ctx.revert() };
}
```

```svelte
<div use:gsapReveal>...</div>
```

## Frame Adapter for video recording

When using GSAP inside `pn-html-to-video`, the capture engine calls `seekTo(t)` to advance the timeline deterministically:

```js
// gsap-adapter.js — wire into Hyperframes or custom Puppeteer capture
export function createGsapAdapter() {
  const master = gsap.globalTimeline;
  master.pause();

  return {
    seekTo(timeSeconds) {
      master.time(timeSeconds, true);   // true = suppress callbacks during seek
    },
    isReady() {
      return document.fonts.status === 'loaded' &&
             document.readyState === 'complete';
    },
  };
}
```

`gsap.globalTimeline.time(t, true)` is the canonical seek method. Never use `requestAnimationFrame` for frame-accurate video capture.

## Performance

- Animate only **`transform`** and **`opacity`** — GPU-composited, no layout recalc.
- `will-change: transform` only on elements that **will** animate; do not apply globally.
- `gsap.killTweensOf(el)` before re-triggering to avoid tween stacking on rapid interactions.
- `gsap.ticker.fps(30)` lowers ticker rate for low-priority background animations.
- In React, `gsap.context()` (via `useGSAP`) prevents memory leaks from orphaned tweens after unmount.
- For large stagger sets (50+ elements), `ScrollTrigger.batch` outperforms individual `scrollTrigger` instances.

## Anti-patterns

- Never animate `width`, `height`, `top`, `left` — use `transform` + `opacity`.
- Never nest `useGSAP` — one hook per component scope.
- Never target elements outside the `useGSAP` scope container — it breaks cleanup.
- Never skip `gsap.registerPlugin()` — plugins silently no-op without it.
- Never leave `will-change: transform` on static elements after animation completes; remove it.

## Integration

- **pn-animation** — Motion role taxonomy (Reveal / Orient / Confirm / Delight), motion budgets, prefers-reduced-motion policy. Load alongside this skill.
- **pn-html-to-video** — Frame Adapter wiring for deterministic video recording.
- **pn-frontend-design-philosophy** — Phase 4 Motion Audit that governs GSAP usage budget per page mode.

## Sources

- GSAP Docs — https://gsap.com/docs/v3/
- GSAP ScrollTrigger — https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- useGSAP (React) — https://gsap.com/docs/v3/Packages/gsap-react/
- GSAP Easing Visualizer — https://gsap.com/docs/v3/Eases/
