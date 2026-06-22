---
name: pn-spatial-ux-patterns
description: Spatial interaction design, AR/VR/XR UX patterns. Depth, scale, ergonomics, interaction zones, text legibility. Use for immersive interface design.
---

# Spatial UX patterns

## When to use

- AR/VR/XR interface design.
- Spatial interaction patterns.
- 3D UI placement, depth, layout.
- Immersive UX for headsets and spatial displays.

## Workflow

1. **Context:** Platform (Quest 3, Vision Pro, HoloLens, browser WebXR), use case, user posture (seated, standing, walking).
2. **Architecture:** UI placement, depth layers, interaction zones.
3. **Patterns:** Apply the patterns documented below for menus, controls, and feedback in 3D space.
4. **Document:** Specs for implementation.

---

## Depth layers

Organize UI and world content into three depth zones:

| Zone | Distance | Use |
|------|----------|-----|
| **Near** | < 0.5 m | Direct manipulation, hand tracking menus, pinch targets |
| **Mid** | 0.5 – 2 m | Primary content panels, action buttons, gaze-and-commit controls |
| **Far** | > 2 m | Ambient information, world labels, navigation waypoints |

- Never place interactive elements closer than ~0.4 m — creates eye strain and missed tracking.
- Never use a far-zone element for a critical action; bring it to mid-zone when interaction is needed.
- Use depth cues (subtle shadow, scale-at-distance, opacity falloff) to reinforce layer hierarchy.

---

## Ergonomic gaze angles

Keep interactive content within the comfortable gaze cone:

- **Horizontal:** ±35° from forward axis (Quest 3 / Vision Pro recommendation)
- **Vertical:** −20° (below horizon) to +10° (above horizon) — users rest gaze slightly below horizontal
- Avoid placing primary actions at extreme angles; use anchor points that follow the user's head rotation lazily (lag = 0.2–0.3 s) to keep content in zone without snapping.

---

## Interaction zones and input models

| Zone | Distance | Primary input |
|------|----------|--------------|
| Direct touch | < 0.5 m | Hand-tracking: pinch, poke, palm |
| Ray cast / point | 0.5 – 2 m | Gaze + commit, controller ray, vision OS eye + hand |
| Voice / ambient | > 2 m | Voice commands, passive awareness |

- For **Quest 3 / Vision Pro:** implement at minimum ray-cast + pinch. Hand tracking is the primary modality; controller as fallback.
- For **WebXR (browser):** use `XRSession` `select` event for primary action; `selectstart`/`selectend` for hold. Support both controller (`XRInputSource.targetRayMode = 'tracked-pointer'`) and gaze (`'gaze'`).
- Provide visual feedback on hover/proximity (highlight, scale pulse) within 0.1 s of gaze entry — response latency above 150 ms feels broken in XR.

---

## Text legibility at distance

| Platform | Min readable font size | Reference distance |
|----------|------------------------|-------------------|
| Quest 3 | 20 sp / ~20pt world | 1 m |
| Vision Pro | 17 sp (SwiftUI) | 1 m |
| HoloLens 2 | 18pt holographic | 1 m |
| WebXR (browser) | 24px canvas text | 1 m |

- Scale world-space text linearly with distance: `worldSize = screenPt × distance / 1m`.
- Use high-contrast text (≥ 4.5:1 on background) — HDR passthrough washes out low-contrast labels.
- Prefer light text on dark translucent panels (reduces contrast competition with the real world in AR).
- Line length: ≤ 40 characters at 1 m; ≤ 60 at 2 m. Wider lines at distance require excessive head movement.

---

## Comfort and safety

- **Locomotion:** Prefer teleportation or smooth locomotion with vignette; avoid continuous rotation for users prone to motion sickness.
- **Scale:** Default world scale 1 unit = 1 m. Do not distort scale of user's avatar or immediate surroundings.
- **Safe zone:** Keep critical UI anchored to the user's view frustum but with a lazy follow (slerp) — avoid rigid head-lock except for notifications.
- **Accessibility:** Support seated and standing modes. Provide manual height calibration. Never assume floor-relative positions.

---

## Integration

- **pn-ux-patterns** — Adapted for 3D (focus, feedback, affordances).
- **pn-game-developer** — Three.js, WebXR; pn-visionos-engineer, pn-webxr-developer agents for platform-specific implementation.
