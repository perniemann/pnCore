# Responsive Design

## Mobile-First Strategy

Write base styles for the smallest screen, then add complexity with `min-width` media queries. This approach:
- Forces prioritization of what truly matters on mobile
- Avoids overriding complex desktop styles on mobile (more efficient)
- Naturally progressive-enhances toward capability

```css
/* Wrong — desktop-first, then undoing */
.nav { display: flex; gap: 24px; }
@media (max-width: 768px) { .nav { flex-direction: column; gap: 0; } }

/* Right — mobile-first, then enhancing */
.nav { display: flex; flex-direction: column; gap: 0; }
@media (min-width: 768px) { .nav { flex-direction: row; gap: 24px; } }
```

**Standard breakpoints** (adjust to your content, not device names):

```css
/* Content-first breakpoints — where your content breaks, not where devices are */
@media (min-width: 480px)  { /* Small phones landscape */ }
@media (min-width: 640px)  { /* Large phones */           }
@media (min-width: 768px)  { /* Tablets portrait */       }
@media (min-width: 1024px) { /* Tablets landscape / small laptop */ }
@media (min-width: 1280px) { /* Desktop */                }
@media (min-width: 1536px) { /* Wide desktop */           }
```

## Container Queries

Media queries respond to the viewport. Container queries respond to the container's size. For reusable components, container queries are almost always the right choice.

```css
/* 1. Establish containment on the wrapper, not the component */
.sidebar      { container-type: inline-size; container-name: sidebar; }
.main-content { container-type: inline-size; container-name: main; }

/* 2. Component responds to its container */
.card { padding: var(--space-4); }
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    padding: var(--space-6);
  }
}

/* 3. Same component adapts to different containers */
/* In sidebar (narrow): stacked layout */
/* In main content (wide): horizontal layout */
/* Same CSS, different rendering based on container width */
```

**Container query decision guide:**
- **Use container queries:** Card components, widget panels, any component that appears in multiple layout contexts
- **Use media queries:** Page-level layout changes, navigation mode changes (top nav → hamburger), font size breakpoints for reading columns

## Fluid Design with clamp()

`clamp(minimum, preferred, maximum)` lets values scale smoothly between a min and max.

```css
/* Fluid spacing — scales with viewport */
.section {
  padding-block: clamp(3rem, 8vw, 8rem);    /* 48px → 128px */
  padding-inline: clamp(1rem, 5vw, 4rem);   /* 16px → 64px */
}

/* Fluid type scale — for headings on content pages */
h1 { font-size: clamp(2rem, 5vw + 1rem, 4.5rem); }
h2 { font-size: clamp(1.5rem, 3vw + 0.75rem, 3rem); }

/* Fluid grid gap */
.grid { gap: clamp(1rem, 3vw, 2.5rem); }
```

**The preferred value formula for fluid type:**
`clamp(min, Xvw + Yrem, max)` where:
- `X` = scaling aggressiveness (higher = faster growth)
- `Y` = minimum offset (prevents collapsing to 0)

Use [utopia.fyi](https://utopia.fyi/) to generate correct fluid type and space scales.

## The "Adapt, Don't Amputate" Principle

Never hide critical functionality on mobile. If it matters on desktop, it matters on mobile — just in a different form.

| Desktop | Mobile Adaptation |
|---|---|
| Horizontal top navigation | Hamburger menu with full-screen drawer |
| Data table with 10 columns | Priority columns visible, expandable row for rest |
| Sidebar filter panel | Bottom sheet / drawer filters |
| Hover tooltips | Tap to reveal, or inline explanation |
| Multi-column form | Single-column stacked form |
| Side-by-side comparison | Swipeable cards or tabbed view |

```css
/* Tables: show priority columns, hide secondary */
.table-col-secondary { display: none; }
@media (min-width: 768px) { .table-col-secondary { display: table-cell; } }

/* Alternative: scrollable table with sticky first column */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.table td:first-child {
  position: sticky;
  left: 0;
  background: var(--color-surface);
  z-index: 1;
}
```

## Touch-First Interaction

Designing for touch means designing for imprecision. Fingers are not pixel-perfect pointers.

```css
/* Minimum touch targets */
.button, .link, .nav-item {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.25rem;  /* generous padding, not just the text */
}

/* Extra space for coarse pointers (touch screens) */
@media (pointer: coarse) {
  .nav-item { padding: 1rem 1.5rem; }
  .icon-button { padding: 0.875rem; }
}

/* Increase tap target without affecting visual layout */
.small-link {
  position: relative;
}
.small-link::after {
  content: '';
  position: absolute;
  inset: -8px;  /* extends tap area 8px in all directions */
}
```

**Touch interaction rules:**
- No hover-only for critical actions — always a tap/click alternative
- Swipe gestures need visible affordance (swipe hint, drag handle) — gestures are invisible
- Pinch/zoom must never be disabled
- Minimum 8px gap between adjacent tap targets to prevent mis-taps

## Responsive Images

```html
<!-- Art direction: different crop on mobile vs desktop -->
<picture>
  <source media="(min-width: 768px)" srcset="hero-wide.webp">
  <source media="(max-width: 767px)" srcset="hero-square.webp">
  <img src="hero-wide.webp" alt="Product hero" loading="lazy">
</picture>

<!-- Resolution switching: same image, different sizes -->
<img
  src="card.webp"
  srcset="card-400.webp 400w, card-800.webp 800w, card-1200.webp 1200w"
  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
  alt="Card image"
  loading="lazy"
  decoding="async"
>
```

## Viewport Units

```css
/* dvh (dynamic viewport height) — accounts for mobile browser chrome */
.full-height { height: 100dvh; }   /* NOT 100vh — that breaks on mobile */

/* svh (small viewport height) — conservative, always visible area */
.hero-min { min-height: 100svh; }

/* lvh (large viewport height) — assumes no browser chrome */
.modal-backdrop { height: 100lvh; }

/* cqw/cqh — container query units */
.card-image { height: 30cqw; }  /* 30% of container width */
```

---

**Avoid:** Desktop-first CSS that gets undone for mobile. Viewport-based media queries for component-level responsiveness. `100vh` for full-screen sections on mobile. Disabling zoom. Hover-only critical interactions. Hiding important features on mobile instead of adapting them.
