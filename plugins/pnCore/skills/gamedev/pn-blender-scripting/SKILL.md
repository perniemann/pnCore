---
name: pn-blender-scripting
description: "Guides Blender Python scripts, export pipelines, and add-ons. Use when writing bpy scripts or add-ons; covers bpy API, export scripts, asset prep, add-on structure, and operator/panel patterns."
---

# Blender scripting skill

## When to use

- Writing Python scripts for Blender (bpy API)
- Creating export pipelines (FBX, GLTF, custom formats)
- Automating asset preparation or batch operations
- Building Blender add-ons (operators, panels, preferences)
- Setting up headless Blender for CI or batch rendering

## Python scripting (bpy API)

- **Context:** Use `bpy.context` for scene, object, selection. Be aware of mode (Object, Edit, Sculpt); switch when needed.
- **Data access:** `bpy.data` for meshes, materials, etc. Create and link to scene. Avoid orphan data.
- **Operators:** Call `bpy.ops.*` for built-in actions. Use `bpy.ops.object.mode_set(mode='EDIT')` etc. Check poll conditions.
- **Cleanup:** Unlink and remove temporary objects; run `bpy.ops.outliner.orphans_purge()` when appropriate.
- **No absolute paths:** Use relative paths or `os.path.join` with project root from env or config. Avoid hardcoded `C:\` or `/home/`.

## Export pipeline

- **FBX/GLTF:** Use `bpy.ops.export_scene.fbx` or `bpy.ops.export_scene.gltf`. Set scale, axes, and options via operator props.
- **Batch processing:** Iterate over objects or files; run export in loop. Use `bpy.ops.wm.open_mainfile` and `bpy.ops.wm.save_mainfile` for batch.
- **Naming conventions:** Use consistent prefixes (e.g. `SM_` for static mesh, `SK_` for skeleton). Match target engine conventions.
- **Script structure:** Parse args (e.g. `sys.argv`) for input/output paths when running headless.

## Asset preparation

- **UV unwrapping:** Use `bpy.ops.uv.unwrap` or smart project. Ensure no overlapping UVs for lightmaps. Document conventions.
- **Materials:** Set up for target engine (PBR: base color, roughness, metallic, normal). Use node groups for reuse.
- **LOD generation:** Use Decimate modifier or manual meshes. Name LOD0, LOD1, etc. Export with correct naming.
- **Origin:** Set object origin to center or pivot as required. Use `bpy.ops.object.origin_set()`.

## Scene organization

- **Collections:** Use hierarchy (e.g. Environment, Characters, Props). Name clearly.
- **Naming:** Consistent naming for objects, materials, meshes. Avoid spaces; use underscores.
- **Cleanup:** Remove unused materials, orphan data. Apply modifiers before export when needed.

## Add-on structure

- **bl_info:** Required dict with `name`, `author`, `version`, `blender`, `location`, `description`, `category`.
- **register/unregister:** Register classes in `register()`; unregister in reverse order in `unregister()`.
- **Operator patterns:** Define `bl_idname`, `bl_label`, `bl_options`. Implement `execute()`; use `invoke()` for modal or file browser; use `modal()` for interactive ops. Implement `poll(cls, context)` to enable/disable.
- **UI panels:** Use `draw(self, context)` with `layout` API. Use `layout.prop()`, `layout.operator()`, `layout.row()`, `layout.column()`.
- **Property groups:** Use `bpy.types.PropertyGroup` for reusable settings. Register on `bpy.types.Scene` or `bpy.types.WindowManager`.
- **Preferences:** Add-on preferences via `bpy.types.AddonPreferences`. Store paths, defaults.

## Geometry Nodes

Geometry Nodes (Blender 3.x+, production-standard in 4.x) is the primary procedural modelling workflow. Use for non-destructive mesh generation, distribution, instancing, and attribute-driven operations.

- **Create via Python:** Use `bpy.data.node_groups.new(name, 'GeometryNodeTree')` to create a new Geometry Nodes tree. Add nodes with `tree.nodes.new(type)` (e.g. `'GeometryNodeMeshCube'`, `'GeometryNodeDistributePointsOnFaces'`). Link nodes with `tree.links.new(output_socket, input_socket)`.
- **Assign modifier:** Add a Geometry Nodes modifier to an object: `mod = obj.modifiers.new(name='GN', type='NODES')`. Set `mod.node_group = tree`. The modifier is non-destructive; apply only when baking is required.
- **Attribute access:** Read and write named attributes with `Store Named Attribute` and `Named Attribute` nodes. Access via the `bpy.ops.geometry.attribute_*` operators or `mesh.attributes` in Python for post-processing.
- **Input parameters:** Expose modifier inputs as object properties via `mod[socket_identifier]`. Automate parameter sweeps in Python by iterating over input values and baking/exporting results.
- **Instancing:** Use `Instance on Points` for procedural distribution of meshes. Prefer this over particle systems for static geometry in Blender 4.x.
- **Export:** Apply the modifier before FBX/GLTF export (`bpy.ops.object.modifier_apply(modifier=mod.name)`) or use a Realize Instances node at the graph output to flatten instances on export. Realized output is required for game engine import.
- **Performance:** Complex GN graphs with millions of points are CPU-bound. For batch/CI headless work, profile with Python's `time` module and reduce geometry resolution for non-final passes.

## Output

- Working Blender scripts with no absolute paths and consistent naming.
- Test scripts in Blender after generating; document any engine-specific requirements.
- Reference pn-unreal-dev for Unreal asset naming; pn-threejs-core for GLTF export targets. Python can drive both Blender (bpy) and Unreal (Editor Script) for round-trip or batch pipelines—reference pn-unreal-dev for Unreal Python when automating import/post-process.
