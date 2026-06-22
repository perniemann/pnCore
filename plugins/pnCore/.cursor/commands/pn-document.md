---
name: pn-document
description: Format, validate, or generate project docs — discovery specs, plans, prior-art briefs, README, CHANGELOG. Enforces consistent structure across all doc types.
---

# pn-document

**Start every response with:** `[pn-command] 🔺`

Load **pn-documentation** via `get_skill("pn-documentation")` and apply it to the user's request.

## Scope

Ask if unclear: "Format existing docs, check format compliance, or show format rules for a doc type?"

## Flow

1. Load `get_skill("pn-documentation")` and read the format rules.
2. **Format existing docs:** Apply the format to the specified doc(s) — README, CHANGELOG, or docs in `docs/discovery/`, `docs/plans/`, `docs/research/`, `docs/svg/`. Update only structure and format; preserve content.
3. **Check compliance:** Review specified docs against pn-documentation format. List gaps and suggest fixes.
4. **Show format:** Output the format rules for the requested doc type (discovery, plan, prior-art, SVG spec, README, CHANGELOG, API docs).

## Output

- List of files updated (if formatting) or gaps found (if checking).
- Format rules (if showing).
- One-line summary of what was done.
