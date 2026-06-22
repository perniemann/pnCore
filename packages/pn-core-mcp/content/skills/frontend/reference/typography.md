# Typography

## Classic Typography Principles

### Vertical Rhythm

Your line-height should be the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. This creates subconscious harmony — text and space share a mathematical foundation.

### Modular Scale & Hierarchy

The common mistake: too many font sizes that are too close together (14px, 15px, 16px, 18px...). This creates muddy hierarchy.

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Typical Size | Use |
|---|---|---|
| xs | 0.75rem | Captions, legal, metadata |
| sm | 0.875rem | Secondary UI, labels |
| base | 1rem | Body text |
| lg | 1.25–1.5rem | Subheadings, lead text |
| xl+ | 2–4rem | Headlines, hero text |

**Scale ratios** — pick one and commit:
- **1.25** (major third) — compact, information-dense UIs
- **1.333** (perfect fourth) — balanced, works for most products
- **1.5** (perfect fifth) — editorial, high contrast hierarchy

### Readability

- Use `ch` units for measure: `max-width: 65ch` for body text
- Line-height scales inversely with line length — narrow columns need tighter leading, wide columns need more breathing room
- **Non-obvious:** Increase line-height slightly for light text on dark backgrounds. The perceived weight is lighter, so text needs more air. Add 0.05–0.1 to your normal line-height in dark mode.
- Minimum 16px for body text. Smaller strains eyes and fails WCAG on mobile.

## Font Selection & Pairing

### Avoid the Invisible Defaults

These fonts signal "default AI output" or "I didn't make a choice":

| Overused | Better Alternatives |
|---|---|
| Inter | Instrument Sans, Plus Jakarta Sans, Outfit |
| Roboto | Onest, Figtree, Urbanist |
| Open Sans | Source Sans 3, Nunito Sans, DM Sans |
| Geist | Geist is fine for tools/dashboards — not for distinctive design |
| Space Grotesk | Used everywhere for "tech" — try Syne, Cabinet Grotesk, Clash Display |
| Montserrat | Too generic — try Raleway, Cormorant, Fraunces for premium feel |

**For editorial/premium feel:** Fraunces, Newsreader, Lora, Playfair Display

**System fonts are underrated:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Right choice for apps where performance > personality.

### Pairing Principles

**The non-obvious truth:** You often don't need a second font. One well-chosen family in multiple weights creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast — e.g., display headlines + body serif.

When pairing, contrast on multiple axes:
- Serif + Sans (structural contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs). They create visual tension without clear hierarchy.

**Proven pairings:**
- Syne (display) + DM Sans (body) — bold tech/creative
- Cormorant (display) + Jost (body) — luxury editorial
- Fraunces (display) + Source Sans 3 (body) — editorial warmth
- Libre Baskerville (display) + Source Sans 3 (body) — classic editorial
- Cabinet Grotesk (display) + Satoshi (body) — contemporary product

## Web Font Loading

Layout shift from late-loading fonts is one of the most common CLS culprits.

```css
/* 1. Use font-display: swap for visibility; optional for non-critical */
@font-face {
  font-family: 'DisplayFont';
  src: url('/fonts/display.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 900;  /* variable font range */
}

/* 2. Match fallback metrics to minimize layout shift */
@font-face {
  font-family: 'DisplayFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;        /* scale to match x-height */
  ascent-override: 90%;     /* match ascender height */
  descent-override: 20%;    /* match descender depth */
  line-gap-override: 10%;   /* match line spacing */
}

body {
  font-family: 'DisplayFont', 'DisplayFont-Fallback', sans-serif;
}
```

**Preload critical fonts** (above-the-fold text only — preloading everything hurts performance):
```html
<link rel="preload" href="/fonts/body.woff2" as="font" type="font/woff2" crossorigin>
```

**Size-adjust calculation:** Use [Fontaine](https://github.com/unjs/fontaine) to calculate override values automatically. Next.js `next/font` handles this transparently when you use `display: 'swap'`.

## Fluid Type

Fluid typography via `clamp(min, preferred, max)` scales text smoothly with the viewport.

```css
/* Fluid heading: scales from 28px at 320px viewport to 56px at 1440px */
h1 { font-size: clamp(1.75rem, 3.5vw + 1rem, 3.5rem); }
h2 { font-size: clamp(1.375rem, 2.5vw + 0.75rem, 2.25rem); }

/* The vw coefficient controls scaling rate. Higher vw = faster scale. */
/* The rem offset prevents collapsing to 0 on small viewports. */
```

### When to Use Fluid Type vs Fixed rem Scales

| Context | Recommendation | Why |
|---|---|---|
| Marketing / content pages where text dominates | **Fluid `clamp()`** | Text needs to breathe at all viewport sizes |
| App UI, dashboards, data-dense interfaces | **Fixed rem scale** | Predictable spatial grid matters more than breathing room |
| Body text (either context) | **Fixed rem** | Difference across viewports is too small to justify it |

No major app design system (Material, Polaris, Primer, Carbon) uses fluid type in product UI.

## Modern CSS Typography Features

### OpenType Features

Most developers don't know these exist. Use them for polish:

```css
/* Tabular numbers — essential for data tables, prevents width jumping */
.data-table td { font-variant-numeric: tabular-nums; }
.price          { font-variant-numeric: tabular-nums; }

/* Proper fractions — renders "1/2" as a real fraction */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* Small caps for abbreviations */
abbr { font-variant-caps: all-small-caps; letter-spacing: 0.05em; }

/* Disable ligatures in code */
code { font-variant-ligatures: none; }

/* Contextual alternates — many fonts have these */
.logo-text { font-variant-alternates: stylistic(alt-a); }
```

Check what features your font supports at [Wakamai Fondue](https://wakamaifondue.com/).

### Variable Fonts

```css
/* Animate font weight on hover — smooth, performant */
.nav-link {
  font-weight: 400;
  transition: font-weight 200ms ease;
}
.nav-link:hover { font-weight: 600; }

/* Full axis control for variable fonts */
.display-heading {
  font-variation-settings:
    'wght' 750,
    'wdth' 95,
    'opsz' 48;   /* optical size axis — larger opsz = tighter spacing for display */
}
```

## Typography System Architecture

Name tokens semantically, not by value:

```css
/* Wrong — describes value, not purpose */
--font-size-16: 1rem;
--font-size-24: 1.5rem;

/* Right — describes purpose */
--text-body: 1rem / 1.6;             /* shorthand: size / line-height */
--text-body-sm: 0.875rem / 1.5;
--text-heading-lg: clamp(1.75rem, 3vw + 1rem, 3rem) / 1.1;
--text-label: 0.75rem / 1.4;

/* Include everything in the token */
:root {
  --font-display: 'Syne', 'Syne-Fallback', sans-serif;
  --font-body: 'DM Sans', 'DM-Sans-Fallback', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', monospace;
}
```

## Accessibility

- **Never disable zoom:** `user-scalable=no` or `maximum-scale=1` breaks accessibility. Fix the layout instead.
- **Always rem/em for font sizes:** Respects user browser font size preferences. Never `px` for body text.
- **Adequate touch targets:** Text links need padding or line-height creating at least 44px tap height.
- **Line length for readability:** 45–75 characters for body text (`max-width: 65ch`). Never let body text span a full wide-screen layout.

---

**Avoid:** More than 2–3 font families per project. Skipping fallback font definitions. Ignoring font loading performance (FOUT/FOIT). Using decorative fonts for body text. Monospace fonts as shorthand for "developer/technical" personality.
