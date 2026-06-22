---
name: pn-unreal-dev
description: Guides Unreal Engine development: C++, Blueprints, asset naming, build config, plugin development, programmatic asset creation, live uasset creation, Python automation, UAT/BuildGraph, Editor Utility Widgets, Data Validation, Materials, Niagara, PCG, and performance. Use when developing Unreal Engine projects.
---

# Unreal Engine development skill

## When to use

- Writing or refactoring Unreal C++ code
- Setting up Blueprint conventions and patterns
- Defining asset naming and project structure
- Building Unreal plugins (modules, editor extensions, custom asset types)
- Programmatic or live creation of uassets (materials, Niagara, PCG)
- Automating editor workflows (Python, Editor Utility Widgets, UAT)
- Creating or validating materials, Niagara systems, or PCG graphs
- Optimizing tick, loading, or profiling

## C++ patterns

- **UPROPERTY macros:** Use for replicated, serialized, or Blueprint-exposed properties. Specify `EditAnywhere`, `BlueprintReadOnly`, `Replicated`, etc. as needed.
- **UFUNCTION macros:** Use for Blueprint-callable or RPC functions. Specify `BlueprintCallable`, `Server`, `Client`, `NetMulticast` when relevant.
- **UCLASS macros:** Use `UCLASS()` with `BlueprintType`, `Config`, etc. Inherit from `UObject`, `AActor`, `UActorComponent`, etc.
- **Gameplay Framework:** Use GameMode (rules), GameState (replicated state), PlayerController (input, UI), Pawn (possessed entity), Character (pawn with capsule). Understand ownership and replication.
- **No raw pointers for UObjects:** Use `TObjectPtr` (UE5) or `UPROPERTY` for UObject references so GC can track. Use raw pointers only for non-UObject or temporary scope.
- **GC-safe patterns:** Avoid storing UObject pointers in non-UPROPERTY members; use weak references when needed.

## Blueprint conventions

- **Naming:** Use PascalCase for functions, variables. Prefix: `BP_` for Blueprint assets, `WBP_` for widgets, `BPC_` for components.
- **Pure vs impure:** Use pure (no side effects) for getters and calculations. Use impure for actions.
- **Event dispatchers:** Use for decoupled communication. Name events clearly (e.g. `OnHealthChanged`, `OnGameOver`).
- **Interfaces:** Use for cross-cutting behavior (e.g. `Interactable`, `Damageable`). Implement in Blueprint or C++.
- **Avoid spaghetti:** Use function nodes, macros, or C++ for complex logic. Keep graphs readable.

## Asset naming conventions

- **Prefix system:** SM_ (static mesh), SK_ (skeleton), S_ (skeleton), M_ (material), T_ (texture), BP_ (Blueprint), WBP_ (widget), A_ (animation), A_ (animation blueprint), NS_ (Niagara).
- **Suffixes:** Optional for clarity (e.g. _Inst for instance, _Dyn for dynamic).
- **Consistency:** Use same prefix across project. Document in project style guide.

## Build configuration

- **.Build.cs:** Define module dependencies in `PublicDependencyModuleNames`. Add third-party libs in `PublicAdditionalLibraries`, `PublicIncludePaths`.
- **Module structure:** Separate Runtime (game), Editor (editor-only), Developer (tools). Avoid circular dependencies.
- **Plugin dependencies:** List plugins in `.uplugin`; add module dependencies in `.Build.cs`.

## Unreal plugin development

- **Plugin types:** Code plugin (C++) for modules and editor extensions; Content-only for Blueprints, Editor Utility Widgets, and assets without C++.
- **.uplugin descriptor:** Define `FriendlyName`, `Version`, `Description`, `Modules` (name, type: Runtime/Editor/Developer).
- **Module structure:** Each module has `.Build.cs`, `Source/`, `Public/`, `Private/`. Separate Runtime (game), Editor (editor-only), Developer (tools).
- **Custom asset type:** UObject-derived class for asset data; UFactory for creation. Use `#if WITH_EDITORONLY_DATA` for editor properties. Register `FAssetTypeActions_Base` with `IAssetTools` for Content Browser integration.
- **Editor extensions:** Toolbar buttons via `FExtender`; custom panels via `IDetailCustomization`; asset actions via `FAssetTypeActions_*`. Add `PropertyEditor` module for property display.
- **File watcher:** Use `FDirectoryWatcher` or `IDirectoryWatcher` to watch `Content/Python/` or project `Scripts/` for live script execution. On change, execute Python via editor's Python subsystem.
- **Packaging:** Use UAT `BuildPlugin` for distribution. Reference `Engine/Build/Graph/Examples` for automation.

## Performance

- **Tick budget:** Minimize tick overhead. Use `PrimaryActorTick.bCanEverTick = false` when not needed. Batch updates.
- **Async loading:** Use `LoadObjectAsync`, `AsyncLoad` for large assets. Avoid blocking loads on game thread.
- **Level streaming:** Use streaming levels for open worlds. Load/unload based on distance or visibility.
- **Profiling:** Use Unreal Insights, CPU profiler, or GPU profiler. Identify bottlenecks before optimizing.

## Python Editor Scripting

- **Plugins:** Enable Python Editor Script Plugin and Editor Scripting Utilities (Edit > Plugins > Scripting). Required per project.
- **Python version:** Embedded Python 3.11.8 (VFX Reference Platform); override via `UE_PYTHON_DIR` for custom install.
- **Execution:** Python Console (Output Log), `py` command, File > Execute Python Script; command line: `-ExecutePythonScript="path/to/script.py"` (full editor) or `-run=pythonscript -script="path"` (headless commandlet; add level load if needed).
- **API:** Use `unreal` module. Editor Scripting Utilities provides simplified APIs for common tasks.
- **Headless:** For CI/batch, use pythonscript commandlet. Script runs editor-only; no gameplay at runtime.

## UAT and BuildGraph

- **RunUAT:** `RunUAT.bat` (Win) / `RunUAT.sh` (Linux/Mac). BuildGraph: `RunUAT.bat BuildGraph -Script=Engine/Build/Graph/Examples/AllExamples.xml -ListOnly` to list nodes.
- **BuildGraph:** XML pipelines for build, cook, package, custom tasks. Reference `Engine/Build/Graph/Examples`. Custom tasks: derive from `CustomTask` with `TaskElement` attribute.
- **Commands:** `BuildCookRun`, `BuildPlugin` for packaging. Use BuildGraph for reproducible pipelines.

## Editor Utility Widgets

- **Create:** Right-click Content Browser > Editor Utilities > Editor Utility Widget. Design with UMG; dock as editor tab.
- **Use cases:** Batch asset processing, data visualization, custom editors, pipeline UIs. Runs in editor only (no play mode).
- **Access:** Window menu; Run Editor Utility Widget from asset context menu.

## Data Validation

- **UEditorValidatorBase:** Override `CanValidateAsset` and `ValidateLoadedAsset`; call `AssetPasses` or `AssetFails` for each path.
- **Validators:** C++/Blueprint discovered automatically; Python validators must register. Keep validators in editor-only modules.
- **Run:** Tools > Validate Data; right-click asset. Use for naming conventions, performance budgets, dependency checks.

## Automation tests

- **Python:** Place `test_*.py` in `/Content/Python`; PythonAutomationTest discovers them. Supports latent commands, error reporting, screenshots.
- **C++:** `IMPLEMENT_SIMPLE_AUTOMATION_TEST`; register in automation framework. Run via `-ExecCmds="Automation RunTest Group:MyGroup;Quit"` from command line.
- **Session Frontend:** Tools > Session Frontend > Automation for multi-machine runs.

## CI/CD and headless builds

- **UAT:** Use RunUAT for headless builds. BuildGraph integrates with Horde (Epic CI), UET, Unreal Containers.
- **Prior-art:** Horde (Epic), UET (RedpointGames), Unreal Containers. BuildGraph for reproducible pipelines.

## Materials

- **PBR workflow:** Base Color, Metallic, Roughness, Normal, Emissive, Clear Coat, Refraction. Node-based Material Editor.
- **Material Functions:** Reusable node graphs for common patterns; standardize across project.
- **Best practices:** Optimize texture use; fix over-shiny/dull; ensure correct lighting response. Use M_ prefix.
- **Automation:** Python/Editor Scripting Utilities for batch material creation, parameter tweaks, validation.

## Niagara

- **GPU simulation:** Enable in system properties; use GPU-compatible modules (forces, collisions, position). Handles millions of particles via compute shaders.
- **Use cases:** Explosions, fluids, weather. Niagara Fluids for fire, smoke, gas (2D games, 3D cinematics).
- **Scalability:** Effect Types and scalability settings for per-platform/per-quality particle counts, renderer toggles, culling.
- **Optimization:** Avoid GPU memory saturation; optimize shaders; test across target hardware. Use NS_ prefix.
- **Motion Design integration:** Niagara systems can be driven by Motion Design Cloner/Effector actors. Wire the Cloner's output points as Niagara user parameters to spawn particles at procedural positions. Use a Niagara Data Channel or Direct Binding to pass transform data from the Cloner at runtime.

## Motion Design

Motion Design mode (UE 5.4+, formerly the Sequencer-centric MoGraph workflow) provides a dedicated toolset for motion graphics inside Unreal.

- **Motion Design Mode:** Activate via the mode selector (toolbar left panel). Provides a dedicated panel with Cloners, Effectors, and motion graphics utilities.
- **Cloner actor:** Spawns arrays of meshes in configurable layouts (Grid, Circle, Honeycomb, Line, Sphere). Set `Count`, `Spacing`, and `Layout` in Details. Reference the `AMotionDesignClonerActor` class in C++.
- **Effector actor:** Modifies Cloner instances by proximity or field. Types include Step, Push, Random, Noise. Wire Effector to Cloner via the Effectors array in the Cloner Details panel.
- **Sequencer integration:** Keyframe Cloner/Effector parameters on the Sequencer timeline for time-based motion graphics. Use Sequence Curves for procedural animation beyond simple keyframes.
- **Materials and rendering:** Use translucent/unlit materials for typical MoGraph aesthetics. Combine with Lumen for GI in cinematic renders.
- **Python automation:** Use `unreal.MotionDesignClonerActor` and related classes via editor scripting to batch-create Motion Design setups. Access via `EditorAssetLibrary` and `AssetTools` for programmatic level setup.
- **Niagara integration:** See Niagara section — Cloner output points can drive Niagara particle spawn positions via user parameters or Data Channels.

## MetaSounds

MetaSounds (UE 5.0+, production-standard from 5.2+) is the graph-based procedural audio system replacing Sound Cues.

- **MetaSound Source vs Patch:** Use `MetaSound Source` as the top-level audio asset (plays audio output); use `MetaSound Patch` for reusable subgraphs embedded inside Sources. Patches have defined input/output interfaces that any Source or Patch can call.
- **Inputs and outputs:** Define typed inputs (float, bool, trigger, wave asset, audio) on the graph root. Expose to Blueprint via the `Set Float Parameter`, `Set Bool Parameter`, `Set Wave Parameter` node families on an `Audio Component`.
- **Core DSP nodes:** `Wave Player` (sample playback, pitch, loop), `Envelope Follower`, `Oscillator` (sine/triangle/sawtooth), `Delay`, `EQ` (multi-band), `Compressor`, `Mixer`, `Spatialization` (3D audio). Chain via typed audio wires.
- **Triggers:** Use `On Play` and `On Finished` triggers to drive graph execution. Use `Trigger Repeat` for rhythmic events. Use `On Input Changed` for parameter-driven logic.
- **Blueprint integration:** Add an `Audio Component` to an actor; set `Sound` to your MetaSound Source asset. Use `SetFloatParameter`, `SetBoolParameter`, `SetTriggerParameter`, `SetWaveParameter` Blueprint nodes to drive runtime parameters. Bind to game events for reactive audio.
- **Procedural parameter control:** Drive pitch, volume, reverb send, or entire voice selection from gameplay state (health, speed, environment). Use `Random:Get Random Float in Range` and conditional nodes inside the graph to avoid repetitive audio.
- **Asset prefix:** Use `MS_` for MetaSound Source assets, `MSP_` for MetaSound Patches. Register in project's asset naming guide.

## PCG (Procedural Content Generation)

- **Flow:** Generate points (Samplers: Surface, Spline, Volume) → filter/modify (Self-Pruning, Bounds, Density; Copy Points, Attribute Operations) → spawn (Actor/Static Mesh spawners).
- **Generation modes:** Non-partitioned, Partitioned (grid streaming), Hierarchical (multi-scale), Runtime.
- **Python interop:** PCGPythonInterop plugin; `unreal.PCGComponent` for triggers, modes, callbacks. Automate PCG from Python.
- **Integration:** Niagara FX with PCG points for procedural effects.

## Programmatic asset creation

- **AssetTools.create_asset:** `asset_name`, `package_path`, `asset_class`, `factory`. Use `AssetToolsHelpers.get_asset_tools()` in Python.
- **Factories:** `MaterialInstanceConstantFactoryNew`, `MaterialFactoryNew` for materials; `PCGGraphFactory` for PCG graphs. Pattern: `create_asset(name, path, Class, Factory())`.
- **Materials:** `MaterialEditingLibrary.create_material_expression()`, `connect_material_property()` for master materials. `set_material_instance_scalar_parameter_value()`, `set_material_instance_texture_parameter_value()` for instances.
- **PCGGraph:** `add_node_copy(settings)`, `add_node_instance(settings)`, `add_edge(from, from_pin, to, to_pin)` to build graphs programmatically.
- **Niagara:** `unreal.NiagaraSystem` exists; creation from template/duplicate typical. Factory pattern via `create_asset` where applicable.
- **Save/notify:** `EditorAssetLibrary.save_loaded_asset()` or `save_directory()`; refresh Content Browser so new assets appear.

## Live creation (uasset from Cursor/IDE)

- **Option A — File watcher + Python:** Custom C++ plugin with `FDirectoryWatcher` watching `Content/Python/` or `Scripts/`. On file change, execute Python script. Flow: Edit in Cursor → Save → Plugin runs script → Assets created. Requires C++ plugin.
- **Option B — Editor Utility Widget + JSON/spec:** Widget button reads JSON file (e.g. `{ "type": "MaterialInstance", "parent": "...", "params": {...}, "path": "..." }`) and calls Python or Blueprint to create assets via `AssetTools.create_asset`. No C++ required. Manual "Create" click.
- **Option C — Python script + manual run:** Edit Python in Cursor; run via File > Execute Python Script or `py "path"` in console. Simple; no plugin. Manual run each time.
- **Option D — External watcher + commandlet:** External script (Node/Python) watches folder; on save, spawns `UnrealEditor-Cmd.exe -ExecutePythonScript=path`. Commandlet may not load full editor state.
- **Recommendation:** Option B (Widget + JSON) for no-C++ workflow. Option A (file watcher plugin) for full save-and-see automation.

## Output

- Unreal C++ code with proper UPROPERTY/UFUNCTION usage and GC-safe patterns.
- Blueprint conventions documented and followed.
- Reference pn-blender-scripting for asset pipeline from Blender to Unreal. Python can drive both Blender (bpy) and Unreal (Editor Script) for round-trip or batch pipelines.
