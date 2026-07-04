---
name: pn-html-preview
description: "Save self-contained HTML from a fenced html block, open in browser, optional screenshot evidence. Use for static UI aesthetic iteration."
---

# HTML Preview

## When to use

- Static landing page, component demo, or HTML email prototype (saved as `.html` for visual check).
- Any request where the output is "one HTML file" and distinctiveness matters.
- After **`pn-design`** or **`pn-frontend-design`** when stack is vanilla HTML.

## Instructions

### 1. Obtain HTML

If not already in chat: ask the user to paste the **` ```html `** block or point to a file.

Extract the **first** fenced `html` block (or use the file contents if they gave a path). Strip the fence lines only; keep `<!DOCTYPE html>` through closing `</html>`.

### 2. Save

- Default directory: **`html_outputs/`** at project root (create if missing).
- Filename: `html_outputs/YYYYMMDD_HHMMSS_preview.html` or a user-provided name (sanitized, `.html` only).
- Write UTF-8. Do not overwrite without confirmation.

### 3. Open and verify

- Open the file in the system default browser (e.g. `xdg-open`, `open`, or `start` with **file://** absolute path). If the environment blocks browser launch, print the **absolute path** and instruct the user to open it locally.
- Quick pass: layout, typography, color, motion (if any), and **reduced-motion** behavior if media queries exist.

### 4. Evidence (optional)

For high-stakes UI, run **`pn-evidence-qa`** or capture a screenshot after load and attach to the summary.

### 5. Summary

Output: file path, how to reopen, and any issues found in the browser pass.

## Guardrails

- **Security:** Do not fetch remote scripts into the file unless the user asked; prefer self-contained snippets for previews.
- **Parser:** If the model did not use a **` ```html `** fence, ask for a single fenced block — downstream tooling and this skill assume that format.
