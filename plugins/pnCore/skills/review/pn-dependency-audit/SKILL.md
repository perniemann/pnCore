---
name: pn-dependency-audit
description: Runs stack-appropriate dependency and CVE audits; interprets severity and gates on critical/high. Use before release, after adding dependencies, or as part of a security or review pass.
---

# Dependency audit

## When to use

- Auditing npm/pip/cargo dependencies for outdated packages, security vulnerabilities, or license risks.
- Before a major release or dependency upgrade cycle.
- When `npm audit` or similar reports vulnerabilities that need triaging.
- Reviewing whether to keep, upgrade, or replace heavy or abandoned dependencies.

## Steps

1. **Detect stack:** Identify package manager and lockfile (npm/pnpm/yarn `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`; Python `requirements.txt`/`pyproject.toml`; etc.).
2. **Run audit:** Execute the appropriate command:
   - **npm:** `npm audit` (or `npm audit --json` for machine-readable).
   - **pnpm:** `pnpm audit`.
   - **yarn:** `yarn audit`.
   - **Python:** `pip audit` if available, or use safety / similar; otherwise note "no built-in audit" and suggest manual check.
3. **Interpret severity:** Count critical, high, moderate, low. Treat critical and high as blocking unless explicitly accepted.
4. **Fix or document:** Run `npm audit fix` (or equivalent) where safe; for breaking or unacceptable fixes, list remaining issues and document exceptions (e.g. "accepted: CVE-XXXX, reason").
5. **Gate:** Do not claim "audit clean" or "ready for release" if any critical or high vulnerabilities remain unaddressed or undocumented.

## Output

- **Short report:** Counts by severity (e.g. "0 critical, 0 high, 2 moderate, 1 low"); "Audit clean" or "N critical/high remain: [list or path to audit output]."
- **If not clean:** List of critical/high with package name and CVE/id; whether fix was applied or exception documented.

## Guardrails

- Do not skip the audit step when the skill is invoked.
- For monorepos or multiple lockfiles, run audit per workspace or aggregate and report per workspace.
- Reference pn-security-audit for full security review; use this skill for dependency/CVE focus.

## Guardrails

- **pn-security-audit** — Full security review; includes dependency scanning. Use pn-dependency-audit for a dedicated, repeatable dependency/CVE pass.
- **pn-backend-philosophy** — Backend rulebook requires regular dependency scanning; use this skill to satisfy that requirement.
