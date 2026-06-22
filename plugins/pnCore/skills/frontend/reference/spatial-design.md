# Spatial Design

## Visual Rhythm

Rhythm in spatial design works like music — it's about contrast between tight and loose, not a single repeating beat. Using the same padding everywhere is the equivalent of playing one note on loop.

**Base unit system:** Pick a base unit (4px or 8px) and use only multiples. This creates the subconscious harmony that makes layouts feel "right" without you knowing why.

```css
:root {
  --space-1:  0.25rem;   /*  4px */
  --space-2:  0.5rem;    /*  8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-24: 6rem;      /* 96px */
  --space-32: 8rem;      /* 128px */
}
```

**Rhythm in practice:**
- Tight groupings (4–8px) signal "these things belong together"
- Medium spacing (16–32px) separates components within a section
- Generous spacing (48–96px) separates sections or creates breathing room
- Very large spacing (96px+) creates dramatic visual pause — use for hero sections, section dividers

**Never use the same padding for everything.** A card with equal 24px on all sides and a section with equal 24px on all sides makes everything feel like the same "unit" — no hierarchy, no rhythm.

## Layout Principles

### Asymmetry Creates Visual Interest

Symmetric center-heavy layouts feel safe and forgettable. Asymmetry creates tension, movement, and memorability.

```css
/* Safe (boring) — centered, symmetric */
.hero { display: flex; align-items: center; justify-content: center; }

/* More interesting — offset composition */
.hero {
  display: grid;
  grid-template-columns: 3fr 2fr;  /* 60/40 split */
  align-items: center;
  gap: var(--space-16);
}
```

**Asymmetry techniques:**
- Off-center text with visual on one side (60/40 is more dynamic than 50/50)
- Overlapping elements across grid boundaries (negative margins, absolute positioned accents)
- Varying section padding to create movement (large top padding, tight bottom, or vice versa)
- Left-aligned content in a wide container (don't center everything)

### The Grid Is a Starting Point, Not a Prison

Breaking the grid intentionally creates emphasis. Elements that escape the grid draw the eye.

```css
/* Bleed image past the grid boundary */
.feature-image {
  margin-right: calc(-1 * var(--space-16));  /* bleeds right */
  border-radius: 8px 0 0 8px;
}

/* Pull quote that breaks the column */
.pull-quote {
  margin: 0 calc(-1 * var(--space-8));
  padding: var(--space-8);
  border-left: 4px solid var(--color-primary);
}
```

## CSS Grid Patterns

### Responsive Auto-Grid (No Media Queries)

```css
/* Auto-fills columns — each minimum 280px, maximum 1fr */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: var(--space-6);
}
```

### Named Areas for Complex Layouts

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}
```

### Subgrid for Aligned Cards

```css
/* Parent establishes 3-row track for cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-template-rows: auto;
}

/* Child cards align their internal rows to the parent grid */
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;  /* header / body / footer aligned across cards */
}
```

## Container Queries

Container queries enable component-level responsiveness — the component responds to its container's size, not the viewport. This is more composable than media queries for shared components.

```css
/* 1. Establish a containment context */
.card-wrapper { container-type: inline-size; container-name: card; }

/* 2. Respond to container size */
@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
  .card__image { aspect-ratio: 1; }
}

@container card (max-width: 399px) {
  .card { flex-direction: column; }
  .card__image { aspect-ratio: 16/9; }
}
```

**When to use container queries vs media queries:**
- **Container queries:** Reusable components (cards, widgets) that appear in sidebars, main content, and grids
- **Media queries:** Page-level layout changes, navigation patterns, font size breakpoints

## Spacing Anti-Patterns

### Identical Card Grids

Every card the same size, same padding, same icon-heading-text structure, repeated in a uniform grid. This is the most common "AI made this" layout.

**Fix:** Vary card sizes (featured card spanning 2 columns), alternate image/text layouts, use editorial rhythm (large + small + medium), or choose a different pattern entirely.

### Centering Everything

Left-aligned text with asymmetric layouts feels designed. Centered everything feels like a template.

**Fix:** Left-align body text. Reserve center alignment for short headlines, CTAs, and hero text where centering serves a purpose (emphasis, balance).

### Same Spacing Everywhere

When every element has `padding: 24px` and every section has `gap: 24px`, there's no hierarchy — everything feels like the same "distance" from everything else.

**Fix:** Use tight spacing (4–8px) within components, medium spacing (16–24px) between elements in a component, generous spacing (48–96px) between sections.

### The Hero Metric Layout

Big number, small label underneath, 3–4 supporting stats in a row, often with a colored accent or gradient. This pattern is so overused it's become invisible.

**Fix:** Humanize the data (tell a story with it), use editorial visualization, or present the number in the context of time/comparison rather than isolated.

### Cards Nested in Cards

Visual noise. Card inside a card inside a section with a card background. Flatten the hierarchy — every nesting level costs visual attention.

**Fix:** Use elevation tokens (surface-1 through surface-3) instead. Content inside a card should use the next surface level, not another card container.

## Negative Space

Negative space is not wasted space — it is a design element. Generous negative space creates:
- Focus (less competition for attention)
- Premium perception (luxury brands use space aggressively)
- Readability (text needs room to breathe)

**Deliberate emptiness:** Place key elements in the middle of generous whitespace to make them feel important. A headline with 120px above it reads as more important than the same headline with 32px.

---

**Avoid:** Identical spacing everywhere. Centering all text. Filling every pixel. Using margin instead of gap for flex/grid children. Grid layouts where every cell is the same size and content pattern.
