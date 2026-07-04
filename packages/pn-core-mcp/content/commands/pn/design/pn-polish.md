---
name: pn-polish
description: Pre-ship design quality pass — typography, color, spacing, copy, a11y, and interaction states. Use for design-only polish. For code quality and performance review, use pn-review. For a scored diagnosis with roadmap, use pn-frontend-audit.
---

# pn-polish

**Start every response with:** `[pn-command] 🔺`

Pre-ship quality pass covering all design dimensions. Finds the last 20% of issues that matter: microcopy, edge states, contrast, rhythm, interaction completeness.

## Flow

### 1. Scope

Confirm what to polish. If not specified: "What's the scope? (e.g. 'the checkout flow', 'the dashboard page', 'the settings modal')"

### 2. Polish Pass

Run in order. Each check produces a numbered issue list; fix all before moving on.

**Typography**
- Font choice generic? (run AI Slop Test on font)
- Type scale consistent? More than 5 distinct sizes?
- Body text within readable line length?
- Heading hierarchy clear (display / reading / utility layers)?

**Color**
- Any gray text on a colored background?
- AI color palette present? (cyan-on-dark, purple-to-blue, neon-on-dark)
- WCAG contrast passing for body text (4.5:1) and UI components (3:1)?
- Accent color overused (>10% of visual weight)?

**Spacing**
- Same padding everywhere? Or is there spatial rhythm?
- Sections using generous spacing? Content grouped with tight spacing?
- Touch targets meeting 44×48px minimum?

**Copy**
- Button labels: action-object format? No "Submit", "OK", "Click here"?
- Error messages: specific + recovery action?
- Empty states: acknowledge + explain + CTA?
- Placeholder text: example content, not instruction text?

**Interaction states**
- Loading state: skeleton/spinner/progress as appropriate?
- Error state: visible, actionable, non-blaming?
- Success state: explicit confirmation?
- Empty state: teaches, not just "nothing here"?
- Hover AND focus states both designed?
- Disabled state: visually distinct but not misleading?

**A11y quick check**
- Focus rings visible and branded (not just browser default)?
- Icon-only buttons have `aria-label`?
- Interactive elements keyboard accessible?
- Form fields have associated labels?

### 3. Fix

Apply all issues found. If scope is large, prioritize: interaction states first, then a11y, then copy, then visual refinement.

### 4. Marketing preflight (when applicable)

For landing pages, portfolios, or editorial marketing surfaces, run **`get_command("pn-preflight")`** after polish fixes. Do not declare done on **`SHIP: NO-GO`**.

### 5. Summary

Issues found / fixed, any remaining items that require designer/product input.

## Skills to Use

- **pn-frontend-design** — AI Slop Test, aesthetic anti-patterns
- **pn-preflight** — `pn-core://reference/marketing-ship-gate.md` (strict/studio tier)
- **pn-ux-patterns** — a11y, form, interaction states
- **pn-typography** — type scale, loading
- **pn-color-system** — contrast, token usage
- *reference/ux-writing.md* — copy patterns
- *reference/interaction-design.md* — state patterns
