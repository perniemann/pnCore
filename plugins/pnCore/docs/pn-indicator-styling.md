# pnCore indicator styling by context

The pnCore visual indicator is **🔺** (Unicode U+1F53A — emoji red triangle pointed up), preceded by a context tag so clients can parse and filter by feature.

## Why an emoji glyph

Cursor's chat UI renders assistant messages as markdown but does **not** apply our `assets/pn-indicator.css` to that content. The plain Unicode triangle `▲` (U+25B2) therefore inherits the chat's default text color, which is white or grey on dark themes — invisible-as-color.

Emoji code points such as 🔺 carry their own glyph color, rendered by the OS/font emoji table (Segoe UI Emoji on Windows, Apple Color Emoji on macOS, Noto Color Emoji on Linux). The triangle renders red on every mainstream platform without requiring CSS, so the indicator is visible in the default Cursor chat UI.

## Context tags

The indicator appears as the **first content of every response touched by pnCore** (see the rule `pn-visual-indicator` for the definition of "touched"), e.g. `[pn-command] 🔺` or `[pn-default] 🔺`.

| Tag | Use case | Glyph |
|-----|----------|-------|
| `[pn-default]` | Rules, default chat | 🔺 |
| `[pn-command]` | Command (pn-new, pn-build, etc.) | 🔺 |
| `[pn-agent]` | Agent (pn-project-builder, pn-reviewer, etc.) | 🔺 |
| `[pn-skill]` | Skill-led response | 🔺 |
| `[pn-plan]` | Cursor IDE plan mode | 🔺 |

The triangle glyph is the same in every context; the bracketed text tag carries the context. This is a deliberate simplification — the user-visible signal is "pnCore touched this response" (red triangle), and the text tag is the parseable secondary signal for clients and userscripts.

## Legacy: client-side color-by-context

Clients that **can** parse the first line and inject styles (userscripts, future Cursor chat-CSS support) may choose to render per-context colors against the legacy plain-Unicode `▲` glyph instead of the emoji.

| Tag | Suggested client color |
|-----|------------------------|
| `[pn-default]` | Red (main) |
| `[pn-command]` | Blue |
| `[pn-agent]`   | Green |
| `[pn-skill]`   | Amber |
| `[pn-plan]`    | Purple |

To enable this:

1. Detect the tag at the start of any pn-touched assistant message: `[pn-default]`, `[pn-command]`, `[pn-agent]`, `[pn-skill]`, or `[pn-plan]`.
2. Wrap the triangle (or the whole first line) in an element with `data-pn-context="default"` (or `command`, `agent`, `skill`, `plan`).
3. Apply the color for that context.

Reference CSS lives in the plugin at **`assets/pn-indicator.css`**. The emoji form is the canonical default in pnCore; this CSS-based form is supported for advanced clients but no longer required for color visibility.
