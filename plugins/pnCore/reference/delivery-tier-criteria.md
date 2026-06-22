# Delivery Tier Criteria

MVP vs full criteria for verification. Used by pn-deliver (verify phase) and pn-writing-plans to ensure delivered output matches the discovery spec's delivery tier.

## Overview

| Dimension | MVP | Full |
|-----------|-----|------|
| Core functionality | Must-have flows only | All planned features |
| Assets (UI projects) | Full taxonomy (logo, hero, feature icons, subject icons, badges, empty-states) — **same for both** | Full taxonomy (logo, hero, feature icons, subject icons, badges, empty-states) |
| Tests | Critical paths optional (waiver allowed) | At least one relevant test per critical path; no waiver without explicit note |
| Polish | Functional; acceptable defaults | Production-ready; no placeholder copy in user-facing areas |
| A11y/Perf | Baseline | Best-practices checklist |
| Docs | README + minimal | README, CHANGELOG, API docs synced |

## MVP

- **Core functionality:** Implement must-have flows only. Defer nonessential features.
- **Assets:** Full taxonomy per asset taxonomy: logo, hero, feature icons, subject icons, badge icons, empty-state illustrations. Run `validate-assets.mjs`; exit 0 required. Same as Full — logo, hero, and assets are created regardless of tier. **Minimum:** pn-assets-manager (autonomous mode) must produce at least logo and hero placeholder files; fallback to minimal SVGs when image generation unavailable. ASSET_PHASE_FAILED = do not ship.
- **Tests:** Critical paths (auth, web3, DB boundary, new endpoint, new user flow) may have waiver with explicit note in builder output.
- **Polish:** Functional. Acceptable defaults; placeholder copy allowed where not critical.
- **A11y/Perf:** Baseline compliance (keyboard nav, alt text). Performance acceptable for demo.
- **Docs:** README with setup and run; minimal.

## Full

- **Core functionality:** All planned features from discovery spec.
- **Assets:** Full taxonomy per asset taxonomy: logo, hero, feature icons, subject icons, badge icons, empty-state illustrations. Run `validate-assets.mjs`; exit 0 required.
- **Tests:** At least one relevant test per critical path. No silent waiver; explicit note only if truly N/A.
- **Polish:** Production-ready. No placeholder copy in user-facing areas. pn-docs-sync run.
- **A11y/Perf:** Best-practices checklist (`pn-core://reference/best-practices.md`) applied.
- **Docs:** README, CHANGELOG, API docs synced with changes (pn-docs-sync).

## Backward compatibility

- Discovery specs without `Delivery tier` field: treat as **MVP** (permissive).
- pn-deliver (verify phase): if discovery has no tier, skip tier check; use current behavior.
