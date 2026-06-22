# Monorepo — Code Patterns Reference

Full config files, package.json examples, and CI setup. For tool selection, structure, and pitfalls, see [SKILL.md](SKILL.md).

---

## Turborepo + pnpm workspace setup

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "type-check": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

```bash
npx turbo build                          # build all, respecting dependency graph
npx turbo build --filter=...[HEAD^1]     # build only affected packages
npx turbo dev                            # run dev servers in parallel
```

---

## Shared TypeScript configuration

```json
// packages/config-ts/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@my-org/config-ts/base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

---

## Publishable package

```json
// packages/ui/package.json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "private": false,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org/" },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch"
  }
}
```

---

## Internal (workspace-only) package

```json
// packages/utils/package.json
{
  "name": "@my-org/utils",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

```json
// apps/web/package.json (consuming app)
{ "dependencies": { "@my-org/utils": "workspace:*" } }
```

---

## Changesets

```bash
npx changeset add       # add changeset for this PR
npx changeset version   # bump versions from collected changesets
npx changeset publish   # publish to npm
```

```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

---

## Remote caching

```bash
# Vercel (free for personal)
npx turbo login
npx turbo link

# Self-hosted: set TURBO_API, TURBO_TOKEN, TURBO_TEAM env vars
```

---

## CI with monorepo

```yaml
# .github/workflows/ci.yml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build affected packages
  run: pnpm turbo build --filter=...[HEAD^1] --no-daemon

- name: Test affected packages
  run: pnpm turbo test --filter=...[HEAD^1]
```

Use `--filter=...[HEAD^1]` in PRs; run full pipeline without filter on `main`.
