---
name: pn-unity-dev
description: Guides Unity development: C#, 2D Animation package, URP, asset pipelines, and scripting. Use when developing Unity projects, especially 2D games and animation workflows.
---

# Unity development skill

## When to use

- Writing or refactoring Unity C# scripts
- Setting up 2D Animation (rigging, skeletal animation, sprite swap)
- Configuring URP (Universal Render Pipeline) for 2D lighting
- Importing and rigging 2D assets (PSD Importer, sprites)
- Defining asset structure and prefab conventions
- Optimizing 2D/3D performance in Unity

## C# patterns

- **MonoBehaviour:** Use `Update`, `FixedUpdate` for physics, `LateUpdate` for camera follow. Avoid heavy logic in Update.
- **Serialization:** Use `[SerializeField]` for inspector-exposed private fields. Use `[Range]`, `[Header]` for clarity.
- **Events:** Use `UnityEvent` or C# events for decoupled communication. Name clearly (e.g. `OnDeath`, `OnScoreChanged`).
- **Coroutines:** Use for async flows (delays, sequences). Prefer `async/await` when appropriate (Unity 2023+).
- **ScriptableObjects:** Use for data assets (weapon stats, level configs). Reduces hardcoded values.

## 2D Animation package (Unity 6)

- **Rigging:** Use Skinning Editor and Bone tools for skeletal rigs. Create bone hierarchy from root; skin sprites to bones.
- **Sprite Swap:** Reuse Animation Clips with sprite swapping for flipbook-style animation, deformation, part swaps, or skin swaps.
- **2D IK:** Add IK Manager 2D to root bone. Use Limb, Chain CCD, or Chain FABRIK solvers for automatic limb positioning.
- **PSD Importer:** Import `.psb` (Photoshop) as layered sprites. Integrates with 2D Animation for rigged characters.
- **Asset organization:** Keep rigs, animations, and prefabs in clear folder structure (e.g. Characters, Animations, Prefabs).

## URP and 2D lighting

- **URP 2D Renderer:** Use for 2D projects. Enable 2D lights (Point, Directional) for dynamic lighting on sprites.
- **Sprite Lit:** Use Lit material for sprites that receive light. Unlit for UI or flat 2D.
- **Performance:** Limit realtime lights; bake where possible. Use LOD or culling for off-screen sprites.

## Asset naming and structure

- **Naming:** Use descriptive prefixes (e.g. `Char_`, `Anim_`, `Prefab_`, `Scene_`). Consistency across project.
- **Prefabs:** Nest prefabs for reuse. Use variants for variants of the same base (e.g. enemy types).
- **Scenes:** Organize by level or feature. Use additive loading for modular content.

## Performance

- **Object pooling:** Reuse bullets, particles, enemies via pools instead of Instantiate/Destroy.
- **Batching:** Enable sprite batching; reduce draw calls. Use sprite atlases.
- **Profiler:** Use Unity Profiler (CPU, GPU, Memory) to find bottlenecks. Target 60 FPS on mid-range.

## Output

- Unity C# code with clear structure and inspector-friendly serialization.
- 2D Animation workflow documented and followed.
- Reference pn-blender-scripting for asset pipeline when exporting from Blender to Unity (FBX, GLTF).
