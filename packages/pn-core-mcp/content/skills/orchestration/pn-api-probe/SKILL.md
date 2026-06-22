---
name: pn-api-probe
description: Fetch live API, version, and enum facts from the target runtime or stack before planning. Use in Phase 0 of pn-design and pn-build when the stack may have changed since training data.
---

# pn-api-probe

## Mission

Before committing to a design or build plan, verify that the runtime APIs, library versions, and key enumerations you intend to use actually exist in the target environment. Training data has a cutoff; runtime has ground truth.

## When to use

- At the start of `pn-design` (step 2, Plan) and `pn-build` (Phase 0) when the stack involves frequently-updated runtimes (Blender Python API, browser APIs, framework releases, SDK versions).
- When a prior session produced unexpected output that could indicate a version mismatch.
- When discovery spec references a specific runtime version (e.g. Blender 4.x, Next.js 15, Node 22).

## Instructions

1. **Identify the probe targets.** From the discovery spec or plan, extract:
   - Runtime name and version (e.g. `Blender 4.3`, `Node 22.x`, `React 19`)
   - APIs or enumerations in scope (e.g. `bpy.ops.render`, `bpy.context.scene.render.*`, `React.use()`)
   - Known deprecation risks (APIs your plan uses that may have changed)

2. **Probe live.** Use available tools to fetch current state:
   - **Web/framework:** Search official changelog, release notes, or docs for the version in scope. Target: official docs site, GitHub releases, MDN.
   - **Blender Python API:** Search the Blender Python API reference for the current version. Check: are the specific `bpy.*` calls still present? Any renamed or removed enums?
   - **Node/npm packages:** Check the package's npm page or GitHub releases for the version range in use.
   - Use web search with version-pinned queries, e.g. `"Blender 4.3 bpy.context.scene.render use_scene_lights"`.

3. **Emit structured output:**

   ```json
   {
     "runtime_version": "<name and version probed>",
     "available_apis": [
       { "api": "<api or enum>", "status": "confirmed | deprecated | removed | unknown", "notes": "" }
     ],
     "deprecated_apis": [
       { "api": "<api>", "replacement": "<new api or none>", "notes": "" }
     ],
     "version_gaps": [
       { "item": "<feature or API>", "expected": "<what plan assumes>", "actual": "<what probe found>", "impact": "blocking | warning | info" }
     ],
     "recommendation": "proceed | revise_plan | block"
   }
   ```

4. **Surface to planner.** Pass the output to the plan step:
   - `"block"` — one or more blocking version gaps; revise the plan before proceeding.
   - `"revise_plan"` — deprecated APIs in scope; update plan to use replacements.
   - `"proceed"` — no gaps found; annotate plan with confirmed versions.

## Scope note

This skill probes facts, not design decisions. It does not replace `pn-skeptic-challenge` (which evaluates the approach) or `pn-render-verify` (which evaluates the output). Its output is evidence for the planner, not a gate.

## Runtime-specific probe targets

### Unreal Engine 5.7

UE 5.7 has significant API surface across the Python scripting bridge, the EditorScriptingUtilities plugin, and Blueprint node types. Training-data cutoff is earlier than 5.7; probe these targets before committing to a plan.

**`unreal` Python module surface:**

| Target | Status to verify | Probe method |
|--------|-----------------|--------------|
| `unreal.EditorAssetLibrary` | Confirmed in 5.7; check for renamed or deprecated sub-calls | Search `unreal.EditorAssetLibrary` in UE Python API docs for 5.7 |
| `unreal.EditorLevelLibrary` | Partially deprecated since 5.1; many calls replaced by `unreal.LevelEditorSubsystem` | Verify target method exists in 5.7 subsystem |
| `unreal.SystemLibrary` | Stable; verify `execute_console_command` signature hasn't changed | Check official UE 5.7 Python API reference |
| `unreal.GameplayStatics` | Stable but Blueprint-only wrappers may differ from C++ paths | Confirm Python exposure for calls used in plan |
| `unreal.MetaSoundSource` | New in 5.2+; verify `SetFloatParameter` binding API in 5.7 | Search `unreal.MetaSoundSource` API changelog |
| `unreal.NiagaraComponent` | Stable; verify `set_variable_float` / `set_variable_bool` signatures | Check 5.7 Python reference |

**`EditorScriptingUtilities` API drift (plugin must be enabled):**

The `EditorScriptingUtilities` plugin must be explicitly enabled in the project's `.uproject` file. Probe before assuming availability. Key functions that have moved or changed between 5.x versions:

- `unreal.EditorStaticMeshLibrary` → most calls moved to `unreal.StaticMeshEditorSubsystem` in 5.0+. Verify which subsystem exposes the needed method.
- `unreal.EditorFilterLibrary` — available but some filter modes deprecated; verify `by_class` still accepts the expected class types in 5.7.
- `unreal.MeshMergingLibrary` — verify the merge settings struct fields match 5.7 (field names changed between 5.3 and 5.5).

**Deprecated `K2Node_*` names (Blueprint graph nodes):**

Blueprint automation that creates or queries nodes by class name must use current 5.7 names. Known renames and removals:

| Old name | Replacement (5.7) | Impact |
|----------|-------------------|--------|
| `K2Node_MacroInstance` (anonymous) | Named macro graphs required | Creating anonymous macro instances fails silently |
| `K2Node_GetSubsystem` | `K2Node_CallFunction` to subsystem accessor | Direct `GetSubsystem` node creation API changed |
| `K2Node_ComponentBoundEvent` | Deprecated; use `K2Node_AddDelegate` pattern | Any automation creating component-bound events must use new pattern |
| `K2Node_LatentGameplayTaskCall` | Removed in 5.6 | Replace with async task Blueprint nodes |

When the plan uses Blueprint node manipulation, emit a `version_gap` for each `K2Node_*` class referenced and flag as `blocking` if the class was removed.

**Probe query pattern for UE Python + `pn-api-probe`:**

Use version-pinned web searches or the UE documentation API reference:
- `"Unreal Engine 5.7 Python API" EditorLevelLibrary deprecated`
- `"UE 5.7 release notes" K2Node removal Blueprint`
- `site:dev.epicgames.com "5.7" python unreal EditorScriptingUtilities`

---

### Godot 4.x

Godot 4 introduced sweeping renames and removals from Godot 3. Even within 4.x, several subsystems have changed between patch releases (notably TileMap in 4.3, some physics in 4.2). Training data may reference pre-4.0 or early-4.x names. Probe these before planning.

**Renamed / replaced nodes and classes:**

| Godot 3 name | Godot 4 name | Notes |
|---|---|---|
| `Spatial` | `Node3D` | All 3D node base |
| `KinematicBody3D` / `KinematicBody2D` | `CharacterBody3D` / `CharacterBody2D` | `move_and_slide()` signature changed — no longer returns `Vector3`; velocity is now a property |
| `Area` / `Area2D` | `Area3D` / `Area2D` | `Area3D` in 4.x; 2D unchanged |
| `RayCast` | `RayCast3D` | Plus `RayCast2D` |
| `ClippedCamera3D` | Removed | Use `Camera3D` + `ShapeCast3D` |
| `BakedLightmap` | `LightmapGI` | Different baking workflow |
| `Navigation2DServer` / `Navigation3DServer` | `NavigationServer2D` / `NavigationServer3D` | Singleton renames |
| `TileMap` (multi-layer) | `TileMapLayer` (one node per layer, 4.3+) | `TileMap` deprecated 4.3; plan must use `TileMapLayer` for new projects |
| `GIProbe` | `VoxelGI` | Full replacement |
| `WorldEnvironment` | `WorldEnvironment` (same) | But `Environment` resource fields changed (e.g. `glow_enabled` → individual properties) |

**GDScript API changes:**

| Old pattern | Godot 4 pattern |
|---|---|
| `yield(signal, "signal_name")` | `await signal_name` |
| `connect("signal", obj, "method")` | `signal.connect(callable)` |
| `.empty()` on String/Array | `.is_empty()` |
| `OS.get_ticks_msec()` | Works; prefer `Time.get_ticks_msec()` |
| `rand_range(a, b)` | `randf_range(a, b)` / `randi_range(a, b)` |
| `instance()` on PackedScene | `instantiate()` |
| `queue_free()` on tree exit | Unchanged |
| `export var` | `@export var` |
| `onready var` | `@onready var` |
| `tool` at script top | `@tool` |

**GDExtension vs GDNative:**

GDNative (Godot 3) is incompatible with Godot 4. GDExtension requires `godot-cpp` built against the target Godot 4.x version. The `.gdextension` file format replaced `.gdnlib`. Any plan referencing GDNative `.gdnlib` files must be flagged as `blocking`.

**Physics changes (4.2+):**

- `CharacterBody3D.move_and_slide()` no longer accepts a `Vector3 up_direction` argument — set `up_direction` as a property before calling.
- `RigidBody3D.apply_central_impulse()` → renamed to `apply_impulse()` when applying at center of mass (no offset); verify method signature for the target version.

**Probe query pattern for Godot + `pn-api-probe`:**

Use version-pinned web searches against the official docs:
- `site:docs.godotengine.org "4.x" CharacterBody3D move_and_slide`
- `"Godot 4.3" TileMapLayer migration TileMap deprecated`
- `"Godot 4.2" physics CharacterBody3D up_direction`
- `site:docs.godotengine.org GDExtension "compatibility_minimum"`
