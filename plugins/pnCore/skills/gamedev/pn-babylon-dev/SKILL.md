---
name: pn-babylon-dev
description: Guides Babylon.js scenes, cameras, lighting, asset loading, animation, and performance. Use when working on Babylon.js; covers scene structure, engine setup, GLTF loading, and disposal.
---

# Babylon.js core skill

## When to use

- Structuring or refactoring a Babylon.js scene
- Adding or configuring cameras, lights, or materials
- Loading and managing assets (GLTF, textures)
- Implementing or tuning animations
- Optimizing draw calls and performance
- Integrating physics (Ammo.js, Cannon.js, Havok)

## Scene structure

1. **Hierarchy:** Use `TransformNode` for logical groups (e.g. environment, characters, effects). Parent meshes to groups; clear names (`name = "env_ground"`) so objects can be found and disposed.
2. **Naming:** Use consistent prefixes or suffixes for discoverability and disposal.
3. **Disposal:** When removing meshes or switching scenes, call `mesh.dispose()` on materials and meshes. Use `scene.dispose()` when switching scenes. Reference pn-babylon rule.

## Engine and canvas

- **Engine:** Create `new Engine(canvas, antialias, options)`. Handle resize with `engine.resize()`. Use `engine.runRenderLoop(renderLoop)`.
- **Canvas:** Ensure canvas has explicit size; use `engine.setSize()` or CSS. Handle fullscreen if needed.
- **Disposal:** Call `engine.dispose()` when tearing down.

## Camera management

- **ArcRotateCamera:** For orbit/exploration. Set `alpha`, `beta`, `radius`; use `attachControl()` for input. Tune `wheelPrecision`, `minZ` for UX.
- **UniversalCamera:** For FPS-style. Use `keys` and `speed` for movement.
- **Follow:** Interpolate camera position toward target (lerp or smooth damp). Keep camera behind player; handle clipping.

## Lighting

- **HemisphericLight:** Base ambient; minimal cost. Use as default fill.
- **DirectionalLight / PointLight / SpotLight:** For key and fill. Limit count for mobile.
- **Shadows:** Use `light.createShadowMap()`; `shadowMap.renderList` for casters. Tune `shadowMap.size` and `bias` to avoid artifacts.
- **PBR:** Use `PBRMaterial` for physically based rendering; set `metallic`, `roughness`, `albedoTexture`.

## Asset loading

- **GLTF/GLB:** Use `SceneLoader.ImportMesh("", path, file, scene, onSuccess)`. Prefer GLB for single-file.
- **Textures:** Use `Texture` with correct path; set `uScale`/`vScale` for tiling. Use `CubeTexture` for environment.
- **Caching:** Reuse loaded assets; avoid loading same model multiple times. Use `AssetsManager` for progress and batching.
- **Disposal:** Dispose textures and meshes when no longer needed.

## Animation

- **Animation groups:** Use `AnimationGroup` for clip playback. Call `animationGroup.start()` and sync with render loop.
- **Skeletal:** Use `Skeleton` with `Bone` hierarchy; bind to `SkinnedMesh`. Ensure bones are correctly parented.
- **Morph targets:** Use `morphTargetManager` on `Mesh`; set `morphTargetInfluences`.

## Physics

- **Ammo.js / Cannon.js / Havok:** Use `PhysicsImpostor` or `PhysicsBody` (Babylon 6+). Run physics in fixed timestep; sync mesh positions from physics.
- **Collision:** Use `collisionEnabled` and `checkCollisions` for simple cases; impostors for dynamic bodies.

## Performance

- **Draw calls:** Use `InstancedMesh` for repeated geometry; merge meshes when static. Minimize material count.
- **Allocations:** Avoid per-frame object creation in render loop; reuse objects and buffers.
- **LOD:** Use `LODLevel` or custom LOD; reduce geometry for distant objects.
- **Culling:** Babylon culls by default; ensure `infiniteDistance` is not set on cameras when culling is desired.
- **Profiling:** Use `scene.getEngine().getPerformanceMonitor()` or browser devtools.

## Output

- Working Babylon.js code with clear structure, proper disposal, and performance-conscious choices.
- Reference pn-game-logic for game loop, state, and input when building games.
- Reference pn-babylon-scaffolding for minimal project setup.

## WebXR

Babylon.js has first-class WebXR support via the `WebXRDefaultExperience` helper.

- **Enable XR:** `const xr = await scene.createDefaultXRExperienceAsync({ floorMeshes: [ground] })`. This handles session management, controller/hand input, and teleportation.
- **Session types:** `immersive-vr` for full VR, `immersive-ar` for passthrough AR (Quest / browser), `inline` for non-immersive preview.
- **Input sources:** Iterate `xr.input.controllers` for controller state. Use `xr.input.onControllerAddedObservable` to attach behavior dynamically. Access `motionController.getMainComponent()` for trigger/squeeze.
- **Hand tracking:** Enable via `xr.input.xrCamera.getEngine().getXRDevice()` or `WebXRHandTracking` feature. Check `WebXRFeaturesManager` for feature availability.
- **Teleportation:** Built in via `xr.teleportation`; set `addFloorMesh()` to define walkable surfaces.
- **AR overlays:** Use `WebXRDomOverlay` feature to render HTML over AR passthrough.
- **Frame rate targets:** Target 72 / 90 Hz for Quest 3; use `engine.setHardwareScalingLevel()` to dynamically reduce resolution on performance dips.

## NodeMaterial

NodeMaterial is the visual shader graph for Babylon.js; equivalent to Three.js TSL or Unreal Material Editor.

- **Create:** `const mat = new NodeMaterial("myMat", scene)`. Add blocks via `mat.addBlock(new InputBlock("position"))`.
- **Node Editor:** Use the built-in `NodeMaterial.Edit(mat)` (browser only) to open the visual editor. Export to JSON with `mat.serialize()` and load with `NodeMaterial.ParseFromSnippetAsync(id)` or `NodeMaterial.Parse(json, scene)`.
- **Key blocks:** `InputBlock` (uniforms, attributes), `TransformBlock` (world/view/projection), `TextureBlock` (sampler), `PBRMetallicRoughnessBlock` (full PBR pipeline), `FragmentOutputBlock` (required output).
- **Procedural effects:** Combine `SimplexPerlinBlock`, `PosterizeBlock`, `GradientBlock` for stylized or data-driven visuals.
- **Animated uniforms:** Expose `InputBlock` as a uniform (`block.isUniform = true`) then set `block.value` per frame for animation. Avoid shader recompilation in the render loop.
- **Snippet library:** Community snippets available at `nme.babylonjs.com`. Load with `NodeMaterial.ParseFromSnippetAsync("#snippet-id")` for quick prototyping.
