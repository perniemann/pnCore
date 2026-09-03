# Consumer-project gating

What pnCore does — and does not — lock in a **downstream** repo that *uses* the MCP or plugin. This is not the land-on-main path for the pnCore repository itself (that is `docs/commits.md`).

## Split

```
user / agent ──► workflow_step ──► next instruction (or error)
                      │
                      ├── default: human gates = “stop and ask”
                      ├── involved / strictSkepticGates: need workflow_confirm records
                      └── PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS: need approval_checkpoint ticket

git commit / gh pr create / gh pr merge  ──► not in this graph
```

| Layer | What it gates | Installed by setup? |
|-------|----------------|---------------------|
| `workflow_step` + related tools | Chat workflow progress | Yes — MCP config only |
| Cursor rule `pn-no-cursor-commit-trailers` | Agent-proposed commit text | Yes, when the project uses git |
| `.githooks` + `core.hooksPath` | Trailer strip on local commit | Yes when git and `hooksPath` is unset or already `.githooks`. If another manager is set (Husky, Lefthook), write files and compose — do not overwrite |
| Trailer-only Actions workflow | PR/push commit messages | Optional — ask first |
| `/pn-deliver` `do_not_ship` | Chat ship verdict | Command only |
| GitHub branch protection / required checks | Merge button | **Never** — adopter repo policy |
| pnCore `pn-gates` / version+CHANGELOG CI | This repo’s release path | **Never** copied to consumers |

An agent with a shell can still commit, open a PR, or merge. Treat chat gates as process, not a cryptographic lock, unless hard HITL env is set (still only `workflow_step`).

## Setup (git projects)

`/pn-setup` Section A and `/pn-new` project setup:

1. Write `.cursor/rules/pn-no-cursor-commit-trailers.mdc` (`alwaysApply: true`) from `get_rule("pn-no-cursor-commit-trailers")`.
2. Copy templates from plugin `docs/templates/consumer-gating/` (or `.cursor/docs/templates/consumer-gating/` after `install-to-project`) into **`.githooks/`**:
   - `prepare-commit-msg`
   - `strip-commit-trailers.mjs`
   - `check-commit-no-ide-trailers.mjs` (needed if CI is installed)
3. Check `git config --get core.hooksPath` (local or global). If unset or already `.githooks`, run `git config core.hooksPath .githooks`. If another path is set, **do not overwrite**. Leave the files in `.githooks/` and add this line to the existing `prepare-commit-msg` hook:
   `node .githooks/strip-commit-trailers.mjs "$1"`
   Ask before `--replace-hooks-path` (replaces the current hook manager).
4. Offer CI: copy `no-ide-trailers.yml` to `.github/workflows/no-ide-trailers.yml`. Do not add it without a yes.

From a pnCore checkout you can also run:

```bash
node scripts/install-consumer-gating.mjs [targetDir] [--ci]
```

The installer skips `core.hooksPath` when another manager is already configured. Pass `--replace-hooks-path` only after a yes.

## Hard HITL (chat only)

To make human `workflow_step` gates fail-closed (still not the Merge button):

- Set `PNCORE_APPROVAL_TOKEN` on the MCP server env
- Set `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` to the workflow types that must present a ticket
- Use `intent: "involved"` or `PNCORE_FEATURES.strictSkepticGates` when you want `workflow_confirm` records

See the MCP README hard-approval section.

## Honor-system before ship

`pn-verification-before-completion`, `pn-build-gate` maker≠checker, `/pn-review` then `/pn-deliver`, `pn-docs-sync`. User skip of discovery/skeptic/review is an explicit opt-out (`pn-core://reference/conventions.md`).

## Non-goals

- Installing GitHub rulesets or required-status branch protection
- Copying automerge, `pn-review` CI, or version/CHANGELOG policy into adopters
- Blocking `git` from the MCP server
