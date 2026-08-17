# Aesthetics baseline (pnCore)

Canonical checklist for **distinctive, non-generic** user-facing UI. Use together with project-specific **`.pncore-design.md`** (from `pn-setup`): that file is the source of truth for **your** brand; this document is the **cross-project** floor so outputs do not collapse into template defaults.

**Resource:** `pn-core://reference/aesthetics-baseline.md`

**Deep implementation:** `get_skill("pn-frontend-design")`, `get_skill("pn-frontend-design-philosophy")`, surgical commands `pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-bolder`, `pn-delight`, `pn-quieter`, audits via `pn-frontend-audit`, exploration via `pn-design-variants`.

## Dimensions (cover all before ship)

| Dimension | Question | Primary skills / commands |
|-----------|----------|---------------------------|
| **Typography** | Is hierarchy obvious without color? Display + reading + utility distinct? | `pn-typeset`, `pn-typography` |
| **Color & theme** | Cohesive palette, CSS variables, dominant + accent (not timid 50/50)? Dark mode if required? | `pn-colorize`, `pn-color-system`, `pn-design-system` |
| **Layout & rhythm** | Asymmetry or clear spatial hierarchy? Avoid identical card grids and center-everything? | `pn-arrange`, `pn-grid-systems` |
| **Motion** | At least one orchestrated **Reveal** on load or first paint; roles tagged; `prefers-reduced-motion`? | `pn-animation`, `pn-delight`, `pn-quieter` |
| **Backgrounds & depth** | Atmosphere (gradient mesh, grain, pattern, layer) where the aesthetic calls for it—not flat void? | `pn-frontend-design` |
| **States & copy** | Loading, error, success, empty (with action), hover, focus—all designed, not browser default? | `pn-ux-patterns`, philosophy state rules |
| **Assets** | Logo, hero, icons match concept—not generic placeholders? | `pn-assets-manager` |
| **Diagrams** | Right type, sparse enough to read, brand tokens, `accTitle`/`accDescr` (Mermaid) or prefixed SVG title/desc (HTML), D-01–D-10 ship gate? | `pn-diagram`, `pn-diagram-design` |
| **Evidence** | For high-stakes UI: screenshot or run `pn-evidence-qa` before “done.” | `pn-evidence-qa` |

## Inspiration banks (pick one anchor, then diverge in execution)

Use **one** primary reference so the model commits; avoid vague “make it nice.”

- **IDE / tool themes:** Dracula, Nord, Solarized, Catppuccin, Gruvbox (commit to one mood: cool, warm, high-contrast).
- **Cultural / genre:** editorial print, brutalist web, solarpunk, art deco, mid-century modern, cyber-noir, soft pastel product, industrial utilitarian.
- **Era / medium:** 70s phototypesetting, 90s CD-ROM UI, early web, Swiss poster, film title sequence (name the film or designer).
- **House anchor:** If you maintain a primary site or portfolio, cite it in `.pncore-design.md` under **Reference feel** or **House philosophy** so every project inherits the same bar unless the spec explicitly diverges.

## Named theme presets (optional shortcuts)

Lock **one** paragraph into the user message or plan when you want a fast aesthetic direction (adapt tokens and fonts to the stack).

**Solarpunk:** Warm greens, golds, earth tones; organic shapes + crisp UI chrome; nature textures; optimistic, bright; retro-futuristic display type.

**Editorial luxe:** High contrast, generous whitespace, strong serif display + neutral sans body; restrained motion; photography-led hero.

**Technical studio:** Monospace or hybrid sans; grid-visible layout; sharp accents on near-neutral base; motion = Orient/Confirm, minimal Delight.

**Playful product:** Rounded geometry, saturated accents, bouncy **Confirm** micro-interactions (still respect reduced-motion); illustration-forward.

## Copy-paste system block (CLAUDE.md / user rules)

Append when you want models to load this stance **without** opening a skill first:

```xml
<frontend_aesthetics>
You tend toward generic, on-distribution outputs. In frontend design that reads as "AI slop." Avoid it: ship creative, context-specific interfaces that match the project's .pncore-design.md when present.

Typography: Distinctive, characterful fonts; strong display vs body contrast. Do not default to Inter, Roboto, Arial, Geist, or system-ui stacks unless the project spec explicitly requires them.

Color and theme: One cohesive system via CSS variables; dominant base with sharp accents; tinted neutrals where appropriate. Avoid clichéd purple-blue gradients on white and cyan-on-dark template accents unless on-brand.

Motion: Prefer one well-orchestrated load sequence (staggered reveal with clear hierarchy) over many unrelated micro-motions. Tag each animation with a role: Reveal, Orient, Confirm, or Delight. Respect prefers-reduced-motion.

Backgrounds: Add depth when the aesthetic allows—gradients, grain, geometric patterns, layered surfaces—not flat default fills everywhere.

Anti-slop: No identical card grids with no variation, no glassmorphism-everywhere, no gradient text on every heading, no center-everything layouts without intent.

Project truth: When .pncore-design.md exists, treat it as authoritative for audience, personality, ambition, reference feel, and constraints. When it conflicts with generic habits, follow the file.
</frontend_aesthetics>
```

## Default pairings vs convergence

Frameworks and plans may suggest **example** display/body pairings to beat template fonts. Those are **one option among many**, not a house font for every repo. If the last project used the same pairing, **choose a different** distinctive pair that still matches `.pncore-design.md`. Consult `reference/typography.md` (via `pn-typography`) for alternatives.

## Workflow map

| Situation | Use |
|-----------|-----|
| Full UI build with gates | `get_command("pn-design")` or `workflow_step("design", …)` |
| Marketing UI intent (read + dials) | `pn-core://reference/design-intent.md` (required in `pn-design` plan) |
| Marketing pre-ship PASS/FAIL | `get_command("pn-preflight")` + `pn-core://reference/marketing-ship-gate.md` |
| Studio portfolio / reel / lab | `get_command("pn-design-dna")` + `pn-core://reference/embedded-studio-dna.md` |
| Small visual change | `get_command("pn-visual-tweak")` or `workflow_step("visual_tweak", …)` |
| Post-build quality pass | `get_command("pn-frontend-audit")` |
| Explore divergent directions | `get_command("pn-design-variants")` |
| Amplify timid UI | `get_command("pn-bolder")` |
| Static HTML preview (save + browser) | `get_skill("pn-html-preview")` |
| Architecture / flowchart / sequence / state / loop / quadrant / layers / process / data-flow / org-chart | `get_command("pn-diagram")` + `pn-core://reference/diagram-baseline.md` (D-table + skeptic / render-verify per track; import-redraw with fidelity ledger, no extractors) |
