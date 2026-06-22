# Color & Contrast

## Color Spaces: Use OKLCH

**Stop using HSL.** Use OKLCH (or LCH) instead. It's perceptually uniform — equal steps in lightness *look* equal. In HSL, 50% lightness in yellow looks bright while 50% in blue looks dark. OKLCH fixes this.

```css
/* OKLCH: lightness (0-100%), chroma (0-0.4+), hue (0-360) */
--color-primary:       oklch(60% 0.15 250);      /* Blue */
--color-primary-light: oklch(85% 0.08 250);      /* Same hue, lighter — reduce chroma at extremes */
--color-primary-dark:  oklch(35% 0.12 250);      /* Same hue, darker */
```

**Key rule:** As you move toward white or black, reduce chroma. High chroma at extreme lightness looks garish. A light blue at 85% lightness needs ~0.08 chroma, not 0.15.

**color-mix() for variants:**

```css
/* Mix with transparent for alpha-safe tinting */
--color-primary-subtle: color-mix(in oklch, var(--color-primary) 15%, transparent);

/* light-dark() for automatic theme switching */
--color-surface: light-dark(oklch(98% 0.005 250), oklch(14% 0.01 250));
```

## Tinted Neutrals

**Pure gray is dead.** Add a subtle hint of your brand hue to all neutrals. The chroma is tiny (0.005–0.01) but perceptible — it creates subconscious cohesion between your brand color and your UI.

```css
/* Dead grays — no personality */
--gray-100: oklch(95% 0 0);
--gray-900: oklch(15% 0 0);

/* Warm-tinted grays (earthy, inviting) */
--gray-100: oklch(95% 0.01 60);
--gray-900: oklch(15% 0.01 60);

/* Cool-tinted grays (tech, professional) */
--gray-100: oklch(95% 0.01 250);
--gray-900: oklch(15% 0.01 250);

/* Brand-tinted grays — match your primary hue */
--gray-100: oklch(95% 0.008 var(--brand-hue));
--gray-900: oklch(15% 0.008 var(--brand-hue));
```

**Never use pure black (`#000`) or pure white (`#fff`).** Always tint. Pure black/white don't exist in nature — real shadows always have a color cast.

## Building Functional Palettes

### Palette Structure

A complete system needs:

| Role | Purpose | Shades |
|------|---------|--------|
| **Primary** | Brand, CTAs, key actions | 1 color, 3–5 shades |
| **Neutral** | Text, backgrounds, borders | 9–11 shade scale |
| **Semantic** | Success, error, warning, info | 4 colors, 2–3 shades each |
| **Surface** | Cards, modals, overlays | 2–3 elevation levels |

Skip secondary/tertiary unless you need them. Most apps work with one accent. Adding more creates decision fatigue and visual noise.

### The 60-30-10 Rule (Applied Correctly)

This is about **visual weight**, not pixel count:

- **60%**: Neutral backgrounds, white space, base surfaces
- **30%**: Secondary — text, borders, inactive states
- **10%**: Accent — CTAs, highlights, focus states

**The common mistake:** Using the accent color everywhere because it's "the brand color." Accent colors work *because* they're rare. Overuse kills their power.

### Token Hierarchy

Two layers — only the semantic layer changes per theme:

```css
/* Primitive tokens — never use directly in components */
--blue-500: oklch(60% 0.15 250);
--blue-200: oklch(85% 0.08 250);

/* Semantic tokens — what components reference */
:root {
  --color-primary: var(--blue-500);
  --color-primary-muted: var(--blue-200);
  --color-text: oklch(15% 0.01 250);
  --color-surface: oklch(98% 0.005 250);
}

[data-theme="dark"] {
  --color-primary: oklch(68% 0.13 250);   /* slightly lighter in dark mode */
  --color-text: oklch(92% 0.01 250);
  --color-surface: oklch(14% 0.01 250);
}
```

## Contrast & Accessibility

### WCAG Contrast Requirements

| Content Type | AA Minimum | AAA Target |
|---|---|---|
| Body text (< 18px, not bold) | 4.5:1 | 7:1 |
| Large text (≥ 18px, or ≥ 14px bold) | 3:1 | 4.5:1 |
| UI components, icons, borders | 3:1 | 4.5:1 |
| Placeholder text | 4.5:1 | — |
| Non-essential decoration | none | — |

**Gotcha:** Placeholder text still needs 4.5:1. The light gray placeholder you see everywhere? Usually fails WCAG.

**Gotcha:** Disabled states are exempt from contrast requirements, but grayed-out disabled controls that look interactive and confusing are a UX failure regardless.

### Dangerous Color Combinations

These commonly fail contrast or cause readability issues:

| Combination | Problem |
|---|---|
| Light gray text on white | #1 accessibility failure |
| **Gray text on any colored background** | Looks washed out and dead — use a shade of the background color instead |
| Red on green (or vice versa) | 8% of men can't distinguish these |
| Blue on red | Vibrates visually |
| Yellow on white | Almost always fails WCAG |
| Thin light text on images | Unpredictable contrast — use a scrim or text shadow |
| Pure black text on pure white | Too harsh — use dark tinted neutral instead |

**The gray-on-color rule is critical:** Never use a gray from your neutral scale on a colored surface. Generate a dedicated text color for each surface by darkening the surface hue at high chroma, or use a near-white tinted with the surface hue.

```css
/* Wrong — gray text on colored card */
.card-blue { background: oklch(85% 0.10 250); color: oklch(40% 0 0); }

/* Right — dark shade of the card hue */
.card-blue { background: oklch(85% 0.10 250); color: oklch(20% 0.08 250); }
```

### The AI Color Palette — Avoid

These combinations signal "AI made this":

- Cyan accent on near-black background
- Purple-to-blue gradients on white
- Neon accent colors (electric green, hot pink) on dark backgrounds
- Gradient text on headings (gradient text is decorative, not meaningful)
- Glowing colored borders on glass cards

## Dark Mode Architecture

### Dark Mode Is Not Inverted Light Mode

You cannot simply swap colors. Dark mode requires different design decisions:

| | Light Mode | Dark Mode |
|---|---|---|
| **Depth** | Shadows create elevation | Lighter surfaces create elevation (no shadows) |
| **Text** | Dark text on light | Light text on dark — reduce font weight slightly |
| **Accents** | Vibrant | Desaturate by ~0.02 chroma |
| **Backgrounds** | White/light gray | Never pure black — use dark gray (oklch 12–18%) |

```css
:root[data-theme="dark"] {
  /* Surface depth via lightness levels, not shadows */
  --surface-base:    oklch(14% 0.01 250);
  --surface-raised:  oklch(18% 0.01 250);
  --surface-overlay: oklch(22% 0.01 250);

  /* Reduce text contrast slightly — harsh white on black strains eyes */
  --color-text:     oklch(92% 0.008 250);
  --color-text-dim: oklch(70% 0.01 250);

  /* Desaturate accent slightly in dark mode */
  --color-primary: oklch(68% 0.12 250);  /* 0.15 → 0.12 chroma */
}
```

### Semantic Color Tables for Dark Mode

Define a full surface/text/accent table per theme rather than inverting one-to-one:

```css
/* Light semantic colors */
:root {
  --color-success:    oklch(45% 0.15 145);
  --color-success-bg: oklch(95% 0.04 145);
  --color-error:      oklch(45% 0.20 25);
  --color-error-bg:   oklch(96% 0.03 25);
}

/* Dark semantic colors — lighter for visibility, muted backgrounds */
[data-theme="dark"] {
  --color-success:    oklch(72% 0.14 145);
  --color-success-bg: oklch(22% 0.06 145);
  --color-error:      oklch(72% 0.18 25);
  --color-error-bg:   oklch(22% 0.07 25);
}
```

## Alpha Transparency

Heavy use of transparency (rgba, hsla with low alpha) is a design smell. Alpha creates unpredictable contrast, performance overhead (compositing), and inconsistency on different background colors. Define explicit colors instead.

```css
/* Smell — unpredictable on any background */
.badge { background: rgba(99, 102, 241, 0.15); }

/* Better — explicit, consistent */
.badge { background: var(--color-primary-subtle); }
/* where --color-primary-subtle: oklch(94% 0.04 270) in light mode */
```

**Exceptions:** Focus rings, interactive hover states, and intentional scrim overlays (e.g., backdrop for modals) where see-through is the intent.

## Testing Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — WCAG ratios
- [OKLCH Picker](https://oklch.com/) — visualize and adjust OKLCH values
- Browser DevTools → Rendering → Emulate vision deficiencies
- [Polypane](https://polypane.app/) — real-time contrast and vision simulation

---

**Avoid:** Relying on color alone to convey information. Creating palettes without clear role assignments. Using pure black for large areas. Skipping color-blindness testing (affects 8% of men). Using HSL for a new color system.
