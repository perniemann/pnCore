---
name: pn-threejs-core
description: Guides Three.js scenes, cameras, lighting, asset loading, animation, physics, and performance. Use when working on Three.js; covers scene structure, R3F/Drei patterns, WebGPU migration (r171+), TSL shaders, and compute shaders.
---

# Three.js core skill

## When to use

- Structuring or refactoring a Three.js scene
- Adding or configuring cameras, lights, or materials
- Loading and managing assets (GLTF, textures, Draco, KTX2)
- Implementing or tuning animations
- Integrating physics (Rapier, Cannon-es)
- Optimizing draw calls, LOD, or culling
- Migrating to WebGPU (Three.js r171+)
- Using React Three Fiber (R3F) or Drei

## Scene structure

1. **Hierarchy:** Group objects logically (e.g. `scene.add(group)`) with clear names. Use groups for: environment, characters, UI overlays, effects. Ensures correct transforms and makes dispose/visibility easier.
2. **Naming:** Use consistent prefixes or suffixes (e.g. `env_ground`, `char_player`, `fx_particles`) so objects can be found and disposed correctly.
3. **Disposal:** When removing meshes or switching scenes, dispose of geometries, materials, and textures. Reuse where it avoids repeated allocation (e.g. instanced meshes, shared materials). Call `dispose()` on resources before removing references.

## Camera management

- **Orbit:** Use OrbitControls for editor-style or exploration cameras. Set `enableDamping`, `dampingFactor`, and `minDistance`/`maxDistance` for smooth feel.
- **Follow:** For third-person games, interpolate camera position toward a target (lerp or smooth damp). Keep camera behind and above the player; handle wall clipping.
- **Cinematic:** Use keyframe-based paths or splines for cutscenes. Separate camera logic from gameplay camera.

## Lighting

- **Baked vs realtime:** Prefer baked lighting (lightmaps) for static scenes when possible. Use realtime lights sparingly; limit count for mobile.
- **Light probes:** Use `LightProbe` or `ReflectionProbe` for ambient/reflection when available. Reduces per-object setup.
- **Shadows:** Limit shadow-casting lights; use `castShadow`/`receiveShadow` only where needed. Tune `shadowMapSize`, `bias`, and `radius` to avoid artifacts.

## Asset loading

- **GLTF/GLB:** Use `GLTFLoader`; prefer GLB for single-file. Use Draco compression (`DRACOLoader`) for large meshes.
- **Textures:** Use KTX2 (`KTX2Loader`) for compressed textures when supported. Set `colorSpace` (e.g. `SRGBColorSpace`) and `flipY` correctly.
- **Loading managers:** Use `LoadingManager` for progress UI. Centralize loaders to avoid duplicate fetches.
- **Caching:** Reuse loaded assets across instances; avoid loading the same model multiple times.

## Animation

- **AnimationMixer:** Use one mixer per scene or per object. Call `mixer.update(delta)` in the render loop.
- **Morph targets:** Use `morphTargetInfluences` for blend shapes. Keep target count reasonable for performance.
- **Skeletal:** Use `SkinnedMesh` with `Skeleton`; ensure bones are correctly parented and bound.

## Physics integration

- **Rapier / Cannon-es:** Run physics in a fixed timestep (e.g. 1/60s). Update physics state before render; sync Three.js positions from physics bodies.
- **Collision layers:** Use layers or groups to avoid unnecessary collision checks when possible.

## Postprocessing

- **Pass order:** List passes in the order they run (e.g. pass1 → pass2 → toScreen). Document or name constants so reordering doesn't break the intended look.
- **Performance:** Keep pass count and resolution appropriate. Use half-resolution or quarter-resolution for expensive passes when acceptable.
- **Custom passes:** Use `ShaderMaterial` with `EffectComposer` or a postprocessing library. See pn-shader-authoring skill for custom effects.

## Performance

- **Draw calls:** Prefer fewer draw calls (instancing, batching), merge meshes when static.
- **Allocations:** Avoid per-frame object creation in hot paths, reuse objects and buffers.
- **LOD:** Use `LOD` for distant objects; reduce geometry or switch to impostors.
- **Culling:** Use `FrustumCulling`; ensure objects outside view are not rendered. Consider occlusion culling for large scenes.
- **Profiling:** Use Three.js `WebGLRenderer.info` or browser devtools to identify bottlenecks.

## React Three Fiber (R3F) / Drei

- **Canvas:** Use `<Canvas>` with appropriate `gl` props (antialias, alpha, pixelRatio). Prefer `frameloop="demand"` when not animating.
- **Hooks:** Use `useFrame` for per-frame logic; `useThree` for renderer/scene/camera. Keep `useFrame` callbacks lightweight.
- **Drei:** Use `Environment`, `OrbitControls`, `Html`, `Float`, etc. for common patterns. Check Drei docs for latest helpers.
- **Disposal:** R3F disposes by default when components unmount; ensure custom resources are cleaned up.

## WebGPU migration (r171+)

- **WebGPURenderer:** Use when targeting modern browsers. Requires `adapter` and `device` setup. Swap `WebGLRenderer` for `WebGPURenderer`; Three.js handles fallback to WebGL 2 when WebGPU is unavailable.
- **Compatibility:** Fall back to `WebGLRenderer` when WebGPU is unavailable. Test both paths. All major browsers support WebGPU as of 2026.
- **TSL (Three Shader Language):** Prefer TSL over raw GLSL/WGSL when migrating custom shaders. TSL compiles to both WGSL and GLSL, providing portability. Avoid manual GLSL→WGSL conversion when possible.
- **Shader changes:** If not using TSL, update shaders for WGSL differences. See pn-shader-authoring for GLSL patterns.

## Compute shaders (WebGPU)

- **When to use:** Particle systems (50k+), physics simulations, ML inference. Compute shaders unlock 10–100x gains for GPU-bound workloads.
- **Patterns:** Use `WebGPURenderer` compute passes for particle updates, fluid sims, or data-parallel work. Offload from CPU when draw-call or allocation overhead is the bottleneck.
- **Fallback:** Ensure graceful degradation when WebGPU is unavailable; fall back to CPU or reduced particle counts.

## Output

- Working Three.js code with clear structure, proper disposal, and performance-conscious choices.
- Reference pn-game-logic skill for game loop, state, and input when building games.
