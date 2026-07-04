---
name: pn-react-next-perf
description: "Optimizes React/Next.js data loading and rendering; avoids waterfalls, unnecessary client JS, and missing loading/error boundaries. Use when building or reviewing React or Next.js apps."
---

# React / Next.js performance

## When to use

- Adding data fetching or new pages in React or Next.js
- Reviewing for performance (slow page, large bundle, layout shift)
- Choosing between server and client rendering

## Critical checks

1. **INP (Interaction to Next Paint):** Keep INP ≤200ms. Avoid long tasks that block the main thread (e.g. large synchronous work, excessive re-renders). Defer non-critical JS; use `requestIdleCallback` or similar for background work. Per **best practices** (`pn-core://reference/best-practices.md`) — Core Web Vitals.

2. **No request waterfalls:** Avoid sequential client fetches that block render. Prefer server-side data in one place (e.g. Next.js server component or single load function) or parallel fetches. Do not fetch in parent then pass to child if the child could fetch in parallel or on the server.
3. **Loading and error boundaries:** For async routes or components, provide `loading.tsx` / `loading.jsx` (or Suspense) and `error.tsx` / `error.boundary` so users see skeletons or errors instead of blank or crashed UI.
4. **Bundle size:** Prefer server components (Next App Router) or code-splitting for heavy UI. Use dynamic import for below-fold or conditional components. Avoid pulling large libs into client bundle for one feature.
5. **Re-renders:** For client components, avoid passing new object/array literals as props every render (useMemo/useCallback or stable refs where it matters). Keep client components small and focused.

## Next-specific

- Use server components by default; add "use client" only where needed (interactivity, hooks, browser APIs).
- Colocate `loading.tsx` and `error.tsx` with async pages/layouts.
- After Server Action mutations that affect displayed data, call `revalidatePath()` or `revalidateTag()` so the UI updates.

## Output

- Specific changes (file, pattern) to remove waterfalls or add boundaries.
- No generic advice; point to the exact place and suggest the minimal fix.

## Guardrails

- **pn-frontend-scaffolding** — Use when adding new pages or components; use this skill when optimizing data loading and boundaries for existing or new routes.
- **pn-frontend-design-philosophy** — Performance budget and loading/error boundaries align with philosophy rules.
