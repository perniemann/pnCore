---
name: pn-ui-component-libraries
description: "Curated UI/UX and component library knowledge. Recommends libraries for stack and use case; when shadcn MCP is available, use its tools to browse/search/install. Use when building UI, during discovery, or prior-art for frontend projects."
---

# UI and component libraries

## When to use

- Building UI components, forms, layouts, or pages (React, Next.js, Astro).
- Discovery or planning: user asks about component libraries, design systems, or which UI stack to use.
- Prior-art for frontend: inform library recommendations before broad search.
- Adding components from a registry: forms, dialogs, data tables, etc.

## shadcn/ui (primary recommendation for React/Next)

**Overview:** Copy-paste component library built on Radix primitives. You own the code; no runtime dependency. Tailwind CSS. [https://ui.shadcn.com](https://ui.shadcn.com)

**When to use:**
- React or Next.js projects
- Need accessible, customizable components without black-box dependencies
- Want full control over styling and behavior

**MCP integration:** When **shadcn MCP is available**, use its tools to:
- Browse all components and blocks in the registry
- Search by name or functionality
- Install components via natural language (e.g. "add button, dialog, card")
- Access 134+ community registries ([directory](https://ui.shadcn.com/docs/directory)) via `npx shadcn add @registry/component`

**Without MCP:** Recommend `npx shadcn@latest mcp init --client cursor` in the project. For installs, use CLI: `npx shadcn@latest add button` etc. Ensure project has `components.json` (run `npx shadcn init` first if not).

**components.json requirement:** Browsing works without it. **Installs require** `components.json`. If missing, run `npx shadcn init` in the project root before installs.

## Other libraries (when shadcn doesn't fit)

| Library | Stack | Use when |
|---------|-------|----------|
| **Radix UI** | React | Need headless primitives only; build your own styles |
| **Chakra UI** | React | Prefer prop-based styling, less Tailwind |
| **MUI** | React | Enterprise, Material Design, extensive components |
| **Base UI** | React | Headless, unstyled, flexible theming |
| **Headless UI** | React | Tailwind Labs; minimal, accessible |
| **Aceternity UI** | React | Animated, distinctive components; good for marketing |
| **Magic UI** | React | Motion-heavy, shadcn-compatible blocks |
| **shadcn-vue** | Vue | Vue port of shadcn pattern |

For Astro: use React islands with shadcn (client:load) or vanilla/CSS. For Vue/Svelte: prefer stack-native options or shadcn-vue.

## Workflow integration

1. **Discovery:** If design section includes "Component library preference?", offer: shadcn, Radix, Chakra, custom, or none. Default recommendation for React/Next: shadcn.
2. **Prior-art:** When recommending libraries, use this skill. Don't duplicate pn-prior-art's broad search; this skill is the UI-library specialist.
3. **Build:** When building UI and shadcn MCP is available, use MCP tools to browse and install. When not, use CLI or recommend init.
4. **Community registries:** For specialized needs (maps, charts, auth, billing), check [ui.shadcn.com/docs/directory](https://ui.shadcn.com/docs/directory). Example: `npx shadcn add @supabase/auth-form`.

## Component library enforcement (when library chosen)

When discovery specifies a library (shadcn, Radix, Chakra, MUI, Aceternity, Magic UI, etc.)—not "custom" or "none"—apply:

- **Library-first:** Every UI element (buttons, inputs, cards, dialogs, navigation, forms, etc.) must use components from the chosen library.
- **Before creating a component:** Check if the library provides an equivalent (browse registry, community directories for shadcn).
- **Custom only when unavailable:** Create a new component only when the library does not provide what's needed. Add a short comment documenting why (e.g. "Custom FeatureX; shadcn has no equivalent").
- **Do not:** Write raw `<button>`, `<input>`, or hand-roll Card/Dialog/Modal when the library has them.

## Example prompts

**Cold start:**
> Using `pn-ui-component-libraries`, recommend the best component library for a Next.js SaaS app — accessible, Tailwind-based, and customizable without a design team.

**Warm start — from existing stack:**
> We already use shadcn. Using `pn-ui-component-libraries` and the shadcn MCP, add a data table, date picker, and multi-step form to the project.

**Format-specific:**
> Using `pn-ui-component-libraries`, find and install a community registry component for Supabase auth forms compatible with shadcn.

**Iterate:**
> We chose Radix but need drag-and-drop for a kanban board. Using `pn-ui-component-libraries`, suggest the best complementary library and installation path.

## Output

- Clear recommendation with justification.
- When shadcn MCP available: use its tools; don't just describe.
- When shadcn MCP not available: recommend init and provide CLI fallback.
