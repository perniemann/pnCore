---
name: pn-a11y-audit
description: "Accessibility audit for web apps. axe-core integration, WCAG 2.2 AA checklist, screen-reader testing (NVDA/VoiceOver), focus trap patterns, and keyboard navigation. Use when auditing or fixing accessibility issues."
---

# Accessibility audit

## When to use

- Auditing a page or component for WCAG 2.2 Level AA compliance
- Adding automated accessibility testing to the CI pipeline
- Testing with a screen reader (NVDA, VoiceOver, TalkBack)
- Reviewing keyboard navigation, focus management, and ARIA patterns
- Fixing specific accessibility violations found by a linter or audit report

## WCAG 2.2 Level AA — key requirements

| Criterion | Level | What it means |
|---|---|---|
| 1.1.1 Non-text content | A | All images have alt text; decorative images use `alt=""` |
| 1.3.1 Info and Relationships | A | Structure conveyed via semantics, not just visually |
| 1.3.5 Identify Input Purpose | AA | `autocomplete` attributes on form fields |
| 1.4.3 Contrast (minimum) | AA | Text ≥ 4.5:1 contrast ratio; large text ≥ 3:1 |
| 1.4.4 Resize Text | AA | Text readable at 200% zoom without horizontal scroll |
| 1.4.10 Reflow | AA | Content usable at 320px viewport width |
| 1.4.11 Non-text Contrast | AA | UI components ≥ 3:1 against adjacent colour |
| 1.4.12 Text Spacing | AA | No loss of content when line-height / letter-spacing increased |
| 2.1.1 Keyboard | A | All functionality available via keyboard |
| 2.4.3 Focus Order | A | Focus moves in logical reading order |
| 2.4.7 Focus Visible | AA | Keyboard focus is visually apparent |
| 2.4.11 Focus Appearance | AA (new 2.2) | Focus indicator area ≥ 2px perimeter, ≥ 3:1 contrast |
| 2.5.3 Label in Name | A | Accessible name contains visible text label |
| 2.5.8 Target Size | AA (new 2.2) | Interactive targets ≥ 24×24px |
| 3.1.1 Language of Page | A | `<html lang="en">` set |
| 4.1.2 Name, Role, Value | A | All UI components have accessible name, role, state |
| 4.1.3 Status Messages | AA | Status messages announced without focus move |

## Automated testing with axe-core

```typescript
// Vitest + jsdom
import { axe } from "jest-axe";
import { render } from "@testing-library/react";

test("LoginForm has no accessibility violations", async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

```typescript
// Playwright (integration / E2E)
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Homepage is accessible", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toHaveLength(0);
});
```

```bash
# CLI scan (quick audit of a running server)
npx axe http://localhost:3000 --tags wcag2a,wcag2aa,wcag22aa
```

## ESLint a11y (static analysis)

```bash
npm install -D eslint-plugin-jsx-a11y
```

```json
// .eslintrc.json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

Catches: missing alt text, invalid ARIA roles, non-interactive elements with click handlers, missing form labels.

## Common violations and fixes

### Missing alt text

```jsx
// Bad
<img src="/hero.jpg" />

// Good
<img src="/hero.jpg" alt="Designer at a desk with dual monitors" />

// Decorative (empty alt — screen reader ignores it)
<img src="/divider.svg" alt="" role="presentation" />
```

### Insufficient colour contrast

```css
/* Bad — 2.5:1 ratio */
color: #9ca3af; /* gray-400 on white */

/* Good — 4.7:1 ratio */
color: #6b7280; /* gray-500 on white */
```

Use tools: [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/), browser DevTools accessibility panel.

### Non-semantic interactive elements

```jsx
// Bad — div is not focusable/operable without extra ARIA
<div onClick={handleClick}>Click me</div>

// Good
<button type="button" onClick={handleClick}>Click me</button>

// If you must use a non-semantic element
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={(e) => e.key === "Enter" && handleClick()}>
  Click me
</div>
```

### Focus trap (modals, dialogs)

```typescript
// Use Radix UI Dialog, Headless UI Dialog, or @radix-ui/react-focus-trap
// These handle focus trap, Escape key, and scroll lock out of the box.
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root>
  <Dialog.Trigger asChild><button>Open</button></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>My dialog</Dialog.Title>
      {/* Focus trapped here; Escape closes */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Live regions (dynamic content)

```jsx
// Announce status updates without moving focus
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage} {/* e.g. "Form submitted successfully" */}
</div>

// For urgent announcements (errors)
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

## Screen reader testing checklist

### VoiceOver (macOS / iOS)

```
macOS:  Cmd+F5 to toggle; VO = Ctrl+Option
  - Tab to navigate links/buttons
  - VO+A to read page; VO+H to list headings
  - VO+U to open Web Rotor (landmarks, headings, links)

iOS:    Settings > Accessibility > VoiceOver
  - Swipe right to next element; double-tap to activate
```

### NVDA (Windows, free)

```
  - Download: https://www.nvaccess.org/download/
  - NVDA+Space: browse / focus mode toggle
  - H: next heading; B: next button; F: next form field
  - NVDA+F7: Elements list (headings, links, landmarks)
```

### Testing script

1. Navigate the page using only Tab — can you reach all interactive elements?
2. Activate each button/link with Enter/Space — does it work?
3. Open a modal — does focus move to it? Does Escape close it? Does focus return?
4. Fill out a form — does each field announce its label and error state?
5. Dynamic updates (toast, loading) — are they announced without focus change?

## Keyboard navigation checklist

- [ ] All interactive elements are reachable by Tab in logical order
- [ ] Focus indicator is visible on all focusable elements
- [ ] Modals trap focus and return it on close
- [ ] Custom dropdowns/menus support arrow keys and Escape
- [ ] Skip-to-content link is first focusable element on page
- [ ] No keyboard trap — Esc always provides an escape path

## Output

- axe-core automated test added to component/page test suite
- Playwright accessibility tests for key user flows
- Identified violations with severity (critical, serious, moderate, minor)
- Fixed violations with code examples
- Screen reader test notes

## Guardrails

- Reference `pn-ux-patterns` for semantic HTML and ARIA patterns during implementation.
- Reference `pn-frontend-design-philosophy` for colour contrast and typography.
- Automated testing catches ~30–40% of WCAG issues — always supplement with manual and screen-reader testing.
- Never suppress axe violations with `aria-hidden` as a workaround — fix the root cause.
