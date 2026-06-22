---
name: pn-render-verify
description: Re-read a rendered or visual artifact and produce a structured verdict against the spec. Use before pn-skeptic-challenge in design workflows when the deliverable is a render, image, screenshot, or HTML page.
---

# pn-render-verify

## Mission

Read a visual artifact from disk, enumerate spec items against what is *visible* in the artifact, and emit a structured `verifier.contract.json`-shaped verdict. The output feeds directly into `pn-skeptic-challenge` as evidence. Do not assume quality from configuration — only assert what can be observed.

## When to use

- Before invoking `pn-skeptic-challenge` in "Skeptic on output (post-build)" mode when the deliverable is a render, image, screenshot, or HTML page.
- Standalone, when a human or orchestrator needs a structured pass/fail verdict on a visual artifact against a spec.

## Instructions

1. **Locate the artifact.** Identify the output file(s) — renders, screenshots, or HTML pages. Record each path and read the file. Log `read_bytes` for each artifact.

2. **Load the spec.** Retrieve the original discovery spec or design brief (e.g. from `discoverySpec`, `.pncore-design.md`, or the plan). Extract acceptance criteria: required visual elements, layout intent, color/typography constraints, and any runtime-specific requirements.

3. **Enumerate spec items.** For each spec item, make a direct observation:
   - Assign `status`: `"pass"` | `"fail"` | `"partial"` | `"unknown"`.
   - Record `evidence`: a one-sentence description of what is visible (not what was configured).
   - If `"fail"` or `"partial"`, note what is missing or wrong.

4. **Emit structured verdict** in `verifier.contract.json` shape:

   ```json
   {
     "acceptance_results": [
       {
         "id": "AC-001",
         "status": "pass | fail | partial | unknown",
         "evidence": "One-sentence observation from the artifact."
       }
     ],
     "test_results": { "status": "unknown | pass | fail", "notes": "" },
     "ci_impact": { "risk": "low | medium | high", "notes": "" },
     "final_recommendation": "ship | ship_with_notes | iterate | block"
   }
   ```

   Additionally, populate `visual_evidence` (per `skeptic.contract.json` extension) for the artifact:

   ```json
   {
     "artifact_path": "<path>",
     "observed": ["<element 1>", "<element 2>"],
     "read_bytes": 123456
   }
   ```

5. **Set `final_recommendation`:**
   - `"block"` — one or more spec items are `"fail"` with high acceptance impact.
   - `"iterate"` — one or more items are `"partial"` and affect primary acceptance criteria.
   - `"ship_with_notes"` — only minor or cosmetic gaps remain.
   - `"ship"` — all spec items pass.

6. **Pass verdict to skeptic.** When invoked from `pn-design` or `pn-skeptic-challenge`, return the full verdict object. The skeptic will use `acceptance_results` and `visual_evidence` as `evidence` in any `must_fix` entries it generates.

## Runtime-specific assertions

Different runtimes have well-known traps where configuration does not equal visible output. Use `pn-api-probe` (or direct inspection) to check the runtime state before asserting pass/fail on these items. Examples:

### Blender (Cycles/EEVEE renders)
- **Viewport vs. Render mode:** Confirm the saved PNG was produced by `bpy.ops.render.render(write_still=True)`, not a viewport screenshot. Evidence: file size and presence of render-pass metadata.
- **Scene lighting:** Check `bpy.context.scene.render.film_transparent`, `use_scene_lights`, and `use_scene_world`. A scene configured with `use_scene_lights=False` silently drops all mesh lights from the render.
- **Compositor/post-processing:** Verify `scene.use_nodes` is `True` when volumetric fog, glare, or color grading are in spec. Compositor nodes not enabled = effects absent from output.
- **Geometry Nodes (GN) evaluation order:** Scale-after-realize is a known trap — geometry may appear correct in viewport but collapse in render. Assert GN modifier stack order when deformation + instancing coexist.

### Web/HTML
- **CSS custom properties at runtime:** Computed values may differ from declared values due to cascade or missing fallbacks. Assert the rendered color/font by reading the saved HTML and checking `<style>` computed chains.
- **Font loading:** An `@font-face` declaration does not guarantee the font is present; assert that the font file is referenced from a real path and not a CDN-only fallback.

### Unreal Engine 5.7

Well-known traps where the viewport or configuration does not equal the rendered or runtime output. Use `pn-api-probe` to verify runtime state before asserting pass/fail.

- **Lumen GI quality:** Viewport preview uses a lower-quality Lumen approximation. Confirm `r.Lumen.Reflections.Allow` and `r.Lumen.ScreenProbeGather.Allow` cvars match intended quality tier via Project Settings → Rendering. Check `Engine - Rendering` ini overrides; a saved screenshot from PIE may not reflect standalone render quality.
- **Nanite eligibility:** Assert that the target mesh has `bSupportsNanite` enabled and triangle count crosses the project threshold (`r.Nanite.MinPixelsPerEdgeHeuristic`). Viewport may silently fall back to the non-Nanite LOD without warning when thresholds are not met.
- **Blueprint compile state:** Confirm `bRecompileOnLoad` succeeded and no `K2Node` validation warnings exist before asserting runtime behavior. An uncompiled Blueprint silently reverts to the last compiled bytecode, making the viewport appear correct while runtime logic is stale. Check the output log for `[Blueprint] Warning:` lines.
- **World Partition streaming:** Assert `LoadedActors` count for the queried region; World Partition may silently unload actors beyond the streaming distance budget. Verify the camera/player position relative to the region under test matches the streaming distance configured in the World Partition settings.
- **MetaSounds parameter binding:** Verify `SetFloatParameter` (and `SetBoolParameter`, `SetIntParameter`) calls actually reached the MetaSound source at runtime. Missing bindings fail silently — the source plays with its default value. Confirm the parameter name string matches exactly (case-sensitive). Use the MetaSound audition tool or output log (`LogMetaSound`) to confirm binding delivery.
- **Niagara renderer mode:** Sprite vs. mesh vs. ribbon renderer produce visually identical setups in the Niagara editor but diverge at runtime based on viewport angle and render pass. Sprites render flat from side angles; assert the correct renderer type is set and LOD budget (`MaxGPUParticlesPerEmitter`) is not clipping the visible particle count.
- **PIE vs. standalone capture:** Screenshots taken from PIE may include editor-only post-process volumes, debug overlays, and Editor-only scalability settings. When the spec requires a final-quality capture, assert the screenshot was taken from a standalone game run (`-game` flag) or via `HighResShot` in a cooked build. Record the capture mode in `visual_evidence.artifact_path` metadata.

### Other runtimes
Add runtime-specific traps here as they are discovered. Keep assertions observable (file content, metadata) rather than inferred from configuration.

### Godot Engine 4.x

Well-known traps where the editor viewport, SubViewport output, or headless run does not reflect the runtime or exported result. Use `pn-api-probe` to verify node and API state before asserting pass/fail.

- **SubViewport vs. game window capture:** Screenshots from `SubViewport.get_texture().get_image()` capture only the SubViewport's content — not the full game window including CanvasLayer UI, post-process effects applied at the root viewport, or overlays added outside the SubViewport. When the spec includes HUD or full-screen post-process effects, assert the capture was taken from the main viewport using `get_viewport().get_texture().get_image()` in a running scene.
- **Shader compilation lag:** Godot compiles shaders at runtime on first use. Screenshots taken immediately after scene load may capture the fallback (pink/solid color) material before shader compilation completes. Assert that the screenshot was taken after at minimum one `await get_tree().process_frame` following scene load, or use pipeline pre-compilation (`RenderingServer.force_sync()`).
- **AnimationPlayer vs. AnimationTree active state:** When both are present, `AnimationPlayer.play()` called directly is ignored if `AnimationTree.active = true`. Assert the AnimationTree's `current_state` / blend parameter matches expected values rather than checking `AnimationPlayer.current_animation`.
- **TileMapLayer vs. TileMap (4.3+):** Projects that still use the deprecated `TileMap` node may have unreliable physics and navigation baking in 4.3+. Verify the scene uses `TileMapLayer` nodes and that physics/navigation layers are configured per-layer, not on a parent `TileMap`.
- **Headless run exit code:** When verifying a CI/headless test run, assert the process exit code matches `0` (pass) or the expected non-zero value. `get_tree().quit(1)` propagates through the Godot binary — capture it in the CI step. A run that exits `0` but produces no output file should be flagged as a configuration error, not a pass.
- **Physics correctness vs. visual correctness:** `RigidBody3D` and `CharacterBody3D` behavior is deterministic only within a single physics tick rate. Screenshots of physics scenes taken at different frame counts may show different positions. When spec includes physics-driven placement, assert position values numerically (via a GDScript test asserting `global_position`) rather than from a screenshot.
- **CanvasLayer z-ordering:** `CanvasLayer` nodes render on top of the 3D viewport by default (layer 1 = above all 3D). Assert that UI expected to be behind the 3D scene has a negative or lower layer value, and that post-process `CanvasLayer` effects (e.g. `ColorRect` shaders) are on the correct layer — the viewport screenshot will silently exclude a CanvasLayer with wrong visibility flags.
- **GLTF import scale:** Blender-exported GLB files with un-applied transforms import at unexpected scale in Godot. If the spec includes specific mesh dimensions, assert the import scale in the `.import` file (`generate/apply_root_scale`) matches the expected scale factor, or that transforms were applied before export.
