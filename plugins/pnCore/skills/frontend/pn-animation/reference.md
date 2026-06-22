# Animation — Code Patterns Reference

Full implementation examples for the animation skill. For decisions, role taxonomy, and anti-patterns, see [SKILL.md](SKILL.md).

---

## Motion tokens

```css
:root {
  /* Duration scale */
  --duration-instant:   80ms;
  --duration-fast:     150ms;
  --duration-normal:   250ms;
  --duration-slow:     400ms;
  --duration-cinematic: 700ms;

  /* Easing */
  --ease-out:    cubic-bezier(0.22, 1, 0.36, 1);     /* Standard exit/appear */
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);     /* Transitions between states */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* Playful overshoot */
  --ease-linear: linear;                               /* Progress bars, spinners */
}
```

---

## prefers-reduced-motion patterns

### GSAP: check before playing timelines

```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const tl = gsap.timeline({ paused: true });
tl.from('.hero-heading', { opacity: 0, y: 40, duration: 0.7, ease: 'power3.out' });

if (!prefersReduced) {
  tl.play();
} else {
  gsap.set('.hero-heading', { opacity: 1, y: 0 });
}

// Or wrap a utility:
export function playIfMotionAllowed(timeline) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timeline.progress(1).pause();
  } else {
    timeline.play();
  }
}
```

### Motion (React): use `useReducedMotion`

```tsx
import { motion, useReducedMotion } from 'motion/react';

function AnimatedCard({ children }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

---

## GSAP: timelines and scroll choreography

### Basic staggered reveal (Reveal role)

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap.from('.feature-card', {
  opacity: 0,
  y: 48,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.features-section',
    start: 'top 80%',
    once: true,
  },
});
```

### Timeline with scroll choreography (Reveal + Orient)

```js
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.story-section',
    start: 'top top',
    end: '+=200%',
    scrub: 1,
    pin: true,
  },
});

tl.from('.story-text', { opacity: 0, x: -60, duration: 1 })
  .from('.story-visual', { opacity: 0, scale: 0.9, duration: 1 }, '-=0.5')
  .to('.story-cta', { opacity: 1, y: 0, duration: 0.5 });
```

**Rules for scroll choreography:**
- One pinned scroll sequence per page — never stack two pins
- `once: true` for Reveal animations; `scrub` for cinematic/storytelling sequences
- Always test on mobile: `ScrollTrigger.normalizeScroll(true)` for iOS momentum scroll
- Never tie meaning only to scroll position — content must be readable without scrolling

### React: useGSAP hook (preferred over useEffect for GSAP in React)

```tsx
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

function HeroSection() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.from('.hero-heading', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' });
    gsap.from('.hero-subtext', { opacity: 0, y: 24, duration: 0.6, delay: 0.2, ease: 'power3.out' });
  }, { scope: container });

  return (
    <div ref={container}>
      <h1 className="hero-heading">...</h1>
      <p className="hero-subtext">...</p>
    </div>
  );
}
```

---

## Motion (React): declarative animations

### Staggered list reveal (Reveal role)

```tsx
import { motion } from 'motion/react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function FeatureList({ features }) {
  return (
    <motion.ul variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      {features.map((f) => (
        <motion.li key={f.id} variants={item}>{f.label}</motion.li>
      ))}
    </motion.ul>
  );
}
```

### Layout animation (Orient role)

```tsx
import { motion } from 'motion/react';

function TabBar({ tabs, activeTab, onSelect }) {
  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onSelect(tab.id)} style={{ position: 'relative' }}>
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--color-primary)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

### Micro-interaction on action (Confirm role)

```tsx
import { motion } from 'motion/react';

function SubmitButton({ isSuccess }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      animate={isSuccess ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {isSuccess ? 'Done ✓' : 'Submit'}
    </motion.button>
  );
}
```

### Page/route transitions (Orient role)

```tsx
import { motion, AnimatePresence } from 'motion/react';

function PageTransition({ children, pathname }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## CSS animations

### Fade-up reveal with scroll (Reveal role)

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.reveal {
  animation: fade-up 0.5s var(--ease-out) both;
  animation-play-state: paused;
}
.reveal.in-view { animation-play-state: running; }

@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
}
```

```js
const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in-view')),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
```

### Skeleton loading

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--color-surface-muted) 25%, var(--color-surface) 50%, var(--color-surface-muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s var(--ease-linear) infinite;
  border-radius: var(--radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--color-surface-muted); }
}
```
