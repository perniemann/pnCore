---
name: pn-game-logic
description: "Guides game loops, state machines, input handling, collision, scoring, and save state. Use when implementing game logic; covers architecture patterns for 2D/3D games."
---

# Game logic skill

## When to use

- Implementing or refactoring game loop architecture
- Managing game states (menu, play, pause, gameover)
- Handling input (keyboard, mouse, gamepad)
- Implementing collision detection or spatial partitioning
- Adding scoring, progression, or save/load
- Structuring game logic for testability

## Game loop

1. **Fixed timestep:** Use a fixed delta (e.g. 1/60s) for physics and deterministic logic. Accumulate elapsed time and step in fixed increments to avoid spiral of death.
2. **Accumulator pattern:** `accumulator += delta; while (accumulator >= FIXED_STEP) { update(); accumulator -= FIXED_STEP; }`. Cap accumulator to avoid large catch-up steps.
3. **Render interpolation:** For smooth visuals, interpolate between last and current physics state using `accumulator / FIXED_STEP` when rendering.
4. **Single loop:** Use one render loop with `requestAnimationFrame`. Separate `update(delta)` (logic) from `render()` (draw).

## State machines

- **Game states:** Model high-level states (menu, play, pause, gameover, settings). Use explicit state enum or state machine (e.g. `currentState`, `enter()`, `exit()`, `update()`).
- **Transitions:** Define valid transitions; guard against invalid state changes. Use events or callbacks for state entry/exit (e.g. play music on play, pause physics on pause).
- **Sub-states:** For complex flows (e.g. play → cutscene → play), use nested or hierarchical state machines when needed.

## Input handling

- **Action mapping:** Map raw keys/buttons to logical actions (e.g. "jump", "move", "shoot"). Decouple input from game logic for rebinding and multiple devices.
- **Input buffering:** For responsive controls, buffer inputs for a short window (e.g. jump buffer so late jump still registers). Clear buffer on consume.
- **Gamepad:** Normalize axes and buttons across devices. Use `navigator.getGamepads()` or a library (e.g. gamepad API wrapper) for consistent access.
- **Order:** Process input → update logic → render. Avoid reading input mid-update.

## Collision detection

- **AABB / spheres:** Use simple shapes first. AABB for boxes, sphere for circular objects. Use spatial partitioning (grid, quadtree, BVH) when many objects.
- **Spatial partitioning:** For N×N checks, use grid or quadtree to reduce to nearby pairs only. Update partitioning when objects move.
- **Physics engine:** When using Rapier/Cannon-es, define collision groups and filters. Let the engine handle broad/narrow phase; sync game state from collision callbacks.
- **Separation of concerns:** Collision logic (who hit whom, damage) separate from physics (positions, velocities). Use events or callbacks to notify game logic.

## Scoring and progression

- **Score:** Keep score in game state; update on events (enemy killed, item collected). Emit events for UI to react.
- **Levels:** Use level data (JSON, scriptable) rather than hardcoding. Load level on transition; reset or persist state as needed.
- **Progression:** Track unlocks, achievements, or milestones in a separate structure. Persist to localStorage or backend when appropriate.

## Save state

- **Serialization:** Save only serializable state (numbers, strings, arrays, plain objects). Avoid functions, DOM, or engine-specific handles.
- **Checkpoints:** Save at defined points (level start, checkpoint reached). Restore full game state from checkpoint on death or load.
- **Persistence:** Use `localStorage` or IndexedDB for browser. Consider compression or delta encoding for large state.
- **Versioning:** Include save format version for forward compatibility when schema changes.

## ECS (Entity-Component-System) patterns

- **Entities:** IDs or handles; no logic.
- **Components:** Data only (position, velocity, health, sprite).
- **Systems:** Logic that iterates entities with matching components (e.g. movement system updates all with position+velocity).
- **When to use:** Prefer ECS for many similar objects (enemies, bullets, particles). Overkill for small games; use when scaling complexity.

## Update order

- **Deterministic order:** Define clear update order (e.g. input → physics → game logic → animation → render). Document it.
- **Dependencies:** Ensure systems that depend on others run after (e.g. AI after physics).
- **Testability:** Keep game logic pure where possible; inject time and input for deterministic tests.

## Output

- Game logic with clear separation from render and input.
- Predictable, testable behavior. Reference pn-threejs-core for scene, assets, and rendering.
