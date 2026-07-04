---
name: pn-landing-page
description: "Builds or refines landing pages: hero anatomy, social proof, pricing tables, CTA hierarchy, above-the-fold strategy, responsive patterns, LCP optimization. Use when building or refining landing pages."
---

# Landing page skill

## When to use

- Building a new marketing or product landing page from scratch.

**Intent:** Load **`pn-core://reference/design-intent.md`** first. Declare **Design Read** + tuning dials; default landing SaaS preset is variance 7 / motion 6 / density 4 unless the brief overrides. Pre-ship: **`get_command("pn-preflight")`** (strict tier).
- Refining an existing landing page — hero copy, CTA hierarchy, social proof placement.
- Optimizing LCP and Core Web Vitals for a landing page.
- Reviewing above-the-fold strategy, pricing table structure, or trust signal placement.

## Page-level composition

1. **Above-the-fold:** Lead with one clear value proposition and primary CTA. Avoid clutter; reserve secondary content for scroll.
2. **Full-page flow:** Structure as hero → problem/solution → features/benefits → social proof → pricing (if applicable) → final CTA. Each section should have a single focus.
3. **Section hierarchy:** Use clear headings; one main idea per section. Support scannability with subheadings and short paragraphs.

## Hero section anatomy

- **Headline:** One clear, benefit-driven statement. Avoid jargon; lead with outcome.
- **Subheadline:** Expand on the headline; add context or differentiation.
- **Primary CTA:** Single dominant action (e.g. "Get started", "Start free trial"). Use high contrast; place above the fold.
- **Secondary CTA:** Optional (e.g. "Learn more", "Watch demo"). Lower visual weight than primary.
- **Hero visual:** Product shot, illustration, or video. Support the message; avoid decorative-only imagery. For distinctive/award-winning ambition: use scene-based illustration (unDraw, Storyset) or product-in-context; recolor to design tokens. Avoid generic wireframe placeholders.
- **Trust signals:** Logos, badges, or short stats near the CTA when space allows.

## Social proof placement

- **Near CTA:** Testimonials, logos, or "X users" close to the primary action.
- **Dedicated section:** Full testimonials, case studies, or reviews mid-page.
- **Above footer:** Final reassurance before last CTA.
- **Format:** Use real names, photos, and attributions when possible. Avoid generic quotes.

## Pricing table patterns

- **Comparison:** Side-by-side tiers when 2–4 options. Highlight recommended tier.
- **Feature matrix:** Clear checkmarks for included features; avoid long paragraphs.
- **FAQ nearby:** Address common pricing objections (billing, cancellation, trials).
- **CTA per tier:** One CTA per plan; avoid decision paralysis.

## CTA hierarchy

- **Primary:** One per section or page focus. High contrast, prominent placement.
- **Secondary:** Alternative actions (e.g. "Contact sales", "View docs"). Lower emphasis.
- **Tertiary:** Text links for low-priority actions. Do not compete with primary.
- **Consistency:** Use same primary CTA copy across sections when the action is the same.

## Responsive and mobile-first

- **Mobile-first:** Design for small screens first; add complexity for larger viewports.
- **Touch targets:** Minimum 44×44px for buttons and links on mobile.
- **Readable width:** Limit line length (e.g. 65–75ch) for body text.
- **Stack on mobile:** Single-column layout; preserve visual hierarchy when stacking.
- **Images:** Use responsive images (`srcset`, `sizes`); avoid oversized assets on mobile.
- **Touch-only:** Ensure CTAs and navigation work without hover. Use `@media (hover: none)` to test.

## Performance (LCP, images, fonts)

- **LCP optimization:** Prioritize hero image or video; use `fetchpriority="high"` for above-the-fold media. Preload critical assets when beneficial.
- **Image strategy:** Use WebP/AVIF with fallbacks; lazy-load below-the-fold images. Provide width/height to avoid layout shift.
- **Font loading:** Use `font-display: swap` or `optional`; preload critical fonts. Avoid invisible text (FOIT); prefer FOUT or system font fallback.
- **Critical CSS:** Inline or early-load above-the-fold styles; defer non-critical CSS.

## Example prompts

**Cold start:**
> Using `pn-landing-page`, build a landing page for a SaaS productivity tool — hero with one CTA, three feature cards, pricing table (free/pro/team), and a footer.

**Warm start — refine existing page:**
> My landing page converts poorly above the fold. Using `pn-landing-page`, audit and rewrite the hero section for a stronger CTA hierarchy and value proposition.

**Format-specific:**
> Using `pn-landing-page`, add a social proof section (logos + testimonials) between the features and pricing blocks, mobile-first.

**Iterate:**
> The pricing table is too dense. Simplify to two tiers and add an FAQ below it using `pn-landing-page` patterns.

## Output

- Conversion-oriented landing page with clear flow and CTA hierarchy.
- Reference pn-frontend-design for aesthetics and design thinking; pn-design-system for tokens; pn-ux-patterns for a11y.
