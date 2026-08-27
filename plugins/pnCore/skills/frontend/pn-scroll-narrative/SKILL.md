---
name: pn-scroll-narrative
description: "Journey-first procedure for scroll-told marketing pages: Narrative Map, one peak, CSS scroll-driven or GSAP pin/scrub, timeline evidence. Use when the user or Design Read asks for a scroll-told story, scrollytelling, or pin/scrub film — not when MOTION_INTENSITY is merely high."
---

# Scroll narrative

A conversion landing is a document the visitor acts on. A scroll narrative is a sequence the visitor travels. This skill is the second job. Do not use it as a restyle of `pn-landing-page`.

## When to use

- The user asks for a scroll-told story, scrollytelling, a pin/scrub film, or “not a SaaS template landing.”
- Design Read page kind is **editorial scroll-story** (`pn-core://reference/design-intent.md`).
- Discovery or the brief names a scroll narrative as the deliverable.

**Do not use** when the page is a Tool/app, a conversion form, or a default SaaS / agency / portfolio landing — even if `MOTION_INTENSITY` is 7–10. High motion is a consider hint, not a trigger. Stay on `pn-landing-page`.

## Workflow

### 1. Confirm the fork

State **conversion document** (`pn-landing-page`) or **scroll narrative** (this skill). Ask only what Design Read does not already answer. If the ask is a normal marketing landing with some motion, stop and use `pn-landing-page`.

### 2. Narrative Map (before code)

Write the map in the plan. Beats first; devices second.

| Field | Rule |
|-------|------|
| **Beats** | 4–7 shifts in what the visitor *learns*. A section with no beat is cut. |
| **Feeling sequence** | One emotion per beat, plus the on-screen cause. Adjacent beats with the same feeling: cut or change one. |
| **Peak** | One visitor-side remember-sentence (“it’s the site where ___”). One peak. Three peaks is none. |
| **Remembered interaction** | One page-local behavior that is not a retuned stagger, easing, or card count. Skill rule, not a ship-blocker. |

Peak-end (Kahneman): people remember the peak and the ending. Give the peak the most scroll room and a quieter beat in front of it. The last screen must resolve with content on it — not a fade to footer.

If this repo’s last marketing page used the same open + close + peak device, change the plan. Do not keep a fingerprint file.

### 3. Two structural forks

Pick one of each. Do not invent a grammar catalog.

1. **Continuous space** (one stage the scroll travels) vs **chaptered scenes** (hard cuts, new ground per chapter).
2. **CSS scroll-driven first** when nothing is pinned. **GSAP ScrollTrigger** when a pin or video-scrub is required (`get_skill("pn-gsap")`).

### 4. Motion score

Assign each beat a pattern. Map every animation to Reveal / Orient / Confirm / Delight via `get_skill("pn-animation")`. Defer reduced-motion mechanics to that skill (`gsap.matchMedia`, CSS `animation-timeline: auto`); content must remain readable with end states visible (WCAG 2.3.3 / 2.2.2).

| Rule | Limit |
|------|-------|
| Pattern variety | Do not repeat the same scroll pattern in consecutive beats |
| Video-scrub | At most two sections |
| Length | 8–14 viewport-heights total |
| Pins | One pinned sequence unless the map names a second and why |

Prefer owned media. Generate only through `pn-assets-manager` / `pn-image-creator` gates.

### 5. Build

Use the project stack (`pn-frontend-design`, scaffolding, tokens). Real markup: selectable text, real links, logical reading order. Do not bake headlines into images.

### 6. Verify

Run `get_skill("pn-evidence-qa")` timeline sampling and the pinned-control keyboard pass. Then the **feel-check**: scroll once at reading pace, write one word per beat, *then* open the Narrative Map and diff. Where they disagree, the page is wrong — do not rewrite the map to match the accident.

Headless Chrome is not a real phone. Say what you did not verify (iOS video, touch, Low Power Mode).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Loading this skill because MOTION is 8 | Agency/designer presets are already 7–8. Confirm narrative intent. |
| Six identical pin-reveals | Variety rule. Change the pattern or cut beats. |
| Meaning only in the motion | Reduced-motion users must still get the story. |
| Three “hero” moments | Demote two. One peak. |
| Skipping timeline shots with a sentence | N-03 skip requires a motion map with **zero** scroll triggers. |

## Example prompts

**Cold start:**
> Using `pn-scroll-narrative`, build a scroll-told story for a landscape studio — chaptered scenes, one peak, owned photography only.

**Warm start:**
> This marketing page is a six-section SaaS template. Using `pn-scroll-narrative`, rewrite it as an editorial scroll-story with a Narrative Map first.

**Format-specific:**
> Using `pn-scroll-narrative`, implement the map with CSS `animation-timeline: view()` only — no pin, no GSAP.

**Iterate:**
> Beats 3 and 4 both read as “awe.” Cut one and move the peak to the quieter beat’s following section.

## Integration

- **pn-landing-page** — conversion documents; fork here only on narrative intent.
- **pn-animation** — motion roles, budgets, reduced-motion.
- **pn-gsap** — pin, scrub, `useGSAP` when CSS scroll-driven is not enough.
- **pn-evidence-qa** — timeline samples + pinned keyboard pass.
- **pn-preflight** — N-01–N-04 when narrative intent is in play (`pn-core://reference/marketing-ship-gate.md`).
- **design-intent** — `pn-core://reference/design-intent.md` (Narrative Map required on intent).

## Output

- Narrative Map in the plan (beats, feeling sequence, one peak, remembered interaction).
- Implemented page on the project stack.
- Timeline evidence (or N-03 skip only if the motion map has zero scroll triggers).
- Feel-check diff: intended sequence vs felt sequence.
- Preflight N-01–N-04 when this skill applied.
