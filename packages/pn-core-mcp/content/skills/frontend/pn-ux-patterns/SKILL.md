---
name: pn-ux-patterns
description: "A11y (labels, headings, focus, contrast, touch targets, hover alternatives), error and copy patterns, and form flow. Use when improving or reviewing UX; reference pn-nextjs for React/Next."
---

# UX patterns

→ *For UX writing depth (button labels, error anatomy, empty state copy): [reference/ux-writing.md](../reference/ux-writing.md)*
→ *For interaction design depth (optimistic UI, progressive disclosure, loading patterns, focus states): [reference/interaction-design.md](../reference/interaction-design.md)*

## When to use

- Adding or reviewing forms, error states, or copy.
- Ensuring accessibility (a11y) and consistent user flows.
- Aligning with pn-nextjs for React/Next projects.

## A11y checks

1. **Labels:** Every form control (input, select, textarea) has an associated `<label>` (by `id`/`htmlFor` or wrapping). Icon-only buttons have `aria-label` or `aria-labelledby`.
2. **Headings:** One `<h1>` per page; heading levels do not skip (e.g. no h1 then h4). Use headings to outline structure.
3. **Focus:** Interactive elements are focusable; focus order is logical; no `focus: none` without a good reason (e.g. modal trap). After dynamic content changes, focus is moved when appropriate (e.g. error message, new modal).
4. **Contrast:** Text meets minimum contrast (WCAG AA where required). Avoid low-contrast placeholder or disabled text as the only content.

## Touch and responsive (WCAG 2.2)

5. **Touch targets:** Interactive elements (buttons, links, form controls) have minimum 44×48 CSS pixels (WCAG 2.5.8: 24×24px absolute minimum). Radios, checkboxes, and small controls: wrap in a label or container with `min-h-[24px] min-w-[24px]` or equivalent; prefer 44×48px for primary controls. Space targets at least 8px apart. Use `@media (pointer: coarse)` to add padding for touch.
6. **Hover alternatives:** No hover-only for critical actions. Menus, tooltips, and reveals need click/tap alternatives when `@media (hover: none)`.
7. **Reflow:** Content functions at 320px width without horizontal scroll. Use flexible layouts, `max-width: 100%` on media.
8. **Zoom:** Never disable zoom (`user-scalable=no`, `maximum-scale=1`). Use rem/em for text.
9. **Pointer gestures:** Provide simple alternatives to drag/swipe for essential actions (e.g. buttons alongside sliders).

## Error and copy patterns

- **Errors:** Show inline or near the field when possible; use `aria-describedby` or `aria-invalid` where applicable. Avoid generic "Something went wrong" without a recovery action or retry.
- **Copy:** Use consistent tone and terminology; avoid jargon in user-facing strings. Keep CTAs clear (e.g. "Save draft" not "Submit").

## Form flow

- Required fields are indicated (visually and in markup, e.g. `aria-required` or "required").
- Validation: prefer validate on blur or submit; show one round of errors before blocking submit again.
- Success or confirmation state after submit (e.g. "Saved" or redirect) so the user knows the action completed.

## Output

- Concrete changes (file, component, prop) for each violation or improvement.
- Reference to pn-nextjs rule when in a React/Next codebase.
- For copy issues, consult [reference/ux-writing.md](../reference/ux-writing.md) for button label patterns, error message anatomy, and empty state structure.
- For interaction state patterns, consult [reference/interaction-design.md](../reference/interaction-design.md) for loading patterns, optimistic UI, and progressive disclosure.
