---
name: pn-frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or apps (React, Astro, Next.js, vanilla HTML/CSS). Avoid generic AI aesthetics.
---

# Frontend design

## When to use

- Building or refining components, pages, landing pages, dashboards, or web apps.
- User asks for "designed," "polished," or "distinctive" UI, not just functional layout.
- Styling or beautifying any web UI with a clear aesthetic direction.

## Design Context

Check `.pncore-design.md` in the project root first. If it exists and contains audience, brand personality, and visual ambition, use it — skip discovery questions. If it doesn't exist, recommend running `pn-setup` (design context option) to set it up, then continue with inline discovery as a fallback.

**Cross-project floor:** `pn-core://reference/aesthetics-baseline.md` — dimension checklist, inspiration presets, optional `<frontend_aesthetics>` block for CLAUDE.md. Use it so every surface (marketing, app shell, auth, empty states, emails if in scope) is reviewed against the same non-generic bar; project file always wins on conflicts.

**Marketing intent (landing / portfolio / editorial):** Before coding, load **`pn-core://reference/design-intent.md`** and emit the **Design Read** one-liner plus **DESIGN_VARIANCE**, **MOTION_INTENSITY**, **VISUAL_DENSITY** (1–10). Pre-ship: **`get_command("pn-preflight")`** per **`pn-core://reference/marketing-ship-gate.md`**.

## Design thinking (before coding)

Lock in context and a **bold aesthetic direction**:

1. **Purpose:** What problem does this interface solve? Who uses it?
2. **Tone:** Pick a clear direction: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Execute that direction with precision.
3. **Constraints:** Framework (React, Astro, Next.js, vanilla HTML/CSS), performance, accessibility.
4. **Differentiation:** What is the one thing someone will remember? Make it unforgettable.

Then implement working code (React, Astro, Next.js, vanilla HTML/CSS) that is production-grade, visually striking, cohesive, and meticulously refined.

## Aesthetics guidelines

- **Typography:** Use distinctive, characterful fonts. Avoid generic choices (Arial, Inter, Roboto, Geist, Space Grotesk, system fonts). Pair a distinctive display font with a refined body font. **When discovery ambition is award-winning or distinctive:** Pick a strong display + body pair from `reference/typography.md` (via `pn-typography`) that matches brand personality — **Syne + DM Sans is one acceptable default, not the only house pair.** Do not reuse the same pairing you used on the last project if this repo calls for a different mood. Do not use Inter, Geist, Roboto, or Space Grotesk unless the spec demands it. Override create-next-app, shadcn, and other template defaults that use Geist.
- **Color & theme:** Commit to a cohesive palette. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion:** Use animations for effects and micro-interactions. Prefer CSS for HTML; use **Motion** (Framer Motion successor) or **GSAP** for React when available. **When to use each:** Motion for React declarative animations, layout, and gestures; GSAP for timeline control, scroll-triggered sequences, and complex choreography. **Prefer one orchestrated load or first-paint sequence** (staggered hierarchy with `animation-delay` or equivalent) over many unrelated micro-motions. Add further motion only when each maps to Reveal / Orient / Confirm / Delight. Keep small UI transitions to 150–250ms; respect prefers-reduced-motion.
- **Spatial composition:** Consider asymmetry, overlap, diagonal flow, grid-breaking elements. Generous negative space or controlled density.
- **Backgrounds & detail:** Add atmosphere and depth: gradient meshes, noise textures, geometric patterns, layered transparencies, shadows, grain. Avoid flat solid fills when the aesthetic calls for more.

## Stack

- Prefer the project's existing patterns. Use pn-frontend-scaffolding (React/Next/Astro/vanilla per stack) or pn-react, pn-astro, pn-nextjs, pn-vanilla-web rules for structure and a11y.
- **Component library (when specified):** Use library components for every UI element. Do not create custom Button, Input, Card, Dialog, etc. when the library provides them. See pn-ui-component-libraries for enforcement.
- Match implementation complexity to the aesthetic: maximalist designs need more elaborate code and effects; minimal designs need restraint, precision, and subtle detail.

## Whimsy and delight

Add personality and delight when it serves a purpose. Every playful element must enhance the experience rather than distract.

- **Functional delight:** Micro-interactions that reduce anxiety (e.g. celebration on task completion), provide feedback, or clarify state.
- **Emotional purpose:** Animations and transitions that build brand personality and make the interface feel human.
- **Restraint:** Avoid gratuitous motion or decoration. Delight that enhances usability is valuable; delight that obscures or annoys is not.
- **Accessibility:** Respect `prefers-reduced-motion`; never rely on motion alone for critical information.

## Award checklist (when ambition = award-winning/distinctive)

Per Web Design Awards Visual Design criteria (inventive art direction, cohesive storytelling):

- **Editorial asymmetry:** Hero not centered symmetric; offset visual or text (e.g. 60/40 split)
- **Intentional motion:** At least one tagged motion (Reveal/Orient/Confirm/Delight) per pn-frontend-design-philosophy; with prefers-reduced-motion fallback
- **Hero visual proves:** Hero image/illustration supports the message; not decorative-only. Use scene or product-in-context.
- **Distinctive assets:** Logo and icons have character; avoid "letter on shape" logos and generic Lucide-style icons without concept fit

Reference: https://www.webdesignawards.io/judging-rubric (Visual Design & Branding: inventive art direction, cohesive storytelling via layout/motion)

## Touch targets (WCAG 2.5.8)

- **Minimum:** 24×24px for all interactive elements (links, buttons, icon buttons, nav items, locale switchers).
- **Preferred:** 44×48px for primary CTAs.
- Use `min-h-[24px] min-w-[24px]` or padding ≥12px; avoid text-only links without sufficient tap area.

## The AI Slop Test

**Critical quality check before declaring done:** If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface makes someone ask "how was this made?" — not "which AI made this?"

Scan for these fingerprints of generic AI output:
- Inter / Geist / Space Grotesk as the font choice (template default, not a design decision)
- Purple-to-blue gradient anywhere on the page
- Cyan accents on dark background
- Identical card grid (same size, same structure, same everything, repeated)
- Glassmorphism as a style (blur + glow borders on everything)
- Bounce/elastic easing on any animation
- Gradient text on headings or metrics
- Hero centered, body centered, CTAs centered — everything centered
- Same padding on every element and section

If 3 or more apply: stop and redesign the aesthetic direction. Do not polish a template. See `pn-frontend-design-philosophy` Named Anti-Patterns Catalog for full reference.

## Anti-patterns

- **Never:** Overused font families (Inter, Roboto, Arial, Geist, Space Grotesk everywhere), purple gradients on white, cookie-cutter layouts, generic AI-generated aesthetics that lack context-specific character. When discovery ambition is award-winning or distinctive: fail if generic fonts used; override template defaults (create-next-app, shadcn use Geist).
- Vary choices (light/dark, different fonts, different aesthetics) so no two designs converge on the same clichés.

## Output

- Production-grade, cohesive code with a clear aesthetic point-of-view.
- After implementation, run a11y basics (pn-ux-patterns) where relevant: contrast, focus, labels for interactive elements.
- **Vanilla HTML:** After a fenced **html** code block, run **`get_skill("pn-html-preview")`** so the file is saved and checked in a real browser.
