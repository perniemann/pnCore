# Design intent (marketing UI)

Canonical brief-inference and tuning surface for **landing pages, portfolios, and marketing sites**. Load via `pn-core://reference/design-intent.md` before plan or code when `pn-design`, `pn-landing-page`, or `pn-preflight` applies.

**Pair with:** `pn-core://reference/aesthetics-baseline.md`, `get_skill("pn-frontend-design")`, `get_skill("pn-frontend-design-philosophy")`. **Studio portfolios:** also `pn-core://reference/embedded-studio-dna.md` (structure and evidence override generic marketing patterns).

**Project truth:** `.pncore-design.md` wins on brand, colors, fonts, and ambition. This reference sets the **cross-project procedure** when the project file is silent.

---

## 1. Design Read (required before plan/build)

Read signals **before** choosing fonts or layout:

1. **Page kind** — landing (SaaS / consumer / agency), portfolio (dev / designer / studio), redesign (preserve vs overhaul), editorial / blog, **editorial scroll-story** (scroll-told narrative; not a default blog or SaaS landing).
2. **Vibe words** — e.g. minimalist, Linear-style, brutalist, premium consumer, playful, public-sector, agency.
3. **References** — URLs, screenshots, named products.
4. **Audience** — who judges the surface (buyer, recruiter, consumer).
5. **Existing brand** — logo, palette, type (redesigns: treat as input, not optional).
6. **Quiet constraints** — a11y-first, regulated, trust-first commerce; these **override** aesthetic preference.

### Required one-liner

Emit exactly once in the plan (or first build message):

`Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system or aesthetic family>.`

Examples:

- `Reading this as: B2B SaaS landing for technical buyers, with a Linear-style minimalist language, leaning toward shadcn + restrained motion.`
- `Reading this as: designer portfolio for hiring managers, with an editorial kinetic-type language, leaning toward native CSS + scroll-driven motion.`
- `Reading this as: editorial scroll-story for gallery visitors, with a documentary chaptered language, leaning toward CSS scroll-driven motion.`

### Ambiguity

If the design read genuinely diverges (e.g. Linear-clean vs Awwwards-experimental), ask **one** clarifying question—never a multi-question dump. If context is sufficient, declare the read and proceed.

### Anti-default discipline

Do not default to: purple mesh heroes, three equal feature cards, glassmorphism everywhere, Inter/Geist as the “creative” choice, unmotivated scroll hijacks. Reach past LLM defaults using the read.

---

## 2. Tuning dials (1–10)

After the Design Read, set three integers. Use them as **global variables** for the rest of the session.

| Dial | Low | High |
|------|-----|------|
| **DESIGN_VARIANCE** | Symmetric, centered, safe | Asymmetric, grid-breaking, experimental |
| **MOTION_INTENSITY** | Hover-only, static hero | Scroll choreography, pin/scrub (when justified) |
| **VISUAL_DENSITY** | Gallery whitespace | Dashboard-like information density |

**Baseline (marketing default):** `8 / 6 / 4` unless the read or `.pncore-design.md` overrides.

### Inference table (signal → dial ranges)

| Signal | VARIANCE | MOTION | DENSITY |
|--------|:--------:|:------:|:-------:|
| minimalist / calm / Linear-style | 5–6 | 3–4 | 2–3 |
| premium consumer / Apple-y | 7–8 | 5–7 | 3–4 |
| playful / Awwwards / agency | 9–10 | 8–10 | 3–4 |
| landing / portfolio (default) | 7–9 | 6–8 | 3–5 |
| trust-first / public-sector | 3–4 | 2–3 | 4–5 |
| redesign — preserve | match existing | existing +1 max | match existing |
| redesign — overhaul | +2 | +2 | match existing |

### Use-case presets

| Use case | VARIANCE | MOTION | DENSITY |
|----------|:--------:|:------:|:-------:|
| Landing (SaaS) | 7 | 6 | 4 |
| Landing (agency) | 9 | 8 | 3 |
| Portfolio (designer) | 8 | 7 | 3 |
| Portfolio (developer) | 6 | 5 | 4 |
| Editorial / blog | 6 | 4 | 3 |
| Public-sector | 3 | 2 | 5 |

### How dials drive output

- **VARIANCE** — layout asymmetry, bento vs symmetric grid, hero offset.
- **MOTION** — depth of scroll/GSAP; map every animation to Reveal / Orient / Confirm / Delight (philosophy).
- **DENSITY** — spacing scale, metadata visible vs airy.

Persist optional defaults in `.pncore-design.md` under **Tuning dials** (see template).

---

## 2b. Narrative intent (scroll-told stories)

`MOTION_INTENSITY` measures how loud motion is. It does **not** decide whether the page is a scroll-told story. Agency landings default to motion **8** and designer portfolios to **7**; those presets stay on `get_skill("pn-landing-page")` unless narrative intent is present.

**Narrative intent** is present when any one of these is true:

- The user asks for a scroll-told story, scrollytelling, a pin/scrub film, or “not a SaaS template landing.”
- Design Read page kind is **editorial scroll-story**.
- Discovery or the brief names a scroll narrative as the deliverable.

When narrative intent is present: emit a **Narrative Map** (beats, feeling sequence, one peak, remembered interaction) and load `get_skill("pn-scroll-narrative")`. Pre-ship adds N-01–N-04 (`pn-core://reference/marketing-ship-gate.md`).

When MOTION is high but narrative intent is absent: stay on `pn-landing-page`. You may note “consider `pn-scroll-narrative` if the story is told by scroll.” Do **not** require the skill or the N-* table.

If this repo’s last marketing page used the same open + close + peak device, change the plan. Do not keep a fingerprint registry.

---

## 3. Aesthetic presets (optional shortcut)

Lock **one** preset when discovery direction is already chosen; still emit Design Read + dials (may match preset skew).

| Preset | Dial skew | Direction |
|--------|-----------|-----------|
| **minimal-editorial** | low variance, low motion | Notion/Linear-like restraint |
| **soft-premium** | mid variance, mid motion | calm contrast, generous whitespace |
| **brutalist-industrial** | high variance, low motion | Swiss / raw type, sharp contrast |
| **studio-cinematic** | per DNA | use `embedded-studio-dna` + **studio** ship tier |

---

## 4. Map to philosophy page mode

After Design Read, classify each major page/section per **pn-frontend-design-philosophy** Phase 1: Portfolio / Product / Editorial / Tool / Conversion / Catalog.

Marketing UI often mixes **Product** (marketing) + **Portfolio** sections; flag mixed-mode pages in the plan.

---

## 5. Implementation pointers (not duplicated here)

- **GSAP pin/scrub:** `get_skill("pn-gsap")` — canonical patterns; isolate in client leaf components.
- **Motion vs state:** continuous scroll/pointer values → Motion `useMotionValue` / `useScroll`, not `useState` per step (`pn-react-next-perf`).
- **Hero height:** `min-h-[100dvh]`, not `h-screen`.
- **Design systems:** `get_skill("pn-ui-component-libraries")` when brief names Fluent, Carbon, GOV.UK, shadcn, etc.

---

## Workflow

| Step | Action |
|------|--------|
| Plan | Load this file → Design Read + dials → narrative intent check → philosophy Phase 1 |
| Build | `pn-frontend-design` + stack skills; `pn-scroll-narrative` only when narrative intent is present |
| Pre-ship | `get_command("pn-preflight")` when page mode is Portfolio, Product marketing, or Editorial; add N-01–N-04 when narrative intent is present |
