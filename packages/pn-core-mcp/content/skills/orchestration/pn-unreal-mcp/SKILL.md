---
name: pn-unreal-mcp
description: Compare and select a UE 5.7-compatible MCP server for editor automation. Use at discovery time to pick the best server for your use case, then install and verify tool coverage before planning.
---

# pn-unreal-mcp

## Mission

Survey the available third-party MCP servers that drive the Unreal Engine editor via a C++ Automation Bridge. Present the comparison matrix to the user, collect their use-case priorities, and recommend a server (or confirm their choice). Output an `install_plan` with the chosen server's install snippet and tool mapping so that `engine_feature` step 1 (api-probe) can verify coverage before building.

## When to use

- At `engine_feature` step 0 with `state.engine: "unreal"` (Discovery): load this skill to present the server comparison before the user commits to a tool surface.
- When the user mentions "UE MCP", "Unreal MCP server", or asks which MCP to use for Unreal automation.
- When diagnosing tool-coverage gaps mid-workflow (return here to re-evaluate).

---

## Server comparison matrix

| Server | Language (client + bridge) | UE version range | Stars (approx) | License |
|--------|---------------------------|------------------|----------------|---------|
| **ChiR24/Unreal_mcp** | TypeScript + C++ | 5.0–5.7 | ~525 | MIT |
| **remiphilippe/mcp-unreal** | Go + C++ | 5.7 | ~80 | MIT |
| **SallahBoussettah/UnrealMCP** | Python + C++ | 5.3–5.7 | ~140 | MIT |
| **kangnam7654/unreal-mcp** | Python + C++ | 5.4–5.7 | ~60 | MIT |
| **jimhuangbwy/unreal-mcp-tools** | TypeScript + C++ | 5.5–5.7 | ~30 | Apache-2.0 |
| **StraySpark Unreal MCP Server** | TypeScript + C++ (commercial) | 5.4–5.7 | N/A | Commercial |

### Feature coverage matrix

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
| Headless / CI build | — | ✓✓ | — | — | — | ✓ |
| Python scripting bridge | — | — | ✓✓ | ✓ | — | — |
| MetaSounds / Niagara | — | — | — | — | — | ✓ |
| Commercial support | — | — | — | — | — | ✓✓ |

Legend: ✓ = supported, ✓✓ = deep/first-class, — = not supported or not documented.

---

## Tool-name mapping

The same semantic action has different tool names across servers. Use this table when calling `pn-api-probe` to verify tool surface before planning.

| Intent | ChiR24 | remi | Sallah | kangnam | StraySpark |
|--------|--------|------|--------|---------|------------|
| Create actor | `create_actor` | `ue_create_actor` | `unreal_create_actor` | `create_actor` | `create_actor` |
| Set property | `set_actor_property` | `ue_set_property` | `set_property` | `set_property` | `set_property` |
| Execute console cmd | `execute_console_command` | `ue_console_command` | `run_console_command` | `execute_console` | `console_command` |
| Compile Blueprint | `compile_blueprint` | — | `compile_blueprint` | `compile_bp` | `compile_blueprint` |
| Get asset list | `list_assets` | `ue_list_assets` | `list_assets` | `get_assets` | `list_assets` |
| Take screenshot | `take_screenshot` | `ue_screenshot` | `capture_viewport` | — | `screenshot` |

Confirm the exact tool names by probing the connected server's tool list before writing step instructions.

---

## Install snippets

### ChiR24/Unreal_mcp (recommended: broadest coverage)

1. Install the C++ Automation Bridge plugin into your UE project:
   - Clone or download from `https://github.com/ChiR24/Unreal_mcp`
   - Copy the `MCPBridge` plugin folder into `<ProjectRoot>/Plugins/`
   - Enable the plugin in the UE editor (Edit → Plugins → MCPBridge)
   - Rebuild the project

2. Add to `~/.cursor/mcp.json` (or project-local `.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "unreal-mcp": {
         "command": "npx",
         "args": ["-y", "github:ChiR24/Unreal_mcp"]
       }
     }
   }
   ```

3. Start the MCP bridge in UE (via plugin UI or console command `MCPBridge.Start`), then connect.

### remiphilippe/mcp-unreal (headless builds / CI)

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

### SallahBoussettah/UnrealMCP (Blueprint-heavy)

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

### kangnam7654/unreal-mcp

1. `pip install git+https://github.com/kangnam7654/unreal-mcp`
2. Add to `mcp.json` similarly to Sallah above, using the package's entry-point (`python -m unreal_mcp`).

### jimhuangbwy/unreal-mcp-tools

1. `npx -y github:jimhuangbwy/unreal-mcp-tools`
2. Add the resulting `mcpServers` entry to `mcp.json`.

### StraySpark Unreal MCP Server (commercial)

1. Purchase license at StraySpark's site; follow their installer.
2. MCP JSON config provided post-purchase.

---

## Decision tree

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

## Output

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
