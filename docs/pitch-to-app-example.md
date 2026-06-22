---
title: "Pitch-to-app: full pnCore flow"
updated: 2026-04-22
---

# Pitch-to-app: full pnCore flow

End-to-end example: discovery (ask_question per section), prior art, phased plan, skeptic on the plan, design gates (wireframes, flows, design system), assets (SVGs and placeholders via pn-assets / pn-assets-manager), optional Supabase and Stripe. Gate on user confirmation at each step; stack comes from discovery, not assumptions.

## Prompt

```text
Build [YOUR PITCH]. Use the full dev workflow.

I want maximum involvement via questionnaire: use ask_question for every discovery section (Technical, Security, Design, Requirements, Scope). Do not infer—ask me explicitly. I answer each before you proceed. Gate on my confirmation after discovery, prior art, plan, and skeptic before specialists.

Skeptic in line: Run pn-skeptic-challenge on the plan. Present alternatives and tradeoffs. Do not run specialists until I accept the skeptic verdict.

Design aligned with me: When frontend/UI is in scope, Discovery includes expanded Design (3a–3g: structure, layout, sections, colors, typography, components, ambition). Ask me for purpose, tone, a11y level, component library, layout preferences. Produce wireframes, then user flows, then design system. Gate on my approval after each artifact—do not build until I confirm.

Requirements:
- Tech stack: Ask me in discovery (React, Next.js, Astro, or vanilla). Do not assume. Backend: Supabase (auth, db), Stripe. Component library: recommend and justify in Design section.
- Roadmap: Dev phases (scaffold+auth → core features → payments → polish) for autonomous development. Save to docs/plans/.
- Design: see "Design aligned with me" above.
- Assets: pn-assets (single entry for image or SVG); routes to pn-svg-creator or pn-image-creator; placeholder images when chosen.
- Backend: pn-backend-developer (Supabase); pn-payment-integration (Stripe).
- Testing: pn-testing-specialist after each phase; pn-reviewer and pn-security-audit at end.

Do not skip: discovery questionnaire (ask me), prior art, plan with phases, skeptic (gate on my acceptance), design (ask me, gate on my approval per artifact), specialist routing confirmation, verify acceptance, package delivery.

If you're unsure about a requirement, ask rather than assume.
```

## Usage

- **Plugin:** Run `/pn-new` or `/pn-build`; use the prompt above in chat.
- **MCP only:** Say the prompt in chat; the model uses `workflow_step("full_dev", ...)` when MCP is available.
- See [plugin reference](plugin-reference.md) and [MCP usage guide](mcp-usage-guide.md) for workflows and tools.
