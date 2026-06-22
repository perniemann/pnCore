---
name: pn-frontend-scaffolding
description: Scaffolds new pages and components by stack (React, Next.js, Astro, or vanilla). Use when adding a new page or component; branch by stack per config; covers pages, components, layout, and a11y basics.
---

# Frontend scaffolding

## When to use

- Adding a new page or route (React, Next.js, Astro, or vanilla)
- Creating a new reusable component
- Setting up a minimal layout or shell

Use the subsection below that matches the project stack (from discovery or config). Reference `config/stacks.json` for stack-to-scaffold mapping.

- **Component library (when discovery specifies one):** Prefer installing/using library components over scaffolding new ones. Create a new component only when the library does not provide the needed component. Use pn-ui-component-libraries.

## React / Next.js

- **Fonts (when ambition = distinctive/award-winning):** Use Syne (display) + DM Sans (body). Do not scaffold with Geist or Inter. Add Google Fonts link; set `--font-display`, `--font-sans`; apply to layout.
- **New page:** One file per route. In Next.js use `app/` or `pages/` structure; add `loading.tsx` and `error.tsx` for async routes. In other React setups, follow the project's routing.
- **New component:** One component per file; PascalCase file name. Export the component; add a short JSDoc or comment if the purpose isn't obvious.
- **Scaffold content:** Minimal heading and placeholder content so the page is valid and renderable. Add a11y basics (e.g. one `<h1>` per page, labels for form controls when you add them).
- **One at a time:** Prefer scaffolding one page or one component per change. Reference pn-nextjs for Next.js loading/error boundaries.

## Astro

- **New page:** One `.astro` file per route. Use a clear layout (e.g. base layout + page-specific content).
- **Astro islands:** Use `client:load` (or other `client:*`) only for parts that need interactivity. Keep the rest static. Prefer the lightest directive that matches the UX (e.g. `client:visible` for below-fold).
- **New component:** One component per file; PascalCase for React islands, or .astro for Astro components. Add a short comment if the purpose isn't obvious.
- **Scaffold content:** Minimal heading and placeholder content; a11y basics (e.g. one `<h1>` per page).
- **One at a time:** Prefer one page or one component per change.

## Vanilla HTML/CSS/JS

- **New page:** One HTML file per page. Use semantic structure: `<header>`, `<main>`, `<nav>`, `<footer>`, `<article>`, `<section>`.
- **CSS:** Separate CSS file or inline `<style>` for single-file demos. Use design tokens / CSS variables when possible.
- **JS:** Minimal JavaScript for interactivity. Prefer progressive enhancement; content works without JS when feasible.
- **A11y:** One `<h1>` per page, labels for form controls, logical heading order, focus order.

## Touch targets

- Nav links, locale switchers, icon buttons: min 24×24px (`min-h-[24px] min-w-[24px]` or padding ≥12px). Prefer 44×48px for primary CTAs.

## Output

- Created files (page or component) valid and renderable.
- Reference pn-design-system for tokens; pn-ux-patterns for a11y.

## Guardrails

- **pn-frontend-design** — Apply for visual and UX quality once scaffold exists.
- **pn-react-next-perf** — Use for React/Next data loading and performance when adding data or routes.
