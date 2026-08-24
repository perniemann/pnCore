---
title: "ADR-0014: Scroll-narrative procedure without cloning third-party skills"
updated: 2026-08-24
---

# ADR-0014: Scroll-narrative procedure without cloning third-party skills

## Status

Accepted

## Context

`pn-frontend-design-philosophy` names **Editorial / scrollytelling** as a page job. `pn-landing-page` still encodes a conversion document (hero → features → proof → pricing → CTA). `pn-animation` and `pn-gsap` document pin/scrub *implementation*. `pn-evidence-qa` photographs screens, not scroll progress.

Public cinematic-landing skills (studied: [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft), MIT) package a frozen engine, a grammar catalog, a fingerprint registry, and a Playwright scroll harness. pnCore already rejected that shape for Taste Skill in [ADR-0005](0005-design-skill-taste-parity.md): native procedure and gates, not a port.

A first draft of this work used `MOTION_INTENSITY >= 7` as the load trigger. That collides with house presets: Landing (agency) is already motion **8**, Portfolio (designer) is already **7**. The dial measures loudness, not “this page is a scroll-told story.”

## Decision

**v1 (this ADR):**

1. Add skill **`pn-scroll-narrative`**: interview → Narrative Map (beats, feeling sequence, one peak, remembered interaction) → CSS scroll-driven when there is no pin, GSAP when pin or video-scrub is required → timeline evidence via `pn-evidence-qa`.
2. Extend `pn-core://reference/design-intent.md` with **narrative intent** (user ask, Design Read page kind **editorial scroll-story**, or discovery that names a scroll narrative). High motion is a *consider* hint only.
3. Extend `pn-core://reference/marketing-ship-gate.md` with addendum **N-01–N-04**, applied only when narrative intent is in play. `pn-preflight` NO-GO on any failing N-ID.
4. Extend `pn-evidence-qa` with timeline sampling (~6 positions) and a keyboard pass on pinned interactive controls.
5. Wire only load-paths that change behavior: design-intent, `pn-landing-page` fork, `pn-design` / `workflow_step("design")`, `pn-preflight`, `pn-evidence-qa`.

**Activation (required):** any one of:

- User asks for a scroll-told story, scrollytelling, pin/scrub film, or “not a SaaS template landing.”
- Design Read page kind is **editorial scroll-story**.
- Discovery / brief names a scroll narrative as the deliverable.

**Not a trigger:** `MOTION_INTENSITY >= 7` alone.

**Non-goals (v1):**

- Cloning a third-party engine, `data-*` API, encode/scrub scripts, eight-way grammar kit, or fingerprint registry.
- Video-for-scrub encode pipelines or a Playwright contact-sheet package.
- N-05 “remembered interaction is not a parameter tweak” as a ship-blocker (skill rule only).
- Catalog / agent / aesthetics-baseline one-liners (follow-up if retrieval misses the skill).

**Companion skills:** Teams may install a third-party cinematic skill for a frozen runtime. **`.pncore-design.md` and pnCore workflow gates take precedence** on conflict.

**Attribution:** Peak-end is Kahneman; scrollytelling is journalism practice; pin/scrub are GSAP ScrollTrigger terms; CSS scroll-driven animations are a CSSWG module; reduced-motion maps to WCAG 2.3.3 / 2.2.2. pnCore tables and names (Narrative Map, narrative intent, N-01–N-04) are native formulations. Scrollcraft was studied as prior art and is not cloned.

## Consequences

- **Positive:** Cinematic marketing pages get a journey-before-devices procedure and scroll-position evidence without forcing agency/portfolio presets into a film recipe.
- **Negative:** Agents may miss the skill until they hit the landing-page fork or design-intent paragraph. Mitigation: explicit `get_skill("pn-scroll-narrative")` in those load-paths.
- **Audit:** ADR-0002 quarterly pass includes `pn-scroll-narrative` and the N-* addendum.
- **MCP workflow:** `workflow_step("design", …)` plan and build steps must mention narrative intent (parity with `pn-design`).

## v1 success criteria

A `pn-design` run with Design Read “editorial scroll-story” produces a Narrative Map, loads `pn-scroll-narrative`, and emits N-01–N-04 at preflight. A `pn-design` run on Landing (agency) with motion 8 and no narrative ask does **not** require the skill or the N-* table.

## References

- [ADR-0005: Marketing UI design intent and ship gates](0005-design-skill-taste-parity.md)
- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- [ADR-0010: Skill EVAL convention](0010-skill-evals-and-link-checking.md)
- `packages/pn-core-mcp/content/skills/frontend/pn-scroll-narrative/SKILL.md`
- `packages/pn-core-mcp/content/reference/design-intent.md`
- `packages/pn-core-mcp/content/reference/marketing-ship-gate.md`
