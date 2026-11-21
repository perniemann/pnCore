---
name: pn-engine-mcp
description: "Compare and install a game-engine MCP server (Unreal Engine 5.x or Godot 4.x) for editor automation. Use at discovery time to select a server, install it, and verify tool coverage before planning."
---

# Engine MCP selection

One skill for both engines: pick the section that matches the project's engine. `engine_feature` step 0 loads this skill for either engine.

## When to use

- Discovery for an Unreal Engine 5.x or Godot 4.x project that will drive the editor through MCP (`engine_feature` step 0).
- Choosing, installing or replacing an engine MCP server.
- Before planning: verify the live tool list of the installed server; plan only against tools it exposes.

<!-- merged from pn-unreal-mcp (0.22.0) -->
## Unreal Engine 5.x

### Mission

Survey the available third-party MCP servers that drive the Unreal Engine editor via a C++ Automation Bridge. Present the comparison matrix to the user, collect their use-case priorities, and recommend a server (or confirm their choice). Output an `install_plan` with the chosen server's install snippet and tool mapping so that `engine_feature` step 1 (api-probe) can verify coverage before building.

### When to use

- At `engine_feature` step 0 with `state.engine: "unreal"` (Discovery): load this skill to present the server comparison before the user commits to a tool surface.
- When the user mentions "UE MCP", "Unreal MCP server", or asks which MCP to use for Unreal automation.
- When diagnosing tool-coverage gaps mid-workflow (return here to re-evaluate).

---

### Server comparison matrix

| Server | Language (client + bridge) | UE version range | Stars (approx) | License |
|--------|---------------------------|------------------|----------------|---------|
| **ChiR24/Unreal_mcp** | Native HTTP or TypeScript + C++ bridge | 5.0–5.8 | ~870 | MIT |
| **remiphilippe/mcp-unreal** | Go + C++ | 5.7 | ~80 | MIT |
| **SallahBoussettah/UnrealMCP** | Python + C++ | 5.3–5.7 | ~140 | MIT |
| **kangnam7654/unreal-mcp** | Python + C++ | 5.4–5.7 | ~60 | MIT |
| **jimhuangbwy/unreal-mcp-tools** | TypeScript + C++ | 5.5–5.7 | ~30 | Apache-2.0 |
| **StraySpark Unreal MCP Server** | TypeScript + C++ (commercial) | 5.4–5.7 | N/A | Commercial |

#### Feature coverage matrix

| Capability | ChiR24 | remi | Sallah | kangnam | jim | StraySpark |
|------------|:------:|:----:|:------:|:-------:|:---:|:----------:|
| Actor create / delete / move | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Blueprint create / compile | ✓ | — | ✓✓ | ✓ | ✓ | ✓ |
| Blueprint node graph edit | ✓ | — | ✓✓ | — | — | ✓ |
| Material create / edit | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Level / World Partition | ✓ | ✓ | — | ✓ | — | ✓ |
| Animation / Sequencer | ✓ | — | ✓ | — | ✓ | ✓ |
| Widget / UMG UI | ✓ | — | ✓ | — | — | ✓ |
| Execute console command | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Headless / CI build | ✓ | ✓✓ | — | — | — | ✓ |
| Python scripting bridge | ✓ | — | ✓✓ | ✓ | — | — |
| MetaSounds / Niagara | ✓ | — | — | — | — | ✓ |
| Commercial support | — | — | — | — | — | ✓✓ |

Legend: ✓ = supported, ✓✓ = deep/first-class, — = not supported or not documented.

---

### Tool-name mapping

The same semantic action has different tool names across servers. Use this table when calling `pn-api-probe` to verify tool surface before planning.

| Intent | ChiR24 | remi | Sallah | kangnam | StraySpark |
|--------|--------|------|--------|---------|------------|
| Create actor | `control_actor` action | `ue_create_actor` | `unreal_create_actor` | `create_actor` | `create_actor` |
| Set property | `control_actor` action | `ue_set_property` | `set_property` | `set_property` | `set_property` |
| Execute console cmd | `system_control` action | `ue_console_command` | `run_console_command` | `execute_console` | `console_command` |
| Compile Blueprint | `manage_blueprint` action | — | `compile_blueprint` | `compile_bp` | `compile_blueprint` |
| Get asset list | `manage_asset` action | `ue_list_assets` | `list_assets` | `get_assets` | `list_assets` |
| Take screenshot | `control_editor` action | `ue_screenshot` | `capture_viewport` | — | `screenshot` |

Confirm the exact tool names by probing the connected server's tool list before writing step instructions.

---

### Install snippets

#### ChiR24/Unreal_mcp (recommended: broadest coverage)

1. Install the C++ Automation Bridge plugin into your UE project:
   - Clone or download from `https://github.com/ChiR24/Unreal_mcp`
   - Copy `plugins/McpAutomationBridge/` into `<ProjectRoot>/Plugins/McpAutomationBridge/`
   - Enable **MCP Automation Bridge** plus **Editor Scripting Utilities** in the UE editor
   - Rebuild the project

2. Choose one transport:

   **Native HTTP (recommended):** Enable **Native MCP** under Project Settings → Plugins → MCP Automation Bridge, restart the editor, and connect the client to `http://localhost:3000/mcp`.

   ```json
   {
     "mcpServers": {
       "unreal-engine": {
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

   **TypeScript stdio bridge:** Keep the automation plugin enabled and configure:

   ```json
   {
     "mcpServers": {
       "unreal-engine": {
         "command": "npx",
         "args": ["-y", "unreal-engine-mcp-server"],
         "env": { "UE_PROJECT_PATH": "/path/to/project" }
       }
     }
   }
   ```

3. Probe the connected server's live tool list. ChiR24 now groups operations under tools such as `control_actor`, `manage_blueprint`, `manage_asset`, and `system_control`; do not assume older one-tool-per-action names.

#### remiphilippe/mcp-unreal (headless builds / CI)

1. Install Go 1.22+.
2. `go install github.com/remiphilippe/mcp-unreal@latest`
3. Add to `mcp.json`:
   ```json
   {
     "mcpServers": {
       "unreal-mcp": {
         "command": "mcp-unreal",
         "args": ["--ue-path", "/path/to/UE5.7"]
       }
     }
   }
   ```

#### SallahBoussettah/UnrealMCP (Blueprint-heavy)

1. `pip install unrealmcp` (or `pip install git+https://github.com/SallahBoussettah/UnrealMCP`)
2. Install the companion C++ plugin into your UE project (see repo README).
3. Add to `mcp.json`:
   ```json
   {
     "mcpServers": {
       "unreal-mcp": {
         "command": "python",
         "args": ["-m", "unrealmcp.server"]
       }
     }
   }
   ```

#### kangnam7654/unreal-mcp

1. `pip install git+https://github.com/kangnam7654/unreal-mcp`
2. Add to `mcp.json` similarly to Sallah above, using the package's entry-point (`python -m unreal_mcp`).

#### jimhuangbwy/unreal-mcp-tools

1. `npx -y github:jimhuangbwy/unreal-mcp-tools`
2. Add the resulting `mcpServers` entry to `mcp.json`.

#### StraySpark Unreal MCP Server (commercial)

1. Purchase license at StraySpark's site; follow their installer.
2. MCP JSON config provided post-purchase.

---

### Decision tree

Use the following to recommend a server. Ask the user for their primary use case if not stated:

```
Primary use case?
├─ Blueprint-heavy (create graphs, debug, compile)
│   └─ → Sallah (SallahBoussettah/UnrealMCP) — deepest Blueprint graph editing
├─ CI / headless build pipeline (no editor UI)
│   └─ → remi (remiphilippe/mcp-unreal) — only server with first-class headless build
├─ Broadest coverage (actors, levels, materials, animations, widgets, UMG)
│   └─ → ChiR24/Unreal_mcp — widest tool surface, active maintenance, most stars
├─ MetaSounds / Niagara / commercial SLA required
│   └─ → StraySpark — commercial-grade coverage of audio/FX subsystems
└─ Python-first workflow (existing Python scripts, UE Python bridge)
    └─ → Sallah or kangnam — Python client with UE Python module bridge
```

---

### Output

After user selects a server, emit:

```json
{
  "ueMcpServer": "<server-id>",
  "ueVersion": "<version>",
  "install_plan": {
    "server": "<ChiR24|remi|Sallah|kangnam|jim|StraySpark>",
    "install_command": "<npm/pip/go command>",
    "mcp_json_entry": { "...": "..." },
    "plugin_setup_notes": "<C++ plugin install steps if required>"
  },
  "tool_surface_to_probe": ["<tool1>", "<tool2>", "..."]
}
```

Pass `ueMcpServer`, `ueVersion`, and `tool_surface_to_probe` to step 1 for `pn-api-probe` verification.

<!-- merged from pn-godot-mcp (0.22.0) -->
## Godot 4.x

### Mission

Survey the available third-party MCP servers that drive the Godot Engine editor or runtime. Present the comparison matrix to the user, collect their use-case priorities, and recommend a server (or confirm their choice). Output an `install_plan` with the chosen server's install snippet and tool mapping so that `engine_feature` step 1 (api-probe) can verify coverage before building.

### When to use

- At `engine_feature` step 0 with `state.engine: "godot"` (Discovery): load this skill to present the server comparison before the user commits to a tool surface.
- When the user mentions "Godot MCP", "Godot MCP server", or asks which MCP to use for Godot automation.
- When diagnosing tool-coverage gaps mid-workflow (return here to re-evaluate).

---

### Server comparison matrix

| Server | Architecture | Godot version | Stars (approx) | License |
|--------|-------------|--------------|----------------|---------|
| **Coding-Solo/godot-mcp** | External CLI (Node.js spawns Godot process) | 4.x | Check live | MIT |
| **3ddelano/gdai-mcp-plugin-godot** | Editor plugin plus Python MCP bridge | 4.1+ | Check live | Custom; verify current terms |
| **ee0pdt/Godot-MCP** | External CLI (Node.js) | 4.x | ~500 | MIT |
| **tugcantopaloglu/godot-mcp** | External CLI (fork of Coding-Solo, expanded) | 4.x | ~60 | MIT |
| **bradypp/godot-mcp** | External CLI (Node.js) | 4.x | ~40 | MIT |

#### Feature coverage matrix

| Capability | Coding-Solo | gdai (3ddelano) | ee0pdt | tugcantopaloglu | bradypp |
|------------|:-----------:|:---------------:|:------:|:---------------:|:-------:|
| Launch editor / run project | ✓ | — | ✓ | ✓ | ✓ |
| Capture console / error output | ✓ | ✓✓ | ✓ | ✓ | ✓ |
| Scene tree read | ✓ | ✓✓ | ✓ | ✓ | ✓ |
| Node create / move / delete | ✓ | ✓✓ | ✓ | ✓ | ✓ |
| Script create / edit / fix | ✓ | ✓✓ | ✓ | ✓ | ✓ |
| Real-time live editor state | — | ✓✓ | — | — | — |
| Debugger / parse error read | — | ✓✓ | — | — | — |
| End-to-end screenshot capture | — | ✓✓ | — | — | — |
| Physics / audio / networking tools | — | — | — | ✓✓ | — |
| Project settings / export config | — | — | ✓ | ✓ | — |
| Headless / CI automation | ✓ | — | ✓ | ✓ | ✓ |

Legend: ✓ = supported, ✓✓ = deep/first-class, — = not supported or not documented.

---

### Tool-name mapping

The same semantic action has different tool names across servers. Use this table when calling `pn-api-probe` to verify tool surface before planning.

| Intent | Coding-Solo | gdai | ee0pdt | tugcantopaloglu |
|--------|-------------|------|--------|-----------------|
| Run project | `run_project` | — | `run_project` | `run_project` |
| Get scene tree | `get_scene_tree` | `get_scene_tree` | `get_scene_tree` | `get_scene_tree` |
| Create node | `create_node` | `create_node` | `create_node` | `create_node` |
| Get node properties | `get_node_properties` | `get_node_properties` | `get_node_info` | `get_node_properties` |
| Edit script | `edit_script` | `create_script` / `edit_script` | `write_script` | `edit_script` |
| Read editor errors | `get_debug_output` | `get_errors` | `get_editor_output` | `get_debug_output` |
| Take screenshot | — | `take_screenshot` | — | — |
| Add child to scene | `add_node` | `add_node` | `add_node` | `add_node` |

Confirm exact tool names by probing the connected server's tool list before writing step instructions.

---

### Install snippets

#### Coding-Solo/godot-mcp (recommended: broadest use, highest stars)

1. Set your Godot binary path:
   ```bash
   export GODOT_PATH=/path/to/godot4   # Linux/macOS
   # or set GODOT_PATH in your shell profile / system env
   ```
2. Add to `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "godot-cli": {
         "command": "npx",
         "args": ["-y", "@coding-solo/godot-mcp"],
         "env": {
           "GODOT_PATH": "/path/to/godot4"
         }
       }
     }
   }
   ```
3. Open your Godot project. The MCP server communicates by spawning Godot processes externally.

#### 3ddelano/gdai-mcp-plugin-godot (recommended: live editor control, debugging, screenshots)

1. Follow the current [GDAI installation guide](https://gdaimcp.com/docs/installation).
2. Copy `addons/gdai-mcp-plugin-godot/` into the project, then enable **GDAI MCP** under Project Settings → Plugins.
3. Install `uv`, open the GDAI MCP panel, and copy the generated path to `gdai_mcp_server.py`.
4. Add the stdio bridge to the active harness's MCP configuration:
   ```json
   {
     "mcpServers": {
       "godot-gdai": {
         "command": "uv",
         "args": ["run", "/absolute/path/to/addons/gdai-mcp-plugin-godot/gdai_mcp_server.py"]
       }
     }
   }
   ```
5. Keep Godot and the plugin server running. URL-only clients can start the bridge with `--transport http --port 9090` and connect to `http://127.0.0.1:9090/mcp`.

#### ee0pdt/Godot-MCP

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["-y", "github:ee0pdt/Godot-MCP"],
      "env": { "GODOT_PATH": "/path/to/godot4" }
    }
  }
}
```

#### tugcantopaloglu/godot-mcp (149+ tools, physics/audio/networking)

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["-y", "github:tugcantopaloglu/godot-mcp"],
      "env": { "GODOT_PATH": "/path/to/godot4" }
    }
  }
}
```

---

### Decision tree

Use the following to recommend a server. Ask the user for their primary use case if not stated:

```
Primary use case?
├─ Live editor control (real-time scene tree, script fixes, debugger, screenshots)
│   └─ → gdai (3ddelano/gdai-mcp-plugin-godot) — only server running inside the editor
├─ Broadest open-source support, highest community adoption, CI-compatible
│   └─ → Coding-Solo/godot-mcp — ~3.2k stars, active, external CLI
├─ Physics / audio / networking / procedural generation tools (149+ tools)
│   └─ → tugcantopaloglu/godot-mcp — comprehensive fork of Coding-Solo
├─ Project settings, export config, node/script operations + community docs
│   └─ → ee0pdt/Godot-MCP — ~500 stars, well-documented
└─ Lightweight scene tree read + script generation only
    └─ → bradypp/godot-mcp — minimal footprint
```

---

### Output

After user selects a server, emit:

```json
{
  "godotMcpServer": "<server-id>",
  "godotVersion": "<version>",
  "install_plan": {
    "server": "<Coding-Solo|gdai|ee0pdt|tugcantopaloglu|bradypp>",
    "install_command": "<npx command or plugin install steps>",
    "mcp_json_entry": { "...": "..." },
    "env_vars": { "GODOT_PATH": "<path>" }
  },
  "tool_surface_to_probe": ["<tool1>", "<tool2>", "..."]
}
```

Pass `godotMcpServer`, `godotVersion`, and `tool_surface_to_probe` to step 1 for `pn-api-probe` verification.
