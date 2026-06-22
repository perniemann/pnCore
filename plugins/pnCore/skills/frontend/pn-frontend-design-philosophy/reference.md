# Frontend Design Philosophy — Reference

Execution framework for applying the rulebook. For the core philosophy and Do/Don't rules, see [SKILL.md](SKILL.md).

---

## Agent Workflow (run in order)

### Phase 0 | Design intent (marketing and portfolio)

**Load:** `pn-core://reference/design-intent.md` (or synced `plugins/pnCore/reference/design-intent.md`).

**Required before Phase 1 when the surface is a landing page, portfolio, or editorial marketing site** (also when `pn-design` or `pn-preflight` is in scope):

1. Emit the **Design Read** one-liner (page kind, audience, vibe, aesthetic/system family).
2. Declare **DESIGN_VARIANCE**, **MOTION_INTENSITY**, **VISUAL_DENSITY** (integers 1–10). Use inference tables in design-intent unless `.pncore-design.md` lists **Tuning dials**.
3. Optional: lock one **aesthetic preset** from design-intent §3.

**Pass criteria**

- Design Read and three dials appear in the plan or first implementation message.
- Dials are consistent with declared vibe (e.g. public-sector does not use variance 9 without user override).

**Then continue to Phase 1** — page mode classification uses the read as context.

---

### Phase 1 | Page Mode Classification

For each page/section, classify:

- **Mode** = Portfolio / Product marketing / Editorial / Tool / Conversion / Catalog
- Primary job
- Secondary job
- Primary CTA
- Primary proof type = media / process / metrics / logos / testimonials / taxonomy
- Statefulness = low / medium / high

**Pass criteria**

- Every major page/section has a mode
- CTA and proof type are identified
- Mixed-mode pages are flagged

---

### Phase 2 | Typography Audit

Audit type as a system, not styling.

**Required outputs**

- Display layer (hero / section markers)
- Reading layer (body / explanation)
- Utility layer (labels / tags / controls / metadata / validation / status)

**Evaluate**

- H1/H2/H3 consistency
- Label/tag consistency
- Metadata legibility
- Sentence density
- Line length
- Section rhythm
- Semantic typography (steps, statuses, filters, warnings)

**Typography scoring (0–3)** | Hierarchy clarity | Semantic clarity | Readability rhythm | Mode alignment

- 0 = broken / unclear
- 1 = inconsistent / weak
- 2 = good / usable
- 3 = strong / system-level

---

### Phase 3 | Layout + CSS System Audit

Extract the UI as a component system.

**Identify repeated blocks** — at minimum, map these if present:

- Hero
- Section header
- Proof card
- Feature card
- Process step
- FAQ item
- CTA band
- Footer
- Modal/overlay
- Form block
- Taxonomy/filter block
- Media module (image/video/3D)

**For each component, document**

- Purpose
- Required fields
- Optional fields
- Variants
- States
- Responsive behavior
- Accessibility requirements

**CSS/Layout checks**

- Spacing rhythm consistency
- Component anatomy consistency
- Grid behavior consistency
- Semantic visual styling (labels vs warnings vs CTAs vs metadata)
- Token reuse (spacing/type/radius/shadow/motion durations)
- Responsive behavior: mobile-first, reflow at 320px, no horizontal scroll
- Touch targets: 44×48px minimum for interactive elements; 8px spacing
- Hover independence: critical actions have non-hover alternatives
- Zoom: no user-scalable=no or maximum-scale=1

**Layout/CSS scoring (0–3)** | Modularity | Component consistency | Spacing rhythm | Control clarity | Semantic styling

---

### Phase 4 | Motion + Scroll + Media Audit

Classify all motion before judging it.

**Motion role taxonomy (required)** — every animation must be tagged as:

- **Reveal**
- **Orient**
- **Confirm**
- **Delight**

If it fits none → remove it.

**Motion checks**

- Does motion clarify hierarchy?
- Does content still make sense without motion?
- Is reduced-motion behavior defined?
- Does motion block reading or CTA access?
- Is motion local (preferred) or global (riskier)?
- Are multiple motion channels stacked (hover + scroll + cursor + parallax)?

**Scroll choreography checks** (for long-form pages)

- Clear chapters
- Consistent chapter grammar
- Visual anchor per chapter
- Transition logic
- Proof placement
- CTA moments

**Media checks (2D / 3D / video)**

- One dominant media type per section
- 3D only where it adds meaning
- Galleries include metadata/context
- Video has fallback state/text
- Heavy modules expose loading state

**Motion/Media scoring (0–3)** | Functional motion | Narrative pacing | Fallback quality | Reduced-motion readiness | Distraction risk (3 = low distraction)

---

### Phase 5 | State Architecture Audit

Treat every interactive experience as stateful.

**Required state categories** — for each interactive area, map:

| Category   | Examples                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| UI state   | open/closed, selected tab/card, active chapter, expanded/collapsed        |
| Form state | field values, validation, step index, submit pending, success, error      |
| URL state  | filters, sort, category, pagination, step (if relevant)                  |
| Async state| loading, partial load, retry, failure                                    |
| Recovery   | autosave/draft, warning on refresh, restore previous state, restart flow |

**State checks**

- Validation messages visible and specific
- Loading state visible
- Error state visible
- Success state visible
- Empty state designed
- Unsupported state messaging exists (device, WebGL, permissions, etc.)
- State-loss risk is communicated
- Meaningful state persisted (preferences, progress)

**State scoring (0–3)** | State visibility | Form robustness | Async feedback | Recovery behavior | URL-state design

---

### Phase 6 | Performance + Resilience Audit

Performance is audited by page mode.

**Page-type budgets (baseline)**

| Type                 | Focus                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| **Portfolio/Cinematic** | Heavier imagery/video allowed; strict lazy loading; in-view motion only; staged hydration; strong placeholders |
| **Product/SaaS/Service** | Fast text-first render; minimal hero motion; defer non-critical scripts; optimize CTA responsiveness |
| **Tool/Generator**   | Prioritize input latency; explicit render/loading/progress states; isolate expensive transforms; preserve UX under low power |
| **Catalog/Gallery**  | Aggressive image sizing and lazy loading; URL-based filters; pagination/virtualization if needed; stable layout to avoid jumpiness |

**Performance checks**

- Text and hierarchy render first
- Hero media budget defined
- Initial JS budget defined
- Font budget defined
- Heavy modules lazy/deferred
- Placeholders/skeletons meaningful
- No-JS reading path preserved
- Reduced-motion path preserved
- Mobile/mid-range device sanity checked
- Touch-only usability: key actions work without hover or mouse
- Zoom and reflow: content readable at 200% zoom; functions at 320px width

**Performance scoring (0–3)** | Initial render discipline | Media budgeting | JS restraint | Fallback/resilience | Interaction smoothness

---

## Scoring Framework (0–3) | Final Audit Scorecard

**Categories** (score each 0–3)

- Page Mode Clarity
- Typography System
- Layout/CSS Modularity
- Motion Governance
- Media Strategy (2D/3D/video)
- State Architecture
- Performance Discipline
- Resilience + Accessibility

**Overall rating bands**

- 0.0–0.9 | Fragile / unclear
- 1.0–1.9 | Inconsistent / partial system
- 2.0–2.5 | Good / production-usable
- 2.6–3.0 | Strong / system-grade

**Required qualitative summary** — for each category, provide:

- Top strengths
- Top risks
- Fast fixes
- Structural fixes

---

## Agent Templates (copy-paste)

### A) Page Mode Inventory
`Page/Section | Mode | Primary job | Secondary job | Primary CTA | Proof type | Statefulness | Notes`

### B) Typography Audit Block
`Display layer | Reading layer | Utility layer | Heading grammar | Metadata strategy | Semantic labels | Density | Issues | Score (0–3)`

### C) Component Extraction Block
`Component name | Purpose | Required fields | Optional fields | Variants | States | Responsive behavior | A11y notes | Score impact`

### D) Motion Governance Block
`Section | Motion present Y/N | Role (Reveal/Orient/Confirm/Delight) | Meaning depends on motion? | Reduced-motion behavior | Performance risk | Keep/Reduce/Replace`

### E) State Architecture Block
`Interaction area | UI state | Form state | URL state | Async state | Recovery state | Missing states | Risk | Fix | Score (0–3)`

### F) Performance Budget Block
`Page mode | Hero media budget | Initial JS budget | Font budget | Below-fold lazy-load rule | 3D/video defer rule | Fallback requirements | Target CWV | Monitoring method`

---

## Priority Roadmap (impact × effort)

For every issue found, score:

- **Impact** (1–5)
- **Effort** (1–5)
- **Confidence** (1–5)

**Priority formula**

```
Priority = (Impact × Confidence) ÷ Effort
```

**Prioritize in this order**

1. Missing state feedback (loading/error/success)
2. Broken hierarchy / unclear page mode
3. CTA placement and proof placement issues
4. Heavy media without budgets/fallbacks
5. Motion that harms reading/performance
6. Component inconsistency and token drift

---

## Default Build Strategy

**Order of operations**

1. Define page mode
2. Define typography system
3. Define components + tokens
4. Map states
5. Place proof + CTA
6. Add motion
7. Add heavy media
8. Performance harden
9. Add fallbacks
10. QA against this rulebook

**Default output set (required)**

- Inventory
- Scorecard
- Component map
- State map
- Motion map
- Performance budget
- Fix roadmap
- Final design philosophy summary

---

## Named Anti-Patterns Catalog

These are the **fingerprints of AI-generated design from 2024–2025**. Name them when you see them in an audit. If a design contains 3 or more, fail it and require a redesign pass.

### The AI Color Palette
Cyan accent on near-black, purple-to-blue gradient on white, neon accents on dark, gradient text on headings. Signals "LLM default" immediately. Replace with a brand-derived OKLCH palette.

### Hero Metric Layout
Big number, small label underneath, 3–4 supporting stats in a row, often with a gradient accent. So ubiquitous it has become invisible. Replace with editorial data presentation, story-driven context, or time-series comparison.

### Glassmorphism as Default
Blur + transparency + glow borders used as a style rather than a purposeful choice. When everything is glass, nothing is elevated. Reserve for genuine overlay contexts (tooltips, popovers). Replace card surfaces with explicit elevation tokens.

### Cards Nested in Cards
Section card → content card → inner detail card. Every nesting level costs visual attention. Flatten the hierarchy using elevation levels (surface-1 through surface-3) instead of container-inside-container patterns.

### Identical Card Grid
Every card the same size, same padding, same icon-heading-text structure, repeated in a uniform grid. The most common "AI made this" layout. Replace with editorial rhythm: featured (2-col) + standard, or varied content types, or an alternative pattern entirely.

### Bounce / Elastic Easing
`cubic-bezier` with overshoot (spring physics) on interface elements. Feels dated and "game-like" in product contexts. Replace with exponential ease-out (`ease-out-quart` or `ease-out-expo`) for natural deceleration.

### Gradient Text for Impact
`background-clip: text` gradient on headings or metrics. Decorative rather than meaningful — draws attention without conveying hierarchy. Replace with weight contrast, size contrast, or a bold solid color.

### Sparklines as Decoration
Tiny charts in stat cards that look sophisticated but are too small to read. Remove or make them interactive and actually readable.

### Modals as Default
Using a modal for anything that requires more than a quick confirmation: forms, settings, content, multi-step flows. Replace with drawers/sheets for adjacent content, inline expansion for quick edits, dedicated pages for complex flows.

### Inter / Geist / Space Grotesk Everywhere
Template font choices from create-next-app, shadcn, and other scaffolds. Replace with a font choice made deliberately for the brand. See [reference/typography.md](../reference/typography.md) for alternatives.

### Same Spacing Everywhere
Every element, every section, every card has the same padding (usually 24px). No rhythm, no hierarchy through space. Replace with a deliberate spacing system using tight groupings within components and generous separation between sections.

### Center-Everything Layout
All text centered, hero centered, body centered, CTAs centered. Feels safe and forgettable. Left-aligned text with an asymmetric composition feels designed. Reserve centering for short headlines and single-focus CTAs.

### Purple Gradients on White
The default "technology/startup" aesthetic. Along with the AI color palette above, signals "no design decisions were made." Replace with a palette derived from actual brand context.

---

## Red Flag Checklist (fast QA)

**Fail the page if any are true:**

- [ ] No clear page mode
- [ ] Hero has multiple competing intents
- [ ] Typography hierarchy unclear
- [ ] Critical UI states not visible
- [ ] Motion has no functional role
- [ ] Heavy media loads without fallback/loading UI
- [ ] Filters/forms lack recoverable state
- [ ] CTA has no nearby proof
- [ ] No legal/contact trust layer (where commercially relevant)
- [ ] Page breaks meaningfully without JS or reduced motion
- [ ] Critical actions require hover (no touch alternative)
- [ ] Touch targets below 44×48px
- [ ] Horizontal scroll at 320px viewport
- [ ] Zoom disabled (user-scalable=no)
