---
title: "ADR-0022: Checkpoint commit protocol and verify failure classes"
updated: 2026-10-22
---

# ADR-0022: Checkpoint commit protocol and verify failure classes

## Status

Accepted

## Context

A full_dev run reported three ways resume state went wrong without anything failing loudly:

1. **State and handoff drift apart.** After each step the agent made two independent calls, `workflow_state_save` and `workflow_handoff_append`. Either one could be skipped, sent with a different `run_id`, or interrupted, and nothing tied the state file to the handoff line that described it. A second agent (subagent, retry, parallel tab) could also overwrite the state between a load and a save.
2. **The wrong file was read.** `project_context` read a hardcoded default state path while saves honoured `PNCORE_STATE_PATH` and a `path` argument (fixed in 0.19.10 with one resolver plus `active_run` / `consistency`; this ADR builds on it).
3. **Red runs were indistinguishable.** A missing fixture, an unset env var, or a missing binary looked the same as a real test failure: `exitCode !== 0`. Checking prerequisites in a separate tool call before `workflow_verify` would leave a time-of-check/time-of-use gap and add a tool.

The skeptic review of the first plan rejected two new tools (`checkpoint_commit`, `workflow_preflight`) on catalog cost and TOCTOU grounds and asked for an explicit lock and a Windows-safe rename.

## Decision

1. **Commit mode on the existing tool.** `workflow_state_save` with `run_id`, `step`, and `summary` (all three, or none) runs one protocol under a sibling lockfile `<state>.lock` (`open(wx)`, holding a random token; a lock older than 30 s is stale; the writer that creates `<state>.lock.break` (`open(wx)`) deletes it, and only if it is still the file judged stale by inode and mtime, so two writers cannot both take over; release deletes the lock only when the token is still the holder's):
   1. Read the prior revision from the state envelope `_pncore: { revision, run_id, step, savedAt, stateHash }` (absent = revision 0). A file that is not a JSON object returns `PARSE_ERROR` unless `expected_revision: 0` acknowledges replacing it (`history: true` keeps its raw bytes).
   2. `expected_revision`, when given, must equal it, or the call returns `REVISION_CONFLICT` and writes nothing.
   3. Run binding: a file holding another run (envelope or legacy `run_id`) returns `RUN_MISMATCH` unless `overwrite_run: true` is passed. `expected_revision` alone does not acknowledge it, because the engine asks for `expected_revision` on every save. A state body whose `run_id` disagrees with `run_id` returns `RUN_MISMATCH` too.
   4. Append the handoff line `{ ts, run_id, step, summary, revision: N+1, stateHash }`.
   5. Optional `history: true` appends the prior state to `<state>.history.jsonl`.
   6. Atomic state write (`writeFileAtomic`: unique temp file, fsync, rename; transient win32 `EPERM` / `EBUSY` / `EACCES` retried with bounded backoff). **The rename is the only commit point.**
   7. Read back and compare revision and hash. Return `{ revision, previous_revision, stateHash, handoffHash, readBack }`.

   Plain mode (state only) takes the same lock and drops any caller-supplied `_pncore`, so a stale revision cannot be written back.
2. **Readers treat uncommitted lines as absent.** A handoff line whose `revision` is above the state file's revision for the same run came from an interrupted commit (step 4 ran, step 6 did not). `project_context` ignores it for `last_completed_step` and reports `handoff_revision_ahead` (warn). A state file without an envelope is reported as `state_unversioned` (info only; plain saves stay legal).
3. **The envelope never reaches routing.** `workflow_state_load` returns `{ state, meta, path }` with `_pncore` stripped from `state`; `workflow_step` strips it as well, so passing a raw file through is harmless.
4. **The engine asks for one call.** `HANDOFF_AFTER_STEP` points at commit mode (with `expected_revision` and the `REVISION_CONFLICT` retry) and keeps `workflow_handoff_append` only as the fallback when commit mode is unavailable.
5. **Verify failure classes, diagnostic only.** `GateReport.failureClass` is one of:
   - `none`
   - `missing_input`: exit 126/127, `ENOENT` or `EACCES` on spawn, or a failed preflight
   - `infrastructure`: timeout, signal, or another spawn error
   - `behavioral`: the command ran and exited non-zero

   Gates still pass on exit 0 alone. No class refunds an attempt or relaxes a gate, so classification cannot be gamed into a pass. Spawn errors now produce a receipt instead of an `IO_ERROR`.
6. **In-call preflight, no new tool.** `workflow_verify` accepts `inputs: [{ path, sha256?, access? }]`, `env_required: [names]`, and `owner`. Inputs and environment variables are checked in the same call immediately before spawn, together with the command itself (on `PATH` or by path). A failed check appends a `kind: "preflight"` run event and returns `launched: false` without spawning; a passing preflight links to the verify receipt via `preflightId`. `preflight_only: true` runs just the checks and works with `disposeVerify` off, since it executes nothing. `workflow_run_query` gains `kinds: ["preflight"]`. `owner` is recorded on the event and receipt, not checked. The child sees only a fixed minimal environment plus the `env_required` names the operator lists in `PNCORE_VERIFY_PASS_ENV`; `PNCORE_*` names (the approval token among them) never qualify, and a required name outside the list fails preflight instead of being dropped silently. Values go through the spawn environment, never argv, and are redacted from `stdoutTail` / `stderrTail` before the receipt is returned or recorded.

Tool count stays at 29.

## Consequences

- **Positive:**
  - One call per step binds state, run, step, and handoff. A skipped or interrupted handoff is detectable rather than silent.
  - Concurrent writers fail fast with `LOCKED` or `REVISION_CONFLICT` instead of losing an update.
  - An interrupted save leaves the prior state authoritative.
  - A red verify says whether to fix code, fix the environment, or fetch an input. The preflight cannot drift from the spawn because they are the same call.
- **Negative / open:**
  - The lock is advisory and local. Two machines on a network share, or a writer that bypasses the tool, are not serialized. A lock is held for one synchronous save, so the stale takeover only matters after a crash.
  - The 30 s stale timeout means a crashed writer blocks saves for up to 30 s.
  - Plain-mode saves drop the envelope, so mixing modes resets the revision to 0. Callers that want CAS must stay in commit mode.
  - A forwarded value is readable by the verify command, which the agent can change (free-form argv or an edited `test` script). Redaction covers verbatim echoes of values of four or more characters, not encoded ones; list only test-scoped values in `PNCORE_VERIFY_PASS_ENV`.
  - A writer that crashes holding `<state>.lock.break` blocks takeovers until the break file is 30 s old too; a lock holder that outlives the stale timeout can still lose its lock.
  - The fsync covers the file, not the directory entry. On power loss a POSIX filesystem can still lose the rename, though never mix old and new content.

## References

- [ADR-0020: Step spans on the run log](0020-step-spans.md): run log and timeline
- [ADR-0021: Context budget packing, narrow](0021-context-budget.md): `active_run` / `consistency` are never dropped
- `pn-core://reference/workflow-state-schema.md` § Resume checklist
- `packages/pn-core-mcp/src/checkpoint.ts`, `src/atomic-write.ts`, `src/state-path.ts`, `src/verify-preflight.ts`, `src/verify-attest.ts` (`classifyVerify`), `src/project-context.ts` (`computeActiveRun`)
