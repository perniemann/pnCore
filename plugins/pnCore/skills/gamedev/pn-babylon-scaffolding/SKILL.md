---
name: pn-babylon-scaffolding
description: Scaffolds minimal Babylon.js scene: engine, canvas, scene, camera, lighting, first mesh. Use when starting a new 3D project or adding a scene. Reference pn-babylon-dev and pn-threejs-core for patterns.
---

# Babylon.js scaffolding

## When to use

- Starting a new Babylon.js 3D project
- Adding a minimal scene (engine, canvas, camera, lighting)
- Setting up the first mesh or basic scene structure

## Minimal scene

1. **Engine and canvas:** Create `Engine` with canvas element; handle resize. Use `engine.runRenderLoop()` for the loop.
2. **Scene:** Create `Scene` with optional `clearColor`. Attach to engine.
3. **Camera:** Use `ArcRotateCamera` for orbit, or `UniversalCamera` for FPS. Attach controls if needed.
4. **Lighting:** Add `HemisphericLight` as base; `DirectionalLight` or `PointLight` for key light.
5. **First mesh:** Add `MeshBuilder.CreateBox` or `CreateSphere` for placeholder. Use `StandardMaterial` or `PBRMaterial`.
6. **Disposal:** On unmount or scene switch, dispose scene and engine. Reference pn-babylon rule.

## HTML + script setup

- One HTML file with `<canvas id="renderCanvas">` and script tag, or use a bundler (Vite, webpack) for TypeScript/ESM.
- Import from `@babylonjs/core` or CDN. Prefer npm + bundler for production.

## One at a time

- Prefer scaffolding one scene or one feature per change. Add assets (GLTF loader) after base scene works.

## Output

- Working scene with engine, camera, light, and at least one mesh.
- Disposal on teardown. Reference pn-babylon-dev for asset loading and performance.

## Guardrails

- **pn-babylon-dev** — Scene structure, assets, camera, lighting, performance.
- **pn-babylon** — Rule for file-glob activation and disposal.
