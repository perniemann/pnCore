---
name: pn-ci-dev-prod-split
description: "Scaffolds CI with dev/prod separation: deploy-dev (auto on push) and deploy-prod (manual only). Use when scaffolding CI or updating workflows; adapts to FTP, Vercel, Netlify, Cloudflare."
---

# CI dev/prod split

## When to use

- Scaffolding CI for a new project
- Adding deploy workflows to an existing repo
- User asks for "dev and prod" or "staging vs production" CI
- Fixing or refactoring workflows that merge dev/prod in one file

## Pattern

| Workflow | Trigger | Concurrency | Deploy target |
|----------|---------|-------------|---------------|
| deploy-dev | push to main (or develop), paths-ignore | cancel-in-progress: true | Dev path/env |
| deploy-prod | workflow_dispatch only | cancel-in-progress: false | Prod path/env |
| *-test (optional) | workflow_dispatch | — | Tests dev + prod connectivity |

Principles: Dev auto-deploys on push; prod is manual-only; separate env vars (e.g. PUBLIC_ENV=development vs production); separate paths/secrets (DEV_*, PROD_*).

## Instructions

1. **Separate workflows:** Create `deploy-dev.yml` and `deploy-prod.yml` (not one workflow with branch condition).
2. **Dev workflow:** Trigger on push to main (or develop). Use paths-ignore for non-code changes (e.g. README, .cursorrules). Build with `PUBLIC_ENV=development` or equivalent.
3. **Prod workflow:** Trigger on workflow_dispatch only. Never auto-deploy to prod. Build with `PUBLIC_ENV=production` or equivalent. Use `environment: production` in GitHub for optional approval gates.
4. **Concurrency:** Dev: `cancel-in-progress: true` (new push cancels in-flight deploy). Prod: `cancel-in-progress: false` (do not cancel prod deploy).
5. **Deploy target adapters:**
   - **FTP:** DEV_FTP_PATH vs PROD_FTP_PATH; separate .htaccess (dev: password protect; prod: security headers)
   - **Vercel:** Preview = dev; Production = prod; use env vars per environment
   - **Netlify:** Branch deploys = dev; Production = prod
   - **Cloudflare Pages:** Preview = dev; Production = prod
6. **Optional test workflow:** Manual workflow to verify deploy connectivity (e.g. ftp-test for FTP) for both dev and prod paths.
7. **Reference pn-ci:** For secrets (never in YAML), action pinning, caching. Keep workflows minimal.

## Output

- Concrete workflow YAML or concrete changes to existing workflows
- List of secrets/variables user must configure (DEV_*, PROD_*, etc.)
- If adapting from a merged workflow: split into deploy-dev and deploy-prod with distinct triggers and env
