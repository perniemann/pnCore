---
name: pn-gamedev-philosophy
description: Defines an authoritative game and real-time 3D design rulebook. Use when building games, Three.js/WebGL scenes, or real-time experiences. Aligns with fixed timestep, frame budget, disposal discipline, and performance-first practices (current).
---

# Game Development Philosophy

## Purpose

Use this as a game and real-time 3D design rulebook for:

- Game loops and state machines
- Three.js / WebGL / WebGPU scenes
- Real-time physics and animation
- Asset loading and disposal
- Performance-critical rendering
- Input handling and update order

It is engine-agnostic where possible and aligned with current industry practices.

## When to use

- Designing game architecture or real-time loops
- Structuring Three.js/R3F scenes or WebGL projects
- Reviewing performance, disposal, or timestep logic
- Establishing gamedev standards for a team or AI agent
- Auditing frame budget, LOD, or memory management
- Building tools, prototypes, or shipped games

For workflow, audit checklist, and templates, see [reference.md](reference.md).

---

## Core Philosophy (non-negotiables)

### Fixed timestep for physics

Physics and deterministic logic use a fixed delta (e.g. 1/60s). Variable delta causes numerical drift, collision tunneling, and non-determinism across hardware. Accumulate elapsed time; step in fixed increments; cap accumulator to avoid spiral of death.

### Frame budget is law

Target refresh rate defines the budget (60 FPS ≈ 16.7ms, 120 Hz ≈ 8.3ms per frame). Profile to identify CPU vs GPU bottlenecks. Leave 1–2ms safety margin for spikes. Optimize the dominant cost first.

### Disposal before allocation

WebGL does not auto-free. Geometries, materials, textures, render targets must be disposed when no longer needed. Dispose before removing references. Monitor `renderer.info.memory`; avoid per-frame allocations in hot paths.

### Update order is explicit

Define and document: input → physics → game logic → animation → render. Systems that depend on others run after. No hidden ordering; deterministic and testable.

### Hierarchy carries intent

Group objects logically (environment, characters, UI, effects). Use consistent naming (e.g. `env_ground`, `char_player`). Hierarchy enables correct transforms, visibility toggles, and disposal.

### State machines over ad-hoc flags

Model high-level states (menu, play, pause, gameover) as explicit state machines. Valid transitions; guard against invalid changes. Events on entry/exit. Avoid scattered booleans.

---

## Design Rulebook (Do / Don't)

### A) Game Loop Rules

**Do**

- Use fixed timestep for physics and deterministic logic
- Use accumulator pattern; cap catch-up steps
- Interpolate between physics states for smooth visuals
- Run one render loop; separate `update(delta)` from `render()`
- Document update order

**Don't**

- Don't use variable delta for physics—it causes drift
- Don't let accumulator grow unbounded (spiral of death)
- Don't read input mid-update; process input first
- Don't mix game logic and rendering in the same pass

### B) Scene and Asset Rules

**Do**

- Group objects with clear hierarchy and naming
- Dispose geometries, materials, textures, render targets when removed
- Use LoadingManager for progress UI; centralize loaders
- Use compressed formats (KTX2, Draco) for large assets
- Reuse loaded assets across instances; avoid duplicate fetches

**Don't**

- Don't assume WebGL auto-frees—explicit dispose required
- Don't allocate objects in render loop hot paths
- Don't load the same model multiple times
- Don't skip disposal when switching scenes

### C) Performance Rules

**Do**

- Define frame time budget and profile against it
- Use InstancedMesh for repeated objects; merge static meshes
- Implement LOD for distant objects
- Limit shadow-casting lights; prefer baked for static
- Use frustum culling; avoid rendering off-screen
- Target the device's native refresh rate: 60 Hz for standard web/desktop, 90 Hz for Meta Quest 3 and Apple Vision Pro, 120 Hz for Meta Quest Pro and high-refresh displays; throttle to 30 on mobile web for battery

**Don't**

- Don't optimize without profiling first
- Don't stack expensive effects (shadows, post-processing) without budget check
- Don't create per-frame objects in hot paths
- Don't ignore GPU memory (textures, buffers)

### D) State and Input Rules

**Do**

- Map raw input to logical actions (jump, move, shoot)
- Use input buffering for responsive controls
- Define valid state transitions; guard invalid changes
- Use events/callbacks for state entry/exit
- Serialize only plain data for save/load

**Don't**

- Don't couple input directly to game logic (decouple for rebinding)
- Don't use scattered booleans instead of state machines
- Don't save DOM, functions, or engine handles
- Don't assume input order across devices

### E) Physics Rules

**Do**

- Run physics in fixed timestep
- Sync Three.js positions from physics bodies after step
- Use collision groups/filters to reduce checks
- Separate collision logic (damage, scoring) from physics (positions, velocities)

**Don't**

- Don't run physics at variable rate
- Don't update physics mid-render
- Don't put game logic inside physics callbacks without care for order

### F) Post-Processing Rules

**Do**

- Order passes explicitly (document or name constants)
- Use half- or quarter-resolution for expensive passes when acceptable
- Profile pass count and resolution
- Dispose custom render targets when done

**Don't**

- Don't add passes without budget impact check
- Don't assume pass order is obvious—document it
- Don't leak render targets

---

## Final Principle

The target is not "it looks good in the editor."

It is:

**Fixed timestep + frame budget + explicit disposal + clear hierarchy + deterministic state.**

That is the rulebook.
