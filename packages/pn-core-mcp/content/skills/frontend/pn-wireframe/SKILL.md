---
name: pn-wireframe
description: "Produce a low-fidelity structural layout (information hierarchy, regions, components) from discovery spec before typography and tokens. Use when aligning on structure before high-fidelity design or build."
---

# Wireframe skill

## When to use

- Before design plan for multi-section pages, landing pages, dashboards, or flows
- When the user requests structural alignment first (layout, hierarchy, regions)
- As part of design workflow: after discovery, before typography and tokens
- When stakeholder feedback on structure is needed before investing in visual design

## Process

Wireframes establish structure before aesthetics. Per Nielsen Norman Group, they visualize user paths, page layouts, information hierarchy, and interactions; fidelity can range from quick sketches to detailed representations.

### 1. Input

- Discovery spec (purpose, tone, target users, core functionality) — from pn-discovery-questionnaire when available
- Or: user's request with at least purpose and tone

### 2. Structural layout

Produce a low-fidelity layout that defines:

- **Regions:** Main content areas, navigation placement, header/footer
- **Information hierarchy:** What is primary (e.g. hero, main CTA) vs secondary
- **Component placement:** Where key blocks go (hero, sections, forms, CTAs)
- **User flow:** How users move between areas or steps

Output format: ASCII layout or structured Markdown (sections, regions, component tree). Examples:

```
+------------------------------------------+
| [Nav]              [Search]              |
+------------------------------------------+
|                                          |
|  [Hero: headline, CTA, visual]            |
|                                          |
+------------------------------------------+
|  [Section 1]    |  [Section 2]            |
|  ...           |  ...                    |
+------------------------------------------+
|  [Footer]                                |
+------------------------------------------+
```

Or as a component tree:

- Page
  - NavBar (top)
  - Hero (primary CTA, headline)
  - FeatureGrid (3 columns)
  - SocialProof
  - CTA band
  - Footer

### 3. Conventions (per NNG)

- Images: rectangle with X
- Body text: thinner lines
- Headers: thicker lines
- Buttons: rectangle with label for CTAs
- Navigation: indicate position (horizontal/vertical), current state if relevant

Keep it messy and low-fidelity; avoid colors, fonts, and pixel-perfect detail.

### 4. Gate

Output: "Wireframe complete. Proceed to design plan (typography, tokens, components)? Reply 'yes' or revise." Do not proceed to pn-frontend-design or build until user confirms.

## Output

- Structural layout artifact: `docs/wireframes/YYYY-MM-DD-<slug>.md` or inline in plan
- Clear regions and component placement
- Confirmation gate before design plan

## Integration

- **Design workflow:** Use after discovery (step 0), before design plan (step 1). When present, design plan can reference wireframeSpec.
- **Related skills:** pn-frontend-design-philosophy (page modes, component blocks); pn-landing-page (hero, sections, CTA placement); pn-frontend-design (high-fidelity build).

## Sources (validation)

- Nielsen Norman Group: [How to Draw a Wireframe (Even if You Can't Draw)](https://www.nngroup.com/articles/draw-wireframe-even-if-you-cant-draw/) — Wireframes visualize user paths, page layouts, information hierarchy, and interactions; fidelity from quick sketches to detailed; messy is acceptable for early work.

- Nielsen Norman Group: [Promptframes: Evolving the Wireframe for the Age of AI](https://www.nngroup.com/articles/promptframes/) — Process: Sketch → Wireframe → Promptframe → Prototype; wireframes are the foundation for early-stage design; conduct early-stage work with "sketches and simple wireframes."
