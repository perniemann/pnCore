# Embedded studio DNA (pnCore)

Canonical reference for **portfolio, reel, studio, and lab** surfaces that should read as **cinematic real-time craft** plus **editorial structure**—not generic marketing chrome. Shipped as pnCore embedded guidance (`pn-core://reference/embedded-studio-dna.md`); pair with skill **`pn-embedded-studio-dna`** and command **`pn-design-dna`**.

## Principles

### 1. Cinematic real-time

- **Mood first:** Atmosphere, light direction, and framing carry meaning before copy does.
- **Physically plausible presentation:** Materials, depth, and motion behave consistently with the subject (VP, automotive, architectural, game worlds, product).
- **Motion as evidence:** Prefer embeds or loops that show **process and result** (showreel, breakdown, turntable), not decorative Lottie for its own sake.

### 2. Editorial-brutalist chrome

- **Structure is the brand:** Tables, rails, dividers, and typographic bands are **layout language**, not afterthought decoration.
- **Metadata visible:** Role, client or context, stack tags, and tool lists belong in the **reading path** for case studies—treat them as first-class UI, not footnotes.
- **Dual reading density:** Short headline + one-line hook for scanning; expandable or secondary blocks for responsibilities, toolchain, and delivery notes.

### 3. Dual registers

Pick one primary register per page or section; mix only when intentional.

| Register | Use when | Tone and density |
|----------|----------|-------------------|
| **Commercial / lead** | Agency-facing work, shipped titles, VP, XR installs | Precise, credit-heavy, restraint in whimsy |
| **Lab / R&D** | Tools, WebGL experiments, playful products, ASCII toys | Looser copy, bolder metaphors, still legible hierarchy |

### 4. Evidence strips (case studies)

Each block should make it easy to answer: **who**, **what role**, **what stack**, **what proof** (still, clip, or embed). Avoid anonymous “nice renders” without context.

## Typography and layout cues

- Strong **section rails** (full-width bands, sticky labels, or index columns) for navigation between long-scroll work.
- **Display layer** for names and section titles; **reading layer** for descriptions; **utility** for tags and meta—three clear layers (aligns with `pn-frontend-design-philosophy` page modes; prefer **Portfolio** / **Editorial** here).
- **Hashtag or token tags** for stack/skills are acceptable when they speed scanning; do not replace sentences where clarity needs a verb.

## Color and imagery

- **Dark bases** are common for reel-forward sites; if light mode exists, keep contrast for embed chrome and video letterboxing.
- **Hero media** should not fight the type: either dim overlay with strong type, or split layout (media + index).
- **Neon or high-chroma accents** are valid when they match automotive / nightlife / synth lab context; avoid default “AI purple” without narrative reason.

## Motion and media

- **Vimeo-style embeds** (privacy flags, no clutter UI) fit portfolio proof; **YouTube** when already canonical for the project.
- Respect **`prefers-reduced-motion`:** poster + link to full piece, or static hero.
- **Carousel timing:** If using timed rotation, expose pause control and avoid seizure-inducing flash.

## Accessibility and performance

- Embeds: **title** on iframe, **keyboard** path to project detail, do not autoplay audio without gesture.
- **LCP:** Prioritize poster image or first hero still; lazy-load below-fold embeds.
- Align with **`pn-core://reference/aesthetics-baseline.md`** and **`pn-core://reference/best-practices.md`** for non-generic floor and a11y.

## Research corpus: sibling WIP projects (extend DNA)

Embedded DNA is **not** only shipping sites—it includes **active repos** in the same dev workspace so layout, stack, and tone stay consistent across properties.

### Dev root (machine-local)

- **Convention:** A single dev root (e.g. `~/dev`, `D:/dev`, `X:/00_active_sync/dev`) holds sibling repos that get treated as one **research corpus** when applying this DNA (portfolio, product, lab, tooling).
- **Override:** Set environment variable **`PNCORE_STUDIO_DEV_ROOT`** to an absolute path. Agents and humans resolve the path before reading READMEs or `package.json` for one-line intent.

### Sibling folders (template)

Maintain a per-machine inventory of sibling repos so register and stack stay consistent across properties. Build your own table by listing each folder with a one-line role/stack summary; refresh when folders are added, renamed, or archived. Examples of the **kinds of rows** you might keep (do not copy verbatim):

| Folder | Role / stack (short) |
|--------|----------------------|
| `<portfolio-site>` | Reel-first portfolio (Astro / Next / vanilla); case-study rails. |
| `<flagship-app>` | Primary product app (framework, key libs); commercial register. |
| `<lab-experiment>` | R&D / WebGL / 3D toy; lab register, looser copy. |
| `<static-tool>` | Single-purpose static tool (no build step or minimal build). |
| `<agent-studio>` | Multi-agent / automation bootstrap (templates for Next, SvelteKit, n8n, etc.). |
| `pnCore` | This plugin + MCP: skills, agents, commands, workflows. |

Where it makes sense for your workspace, keep the actual filled-in table in a project-local doc (e.g. each repo's `.pncore-design.md` under **Reference Feel**) rather than here, so this canonical reference stays portable.

### How to use the corpus in a pass

1. Resolve dev root (`PNCORE_STUDIO_DEV_ROOT` or default above).
2. For the **target** project, list which siblings are **style references** (same register: lab vs commercial) or **stack references** (Three.js, Astro, Next, static).
3. Pull **patterns only** (typography rhythm, meta strip layout, hero structure)—do not copy proprietary assets across repos.
4. When shipping a public site, run link/embed hygiene for **that** deploy URL, not necessarily every sibling.

## Link and embed hygiene (maintenance)

Automated `curl` checks **do not** validate client-rendered SPAs or every social redirect. Use this checklist periodically:

1. **Curated list:** Homepage, primary case-study routes, `/lab` or equivalent, legal/contact, external properties you own.
2. **HEAD or GET** each URL; log non-2xx and certificate errors (`node scripts/check-embedded-studio-urls.mjs` when configured).
3. **Embeds:** Open a sample of Vimeo/YouTube IDs in a browser; confirm privacy and takedown.
4. **Socials:** Maintain a short table of **canonical profile URLs** in project docs (not duplicated here—project-specific).

## Integration with pnCore

- **Skill:** `pn-embedded-studio-dna` — when to load this file, how to merge with `.pncore-design.md`, and gates before ship.
- **Command:** `pn-design-dna` — loads this reference + skill, then chains **`pn-design`** (or `workflow_step("design", …)` when MCP is available).
- **Also load:** `pn-frontend-design`, `pn-typography`, `pn-animation`, `pn-landing-page` as scope dictates.

## Appendix: Provenance (optional)

The patterns above were **distilled from analysis** of long-form **lead realtime / Unreal / VP** portfolios and related **lab** properties (structured case studies, Vimeo-heavy proof, Web3 + Three.js experiments). They are intentionally **vendor- and name-neutral** in filenames, skill ids, and example tables so any studio can adopt or fork the DNA inside pnCore.
