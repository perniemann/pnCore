---
name: pn-embedded-studio-dna
description: "Cinematic realtime portfolio and lab UI — editorial structure, dual registers (commercial vs R&D), motion-as-evidence. Loads pn-core embedded reference; pairs with pn-design."
---

# Embedded studio DNA

## When to use

- Building or refactoring a **portfolio, reel, studio site, or lab** page (Astro, React, Next, vanilla).
- The brief calls for **cinematic mood**, **structured case studies**, or **showreel-first** hierarchy—not a generic SaaS landing.
- You need explicit **gates** so lab/playful work does not inherit commercial typography density (or vice versa).

## Canonical reference

Load and follow **`pn-core://reference/embedded-studio-dna.md`** before proposing tokens, layout, or motion. That file defines principles, dual registers, evidence strips, motion/embed rules, and link hygiene.

## Instructions

1. **Confirm register:** Commercial/lead vs lab/R&D for this surface (see reference). If mixed, zone the page (hero vs sections).
1b. **Sibling WIP corpus:** Read **`pn-core://reference/embedded-studio-dna.md`** section *Research corpus: sibling WIP projects*. When the workspace or user path matches the maintainer dev layout, resolve **`PNCORE_STUDIO_DEV_ROOT`** (or `X:/00_active_sync/dev` on that layout) and align the current build with **listed sibling repos** only where register and stack match—patterns, not asset theft.
2. **Merge with house context:** If `.pncore-design.md` exists, reconcile its audience and ambition with the DNA principles; DNA wins on **structure and evidence** patterns, project file wins on **named brand** constraints.
3. **Plan:** Prefer page modes **Portfolio** or **Editorial** from **pn-frontend-design-philosophy**; map three typography layers to display / reading / utility meta.
4. **Implement:** Apply **pn-frontend-design**, **pn-typography**, **pn-css-styling**, **pn-animation** as needed; keep embeds performant and a11y-safe per reference.
5. **Pre-ship:** Run **AI Slop Test** from **pn-frontend-design**; verify reduced-motion path; spot-check curated URLs (optional **`npm run check:embedded-studio-urls`** when URLs are configured).

## Integration

- **pn-design-dna** — Full command that loads this skill then chains **pn-design** / `workflow_step("design")`.
- **pn-frontend-developer** — Agent should load this skill when portfolio/reel/lab UI is in scope.
- **pn-assets-manager** — When hero and stills must match cinematic evidence strips.
- **pn-cultural-heritage-research** — If period or museum grounding applies; DNA handles **studio presentation**, not historical fact tiers.

## Output

- UI or spec that matches the reference principles, with register choice stated once in the plan or PR description.
- Optional list of **embed IDs and canonical URLs** for maintenance.

## Guardrails

- Do not treat DNA as permission to skip **a11y**, **contrast**, or **privacy** defaults on embeds.
- DNA is **not** a substitute for project-specific brand guidelines when the client is not the studio itself.
