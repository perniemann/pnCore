---
name: pn-godot-mcp
description: Compare and select a Godot 4.x-compatible MCP server for editor automation. Use at discovery time to pick the best server for your use case, then install and verify tool coverage before planning.
---

# pn-godot-mcp

## Mission

Survey the available third-party MCP servers that drive the Godot Engine editor or runtime. Present the comparison matrix to the user, collect their use-case priorities, and recommend a server (or confirm their choice). Output an `install_plan` with the chosen server's install snippet and tool mapping so that `engine_feature` step 1 (api-probe) can verify coverage before building.

## When to use

- At `engine_feature` step 0 with `state.engine: "godot"` (Discovery): load this skill to present the server comparison before the user commits to a tool surface.
- When the user mentions "Godot MCP", "Godot MCP server", or asks which MCP to use for Godot automation.
- When diagnosing tool-coverage gaps mid-workflow (return here to re-evaluate).

---

## Server comparison matrix

| Server | Architecture | Godot version | Stars (approx) | License |
|--------|-------------|--------------|----------------|---------|
| **Coding-Solo/godot-mcp** | External CLI (Node.js spawns Godot process) | 4.x | ~3.2k | MIT |
| **3ddelano/gdai-mcp-plugin-godot** | Internal editor plugin (WebSocket, runs inside editor) | 4.1+ | ~72 | MIT |
| **ee0pdt/Godot-MCP** | External CLI (Node.js) | 4.x | ~500 | MIT |
| **tugcantopaloglu/godot-mcp** | External CLI (fork of Coding-Solo, expanded) | 4.x | ~60 | MIT |
| **bradypp/godot-mcp** | External CLI (Node.js) | 4.x | ~40 | MIT |

### Feature coverage matrix

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

## Tool-name mapping

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

## Install snippets

### Coding-Solo/godot-mcp (recommended: broadest use, highest stars)

1. Set your Godot binary path:
   ```bash
   export GODOT_PATH=/path/to/godot4   # Linux/macOS
   # or set GODOT_PATH in your shell profile / system env
   ```
2. Add to `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "godot": {
         "command": "npx",
         "args": ["-y", "github:Coding-Solo/godot-mcp"],
         "env": {
           "GODOT_PATH": "/path/to/godot4"
         }
       }
     }
   }
   ```
3. Open your Godot project. The MCP server communicates by spawning Godot processes externally.

### 3ddelano/gdai-mcp-plugin-godot (recommended: live editor control, debugging, screenshots)

1. Download the plugin from [github.com/3ddelano/gdai-mcp-plugin-godot/releases](https://github.com/3ddelano/gdai-mcp-plugin-godot/releases).
2. Extract into `<ProjectRoot>/addons/gdai_mcp/`. Enable in Editor → Project → Project Settings → Plugins → GDAI MCP.
3. The plugin starts a WebSocket MCP server on `localhost:6969` when the editor is open.
4. Add to `mcp.json`:
   ```json
   {
     "mcpServers": {
       "godot": {
         "type": "url",
         "url": "http://localhost:6969/mcp"
       }
     }
   }
   ```
5. Keep the Godot editor open while using Cursor — the plugin must be running.

### ee0pdt/Godot-MCP

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

### tugcantopaloglu/godot-mcp (149+ tools, physics/audio/networking)

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

## Decision tree

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

## Output

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
