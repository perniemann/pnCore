---
name: pn-deprecation-and-removal
description: Sunsetting APIs, features, and dead code — deprecation levels, migration windows, Hyrum's Law, zombie code removal. Use when removing or replacing user-visible behavior, public APIs, or long-lived flags; not the same as framework version upgrades alone.
---

# Deprecation and removal

## When to use

- Replacing a public API, SDK surface, REST route, or config key
- Removing a feature behind or beyond a feature flag
- Consolidating duplicate implementations
- Planning how a **new** system will be retired later (design-time deprecation path)

## When not to use (use instead)

- **Framework/package version upgrades** with no product sunset — **pn-migration-planning**
- Emergency rollback of a bad deploy — ops runbooks / **pn-ship-checklist**

## Principles

- **Code is a liability** — removal reduces maintenance and security surface when behavior is truly obsolete.
- **Hyrum's Law** — users depend on observable behavior, including bugs; migrations must be active, not only announcements.
- **Deprecation starts at design** — narrow surfaces, explicit contracts, and flags make later removal cheaper.

## Process

1. **Inventory consumers** — internal callers, external clients, docs, analytics events; search repo and (if applicable) partner docs.
2. **Classify deprecation**
   - **Advisory:** documented + telemetry; old path still works for a window.
   - **Compulsory:** hard deadline, breaking after date; migration tooling or codemods where possible.
3. **Publish path** — migration guide, dual-write/dual-read period if needed, feature flag stages.
4. **Measure** — know remaining usage before flipping removal; define success metrics.
5. **Remove** — delete code, tests, flags, and docs together; avoid zombie branches and half-dead toggles.
6. **Verify** — tests, integration, and (if external API) consumer communication or version policy check.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "We'll document it and users will migrate." | Without enforcement and tooling, Hyrum's Law wins. |
| "Leave the old API forever as alias." | Aliases accumulate debt; set an end date. |
| "We'll delete the flag later." | Zombie flags rot; delete in the same release train when safe. |
| "Nobody uses it." | Prove with search, logs, or dependency data. |

## Red flags — stop

- Breaking external contract without semver or migration note.
- Removing tests while leaving code paths "for compatibility" with no consumers documented.

## Verification

- Consumer count trend or explicit **zero** with evidence (search, package usage, logs).
- Changelog + ADR or doc update merged with the removal.
- CI green after dead code and flag cleanup.

## Guardrails

- Align with project versioning policy (URI versioning, SemVer, etc.) — see backend/philosophy skills as applicable.
- Legal/compliance retention may block hard delete — route to **pn-agent-governance** / policy owners.

## Integration

- **pn-migration-planning** — stack upgrades vs product/API sunsets (different documents; may overlap in big rewrites).
- **pn-github-vertical-slices** — carve removal into shippable slices.
- **pn-ship-checklist** — staged flag off and monitoring during sunset.

## Output

- Deprecation class, timeline, consumer inventory, migration steps, removal checklist, verification evidence.
