# Marketing ship gate

Mechanical **pre-ship** checklist for marketing and portfolio UI. Use with `get_command("pn-preflight")` or inline at end of `pn-design` build.

**Loads with:** `pn-core://reference/design-intent.md` (Design Read + dials must already be declared).

**Project truth:** When `.pncore-design.md` specifies brand colors, fonts, or purple/violet accents **on purpose**, strict-tier palette bans **do not apply** to those declared tokens. Strict tier still applies to contrast, motion roles, layout caps, and CTA rules.

---

## Tiers

| Tier | When | Gate |
|------|------|------|
| **standard** | App shells, tools, dashboards | AI Slop Test only (`pn-frontend-design`) |
| **strict** | Landing, portfolio, editorial marketing | This checklist + Slop Test ≤2 hits |
| **studio** | `pn-design-dna` / embedded studio DNA | strict + `embedded-studio-dna` (evidence strips, embed a11y) |

`pn-design` uses **strict** when plan page mode is **Portfolio**, **Product marketing**, or **Editorial** — not Tool/app, Conversion/form, or Catalog.

---

## Output format (`pn-preflight`)

Emit a table:

| ID | Check | PASS/FAIL | Fix if FAIL |
|----|-------|-----------|-------------|
| P-01 | … | PASS | — |

End with: **`SHIP: GO`** (all PASS) or **`SHIP: NO-GO`** (any FAIL on P-01–P-15, or on N-01–N-04 when narrative intent applies).

---

## Checklist (strict tier)

### Intent

| ID | Check | FAIL when |
|----|-------|-----------|
| P-01 | Design Read present in plan or session | Missing one-liner |
| P-02 | Three dials declared | Any of VARIANCE / MOTION / DENSITY missing |

### Copy and typography

| ID | Check | FAIL when |
|----|-------|-----------|
| P-03 | Primary CTA labels | >3 words on primary CTA at desktop, or wraps to 2+ lines |
| P-04 | Duplicate CTA intent | Two buttons with same intent (e.g. Contact + Get in touch + Let's talk) |
| P-05 | Display type | Inter / Geist / Roboto / Space Grotesk used without spec or `.pncore-design.md` choice |

### Color (skipped when project file declares palette)

| ID | Check | FAIL when |
|----|-------|-----------|
| P-06 | Accent lock | More than one unrelated accent hue on same page |
| P-07 | AI gradient trope | Purple-to-blue hero gradient or cyan-on-dark template accent **without** brand justification in spec |

### Layout

| ID | Check | FAIL when |
|----|-------|-----------|
| P-08 | Card grid trope | Three equal feature cards in a row as the only feature pattern |
| P-09 | Zigzag cap | >2 consecutive image+text split sections with alternating sides |
| P-10 | Viewport height | `h-screen` on full-height hero (use `min-h-[100dvh]`) |
| P-11 | Center-everything | Hero, body, and CTAs all centered with no spatial intent |

### Motion

| ID | Check | FAIL when |
|----|-------|-----------|
| P-12 | Motion roles | Any animation cannot be tagged Reveal / Orient / Confirm / Delight in one sentence |
| P-13 | Scroll listeners | `window.addEventListener('scroll', …)` for animation (use Motion/GSAP/CSS scroll-driven) |
| P-14 | Reduced motion | No `prefers-reduced-motion` fallback when MOTION_INTENSITY ≥ 5 |

### Accessibility

| ID | Check | FAIL when |
|----|-------|-----------|
| P-15 | CTA contrast | Primary button text fails WCAG AA (4.5:1 body, 3:1 large) |

---

## AI Slop Test (required on strict)

Run the **AI Slop Test** from `pn-frontend-design`. **FAIL ship** if **3+** slop patterns apply unless user explicitly chose a template aesthetic in spec.

---

## Studio tier additions

When `pn-design-dna` or `pn-embedded-studio-dna` applies, also verify:

- Register (commercial vs lab) stated once; no accidental register mix.
- Case studies include evidence strip (who / role / stack / proof).
- Embeds: title on iframe, no autoplay audio without gesture; reduced-motion poster path.

---

## Narrative addendum (N-01–N-04)

Apply **only** when **narrative intent** is present (`pn-core://reference/design-intent.md` §2b). High `MOTION_INTENSITY` alone does **not** activate this table. Agency and designer-portfolio presets stay on P-01–P-15 unless the Design Read or user asked for a scroll-told story.

| ID | Check | FAIL when |
|----|-------|-----------|
| N-01 | Narrative Map present | Missing beats, feeling sequence, one peak, or remembered interaction |
| N-02 | One peak | Two or more competing peaks, or no remember-sentence |
| N-03 | Timeline samples | Scroll-driven deliverable has no contact-strip samples. **Skip allowed only when the motion map lists zero scroll triggers.** A free-text “no scroll-driven motion” line is not enough. |
| N-04 | Reduced-motion comprehensible | Motion off leaves content missing, blank, or unreadable. Defer mechanics to `pn-animation` (end state visible; `gsap.matchMedia` / `animation-timeline: auto`). |

Remembered-interaction quality (not a retuned stagger) is a `pn-scroll-narrative` skill rule, not a ship-blocker.

---

## Philosophy cross-check

Do not re-run full Phase 2–6 audits here—that is `pn-frontend-audit`. On FAIL, map fixes to: `pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-bolder`, `pn-quieter`, `pn-delight`.

---

## Deferred (v2)

- Image comp board pipeline before code.
- CI heuristics on `h-screen` / gradient class names.
- Numeric composite scorecard across brief fixtures.
