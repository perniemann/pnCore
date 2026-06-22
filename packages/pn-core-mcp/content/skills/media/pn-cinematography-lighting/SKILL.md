---
name: pn-cinematography-lighting
description: Cinematography and lighting vocabulary for generative media—shot size, axis, coverage, lenses, motivated light, contrast ratios, color temperature, continuity. Use with pn-generative-media-director and pn-image-prompt-engineering.
---

# Cinematography and lighting

## When to use

- Translating a creative brief into **prompt- and graph-friendly** camera and light language.
- Maintaining **axis, eyeline, and light direction** across shots or video segments.
- Choosing lens feel (wide vs long), depth cues, and contrast mood without contradicting physics.

## Vocabulary layers

Apply in order: **shot size** → **angle** → **lens feel** → **lighting** → **color** → **motion** (for video).

### Shot size and framing

- ECU / CU / MCU / MS / FS / WS / establishing—state subject placement and headroom.
- **Axis:** Keep screen direction consistent (180° rule) unless breaking for effect; name the break.

### Lenses and depth

- Express as **focal length feel** (e.g. ~24mm wide, ~50mm normal, ~85mm portrait) and **aperture behavior** (shallow vs deep focus) without faking impossible optics unless stylized.
- **Depth cues:** separation via light, haze, parallax, focus roll-off.

### Lighting

- **Motivated sources:** windows, practicals, moonlight, overcast sky—key direction matches shadow falloff.
- **Key-to-fill ratio:** high ratio = drama; low ratio = comedy or beauty.
- **Color temperature:** mix sources deliberately (warm tungsten vs cool daylight) and state balance or intentional clash.
- **Quality:** hard vs soft (source size relative to subject), bounce vs direct, wrap vs rim.

### Continuity

- Lock **eye light**, **key side**, and **background luminance** across matching shots; flag when a new segment must relight.

## Workflow

1. Extract story beats and emotional register from the user brief.
2. Choose a **lighting schema** (e.g. single soft key + low fill + cool rim) and **camera grammar** (e.g. slow push-in, OTS two-shot).
3. Emit a **prompt clause block** (positive) and **avoid list** (negative) aligned with pn-image-prompt-engineering layering.
4. For video, add **per-segment** notes: what moves, what stays fixed, and seam risks.

## Guardrails

- Shadows and highlights must agree with stated light direction and material reflectance.
- Avoid contradictory cues (e.g. “hard noon sun” with “soft wrap beauty fill” unless labeled as stylized).
- Sensitive depictions: no sexualized minors; no non-consensual intimate imagery; respect likeness and publicity rights.

## Integration

- **pn-generative-media-director** — Primary agent combining this with pipeline choices.
- **pn-image-prompt-engineering** — Maps this vocabulary into layered prompts.
- **pn-comfyui-workflows** — When conditioning nodes need explicit strength and ordering.
