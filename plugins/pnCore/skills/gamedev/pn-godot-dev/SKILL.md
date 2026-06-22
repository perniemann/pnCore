---
name: pn-godot-dev
description: Guides Godot Engine 4.x development: GDScript, GDExtension (C++), multiplayer, VisualShader/shader code, export/platform config, autoloads, Resource serialization, InputMap, headless CI, AnimationPlayer/Tree, 2D/3D workflows, physics, PCG, and Blender pipeline. Use when developing Godot 4.x projects.
---

# Godot Engine development skill

## When to use

- Writing or refactoring GDScript or C# in Godot 4.x
- Building GDExtension (C++) bindings for performance-critical systems
- Implementing multiplayer (ENet, WebRTC, high-level RPCs)
- Writing VisualShaders or spatial/canvas shader code
- Configuring export presets and platform templates
- Setting up autoloads/singletons, InputMap, and project settings
- Working with Resource serialization (`.tres`, `.res`, custom Resources)
- Animating with AnimationPlayer, AnimationTree, and 2D AnimatedSprite2D
- Importing 3D assets from Blender (GLTF/GLB pipeline)
- Configuring physics layers, CharacterBody3D, RigidBody3D
- Procedural generation with TileMap, mesh generation, or terrain systems
- Headless builds, CI/CD, and command-line export

---

## GDScript patterns

- **Signals:** Declare with `signal health_changed(new_value: int)`. Connect in editor (`@export` + ConnectNode) or via `connect()` / `signal.connect(callable)`. Use signals for decoupled communication; avoid direct node-to-node calls across sibling branches.
- **Nodes and `@onready`:** Use `@onready var sprite: Sprite2D = $Sprite2D` for node references; avoid `get_node()` at `_ready()` by hand. Avoid deep nesting; extract logical sub-trees into `.tscn` scenes.
- **Typing:** Use full type hints throughout — `var health: int`, `func take_damage(amount: int) -> void`. Enables Godot's static analysis and editor autocomplete. Use `as` casts with null checks where type is uncertain.
- **Groups:** `add_to_group("enemies")` for broad queries. Use `get_tree().get_nodes_in_group()` when needed; prefer signals for targeted events.
- **Autoloads (singletons):** Register scripts or scenes as autoloads in Project Settings → Autoloads. Access via their registered name anywhere in the project (e.g. `GameManager.start_level()`). Use for global state, event buses, or service locators. Do not put per-scene state in autoloads.
- **Resources as data:** Extend `Resource` for typed data objects (item definitions, ability configs, AI blackboards). Save as `.tres` (text) or `.res` (binary). Load with `load()` / `preload()`. Use `@export` on Resource-typed properties for Inspector assignment.
- **Enum and const:** Declare `enum State { IDLE, WALK, ATTACK }` in the class or as a standalone file for shared use. Prefer typed enums over raw integers.
- **Callable and lambda:** Use `Callable(self, "method_name")` or `func() -> void: ...` for deferred calls, `call_deferred`, and `tween.tween_callback`.

---

## GDExtension (C++)

GDExtension is the Godot 4.x replacement for GDNative. Use for: hot-path logic, third-party C/C++ library integration, or features that GDScript cannot express at required performance.

- **Setup:** Use [godot-cpp](https://github.com/godotengine/godot-cpp) as a submodule or via SCons. Generate binding headers: `scons generate_bindings=yes`. Build: `scons target=template_debug` (debug) or `template_release` (shipping).
- **Class registration:** Inherit from `godot::Node` (or any Godot class). Use `GDCLASS(MyClass, Node)` macro. Register methods, properties, and signals in `static void _bind_methods()`.
- **`.gdextension` file:** Declare the shared library paths per platform/architecture. Godot loads this file to discover your extension. Keep `compatibility_minimum` accurate to your godot-cpp version.
- **Memory:** Use `godot::Ref<T>` for Reference-counted types. Use raw pointers only for `Object`-derived nodes that are in the scene tree (GC manages them). Never delete nodes directly; use `queue_free()`.
- **Hot reload:** GDExtension supports hot reload in Godot 4.2+ editor (enable in project settings). Production builds do not hot-reload.
- **Tip:** For math-heavy systems (physics sim, pathfinding), use GDExtension and expose a thin GDScript API; keep game logic in GDScript.

---

## Multiplayer

Godot 4.x ships a high-level multiplayer API built on `MultiplayerPeer` (ENet by default; WebRTC via `WebRTCMultiplayerPeer`).

- **ENet setup:**
  ```gdscript
  var peer := ENetMultiplayerPeer.new()
  peer.create_server(4242, 32)        # server
  # or
  peer.create_client("127.0.0.1", 4242)  # client
  multiplayer.multiplayer_peer = peer
  ```
- **RPCs:** Annotate functions with `@rpc("any_peer")`, `@rpc("authority")`, `@rpc("call_local")`, or combinations. The multiplayer authority (default: server, id=1) owns nodes by default. Call with `rpc("method_name", args)` or `rpc_id(peer_id, "method_name", args)`.
- **Synchronizers:** Use `MultiplayerSynchronizer` (property sync) and `MultiplayerSpawner` (node spawn/despawn sync) to avoid manual RPC for common patterns.
- **Scene authority:** Set `set_multiplayer_authority(peer_id)` on nodes that a client should own (e.g. player's own character). Only the authority can call `@rpc("authority")` methods.
- **WebRTC:** Use `WebRTCMultiplayerPeer` + a signalling server for browser and P2P scenarios. Godot provides `WebRTCPeerConnection`; implement signalling via WebSocket or your own relay.
- **Lobby pattern:** Use a dedicated lobby scene; spawn player scenes via `MultiplayerSpawner` on connection. Despawn on disconnect by listening to `multiplayer.peer_disconnected`.
- **Security:** Validate all RPC inputs server-side. Never trust client-supplied authority claims.

---

## Shaders and VisualShader

- **Shader types:** `spatial` (3D PBR), `canvas_item` (2D), `particles` (GPU particles), `sky`. Declare at top: `shader_type spatial;`.
- **Key uniforms:** Use `uniform` for parameters exposed to the Inspector. Use `hint_range`, `hint_color`, `source_color` hints for editor UX.
- **Common spatial outputs:** `ALBEDO`, `METALLIC`, `ROUGHNESS`, `NORMAL_MAP`, `EMISSION`, `ALPHA` (requires `render_mode blend_mix`). Use `TIME` for animated effects.
- **VisualShader:** Node-based editor under `Shader → VisualShader`. Export to code via "Convert to Script" for fine-tuning. Prefer VisualShader for artists; code shader for complex logic.
- **ShaderMaterial:** Assign a `ShaderMaterial` to any mesh/sprite. Set shader parameters from GDScript: `material.set_shader_parameter("color", Color.RED)`.
- **Screen-space effects:** Use `SCREEN_TEXTURE`, `DEPTH_TEXTURE`, `NORMAL_ROUGHNESS_TEXTURE` (Forward+ renderer). These require transparent render mode or a screen-reading render pass.
- **Performance:** Avoid branching (`if`) in shaders where possible — prefer `step()`, `mix()`, `smoothstep()`. Mark `render_mode unshaded` for flat/stylised materials to skip PBR lighting.
- **Shader includes:** Use `#include "res://shaders/common.gdshaderinc"` for reusable functions. Godot 4.x supports `.gdshaderinc` files.

---

## Export and platform configuration

- **Export presets:** Project → Export → Add preset for each target (Windows, Linux, macOS, Android, iOS, Web). Each preset references an **export template** (download via Editor → Manage Export Templates).
- **PCK vs. embedded:** Exporting produces a `.pck` (asset pack) + executable, or an embedded binary. Use `.pck` for patching; embedded for single-file distribution.
- **Android:** Requires Android SDK + JDK. Set `ANDROID_SDK_ROOT` env. Use Gradle build (`Use Gradle Build` in preset) for plugins and custom permissions. Sign with `keytool`-generated keystore.
- **iOS:** Requires macOS + Xcode. Export produces an Xcode project; archive and sign via Xcode or `xcodebuild`. Use `export_permissions` for microphone, camera, etc.
- **Web (HTML5):** Requires Emscripten (bundled in export templates). Enable `SharedArrayBuffer` headers server-side (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) for threading. Use `GodotWeb` audio driver.
- **Feature tags:** Use `OS.has_feature("mobile")`, `OS.has_feature("web")` to branch at runtime. Define custom tags in export presets.
- **Headless export (CI):**
  ```bash
  godot --headless --export-release "Linux/X11" ./dist/game.x86_64 --path /path/to/project
  ```
  Use `--export-debug` for debug templates. Set `DISPLAY` env on headless Linux (`Xvfb` or `DISPLAY=:99`).

---

## Autoloads and project settings

- **Register autoloads:** Project → Project Settings → Autoload. Give each a name; access as a global singleton (`MyAutoload.method()`).
- **Event bus pattern:** Create an `EventBus` autoload with only signals. Nodes emit on `EventBus`; others subscribe. Avoids tight coupling across the scene tree.
- **InputMap:** Project → Project Settings → Input Map. Define actions (`jump`, `attack`, `ui_accept`). Read via `Input.is_action_pressed("jump")`. Remap at runtime via `InputMap.action_add_event()`.
- **Project settings via GDScript:** `ProjectSettings.get_setting("display/window/size/viewport_width")`. Override per-feature-flag with `ProjectSettings.set_setting()` in headless/test builds.
- **Localization:** Use `tr("KEY")` for translated strings. Store translations in `.po`/`.csv` files; import via Godot's Translation import. Set locale at runtime: `TranslationServer.set_locale("fr")`.

---

## Resource serialization

- **Custom Resource:** Extend `Resource`, add `@export` properties, call `class_name MyResource`. Instantiate in editor (right-click Content → New Resource → MyResource). Save as `.tres`.
- **Save/load:**
  ```gdscript
  # Save
  ResourceSaver.save(my_resource, "user://save.tres")
  # Load
  var loaded: MyResource = ResourceLoader.load("user://save.tres")
  ```
- **`user://` path:** Maps to OS user data directory (writable at runtime). Use for saves, config, logs. `res://` is read-only in exported builds.
- **JSON save alternative:** Use `JSON.stringify(data)` + `FileAccess.open("user://save.json", FileAccess.WRITE)` for human-readable saves. Prefer custom Resources for typed, validated data.
- **Duplicate vs. share:** `resource.duplicate()` makes a deep copy — use when each scene instance needs its own copy. Shared resources (not duplicated) mutate globally — use for config/databases.

---

## Physics

- **Body types:** `StaticBody3D` (immovable), `AnimatableBody3D` (moved via code, non-physics), `RigidBody3D` (full physics sim), `CharacterBody3D` (game characters — manual velocity, `move_and_slide()`).
- **CharacterBody3D pattern:**
  ```gdscript
  func _physics_process(delta: float) -> void:
      if not is_on_floor():
          velocity.y -= gravity * delta
      var dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
      velocity.x = dir.x * SPEED
      velocity.z = dir.z * SPEED
      move_and_slide()
  ```
- **Collision layers and masks:** Layer = "what am I?", Mask = "what do I collide with?". Set numerically (bit flags) or named in Project Settings → Physics → Layer Names. Keep a project-wide layer map documented.
- **Areas:** `Area3D` / `Area2D` for triggers, damage zones, detection. Connect `body_entered` / `area_entered` signals. Do not use for full collision response.
- **Joints:** `HingeJoint3D`, `SliderJoint3D`, `Generic6DOFJoint3D` — attach via NodePath in Inspector. Tweak limits in the Inspector.
- **Physics server direct:** For performance-critical spawning (bullets, particles), use `PhysicsServer3D` directly without nodes.

---

## AnimationPlayer and AnimationTree

- **AnimationPlayer:** Animate any property on any node in the scene tree. Create animations via the Animation editor. Control via `play()`, `stop()`, `seek()`. Connect `animation_finished` signal for state transitions.
- **AnimationTree:** Advanced blending and state machines. Assign an AnimationPlayer as source. Use `AnimationNodeStateMachine` for character locomotion states. Expose blend parameters (e.g. `parameters/blend_position`) and set from GDScript to drive blends.
- **Rule:** Once AnimationTree is active, control playback through it only. Use AnimationPlayer only for editing; avoid calling `play()` on it directly.
- **Tweens:** Use `create_tween()` for one-shot property animation without an AnimationPlayer. Prefer tweens for UI transitions and simple effects.

---

## 2D animation

- **AnimatedSprite2D:** Use for sprite-sheet animation. Define frames in SpriteFrames resource. Set FPS, loop, and filter per animation. Control via `play("run")`, `stop()`.
- **2D skeletal:** Use `Skeleton2D` + `Bone2D` + `Polygon2D` with `Skeleton2DModificationStack2D` for cut-out / rigged 2D. AnimationPlayer keyframes drive bone transforms.
- **Parallax:** Use `ParallaxBackground` + `ParallaxLayer` nodes. Set `motion_scale` per layer for depth illusion.

---

## Procedural generation and TileMap

- **TileMap / TileMapLayer (4.3+):** In Godot 4.3+ `TileMap` is deprecated; use `TileMapLayer` nodes instead (one per layer). Configure TileSet with physics, navigation, and custom data layers.
- **Procedural mesh:** Use `ArrayMesh` + `SurfaceTool` or `ImmediateMesh` for runtime geometry. `MeshInstance3D` + `SurfaceTool.commit()` for simple procedural meshes.
- **Noise:** Use `FastNoiseLite` for 2D/3D noise terrain. Access via `noise.get_noise_2d(x, y)`. Expose parameters as `@export` for tweaking.
- **Scatter/instancing:** Use `MultiMeshInstance3D` for thousands of instances (foliage, rocks). Set transforms via `MultiMesh.set_instance_transform()`. Far cheaper than individual nodes.

---

## 3D and Blender pipeline

- **GLTF import:** Godot 4 imports `.glb` / `.gltf` directly. In Blender: use Y-forward/Z-up axes, apply transforms before export, embed textures or use relative paths. See `pn-blender-scripting` for export settings.
- **`.import` files:** Every imported asset generates a `.import` sidecar. Do not edit by hand; reconfigure via the Import dock in the editor. Commit both asset and `.import` to source control.
- **Reimport automation:** Use `EditorInterface.get_resource_filesystem().reimport_files([path])` from `@tool` scripts or EditorPlugin for pipeline automation.
- **Materials:** Godot uses its own `StandardMaterial3D` (PBR). Blender material nodes do not transfer — recreate in Godot or use GLTF PBR material extension (`KHR_materials_*`).
- **Lod:** Use `VisibilityNotifier3D` or import LOD meshes named `_lod0`, `_lod1` etc. (Godot auto-detects suffix). Godot 4.x does not have automatic LOD generation — use Blender's Decimate modifier.

---

## Headless CI / command-line

- **Headless mode:** Run Godot with `--headless` flag (no display required). Required for CI servers without a display.
- **Run scene:** `godot --headless scene.tscn` — runs a scene and exits when the scene calls `get_tree().quit()`.
- **Export:**
  ```bash
  godot --headless --export-release "Linux/X11" dist/game --path /path/to/project
  ```
- **GDScript tests:** Use [GUT](https://github.com/bitwes/Gut) (Godot Unit Testing) or [gdUnit4](https://github.com/MikeSchulze/gdUnit4). Run headless: `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/`.
- **GitHub Actions:**
  ```yaml
  - uses: chickensoft-games/setup-godot@v1
    with:
      version: "4.4.1"
      use-dotnet: false
  - run: godot --headless --export-release "Linux/X11" dist/game --path .
  ```
- **Scene as test runner:** Create a `TestRunner.tscn` that runs all test scripts and calls `get_tree().quit(exit_code)`. Exit code propagates to CI.

---

## Performance

- **Process vs. Physics:** `_process(delta)` for visual/logic updates; `_physics_process(delta)` for physics and movement. Both run each frame — keep lightweight. Use `set_process(false)` / `set_physics_process(false)` when inactive.
- **Object pooling:** Pre-instantiate nodes; hide/disable instead of `add_child`/`queue_free` for frequent spawns (bullets, particles, enemies).
- **Draw calls:** Use atlases and shared materials. Reduce unique material count. Use `MultiMeshInstance3D` for instanced rendering.
- **Profile:** Use Godot's built-in Profiler (Debugger → Profiler). Enable `Debug → Visible Collision Shapes` and `Debug → Visible Navigation` for spatial debugging. Use RenderDoc integration for GPU profiling.
- **Occlusion culling:** Enable in Project Settings → Rendering → Occlusion Culling. Bake via Scene → Bake Occlusion Culling.

---

## Output

- Godot scenes (`.tscn`) and GDScript with full type annotations and signal-driven architecture.
- GDExtension C++ with correct `_bind_methods()` registration and `.gdextension` descriptor.
- Multiplayer scenes with RPCs, synchronizers, and lobby pattern as appropriate.
- ShaderMaterial with VisualShader or code shader; parameters exposed via `set_shader_parameter`.
- Export presets configured per target platform; headless CI export command documented.
- Reference `pn-blender-scripting` for Blender → Godot GLTF export pipeline.
- Reference `pn-game-logic` for game loop, state machine, and save system patterns.
- Reference `pn-godot-mcp` for MCP server selection when live editor automation is needed.
