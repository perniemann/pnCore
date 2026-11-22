# Security Policy

## Supported versions

Report issues against the `main` branch and the latest published plugin/MCP version.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

Do **not** open a public issue for security reports.

If private reporting is unavailable, email **io@perniemann.com** with a description, impact, and reproduction notes. You will get an acknowledgement when the report is received, and a follow-up when a fix is scheduled or declined.

## Trust boundary

The engine guards its MCP surface. It does not guard the filesystem against a model that has shell access.

- **Covered.** No pn-core tool writes a line that a trail reader accepts as a verify attestation or a human-gate ticket: state saves must be `.json` files, appends have fixed shapes, and every path is contained in the workspace after resolving symlinks. Content ids (`get_rule`, `get_agent`) are flat slugs and never reach the filesystem as paths. A failed gate (`false`) never advances, and a `no_go` verdict advances only on a ticket that `approval_checkpoint` issued for that run and step.
- **Verify jail.** Under bubblewrap, a verify command runs without network, in its own PID, IPC and UTS namespaces and session, with `.git` and `.pncore` read-only. It can change the worktree it tests, but not its git hooks or the engine's trails. Package runners (`npm exec`, `npm x`, `pnpm dlx`, `yarn dlx`, `bun x`) are refused.
- **Not covered.** A model with shell write access to `.pncore/` can append a forged trail line, and one that can read the MCP config can read `PNCORE_APPROVAL_TOKEN`. Keep the token out of agent-readable config when a human gate has to hold. `PNCORE_VERIFY_SANDBOX=restricted` runs without a jail, so set it only on a machine where that is acceptable.
