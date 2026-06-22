---
name: pn-audit-performance-fe
description: Surgical frontend performance audit — Core Web Vitals, bundle size, image optimization, render-blocking resources, and page-type budgets. Standalone or chained by pn-frontend-audit.
slash: false
---

# pn-audit-performance-fe

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-frontend-audit` umbrella, or directly via `get_command("pn-audit-performance-fe")`.

Focused frontend performance pass: audit Core Web Vitals compliance, bundle composition, image strategy, render-blocking resources, and page-type budgets. No backend performance (use `pn-audit-performance`) — frontend only.

## Flow

### 1. Context

Check `.pncore-stack.md` for framework (Next.js / Vite / Remix / etc.). Ask if scope unclear: "Which pages to audit? (landing / app shell / all routes)"

### 2. Audit

Load `get_skill("pn-frontend-design-philosophy")` for the performance budget framework (Phase 6).

**Core Web Vitals targets:**
- LCP < 2.5s (largest contentful paint)
- CLS < 0.1 (cumulative layout shift — reserved image dimensions?)
- INP < 200ms (interaction to next paint)

**Bundle:**
- Total JS budget per page type:
  - Landing/marketing: ≤ 150 KB compressed JS
  - App shell: ≤ 400 KB
  - Feature route: ≤ 250 KB
- Code-split by route? Dynamic `import()` for heavy components?
- Tree-shaking effective (no full library imports, e.g. `import _ from 'lodash'`)?

**Images:**
- Modern formats (WebP / AVIF) in use?
- `<img loading="lazy">` for below-fold?
- `width` and `height` attributes set (prevents CLS)?
- Hero images served at correct resolution (no 4K images for 400px containers)?

**Render-blocking:**
- No synchronous `<script>` in `<head>` without `defer` / `async`?
- Critical CSS inlined or preloaded?
- Fonts preloaded with `<link rel="preload">`?

**Caching:**
- Static assets have content-hash in filename (long `Cache-Control`)?
- API responses cached appropriately (stale-while-revalidate)?

Output: numbered issues table (location | issue | impact | suggested fix). Save to `docs/audits/`.

**Gate:** Present issues for triage. Apply fixes after confirmation.

### 3. Fix

Apply in impact order: images → render-blocking → bundle splitting → caching.

### 4. Summary

Table: issues found → issues fixed, estimated improvement per fix.

## Skills to use

- **pn-frontend-design-philosophy** — Phase 6 scoring (Performance + Resilience Audit), page-type budget targets
