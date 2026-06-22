Decision logic for skeptic intensity and gating.

Intensity selection:
- If risk_level in {high, critical} OR domain in {web3, devops, auth, db_migration, ue_mass_edit} -> strict
- Else if cross-layer OR touched_files_count > 5 -> standard
- Else -> light

Gating:
- severity 4 -> block
- severity 3 -> route to the fix-and-re-run loop (see `pn-review-optimize-loop`; escalate to `pn-loop` for fix-until-verification-passes)
- severity 2 -> fix recommended; loop if risk >= medium
- severity 0-1 -> proceed

---

## Review family (when to use which)

| Id | Type | When to use |
|----|------|-------------|
| **pn-reviewer** | Agent | Run a full review+optimize loop (quality gates, deslop, perf/debug where relevant); fix and re-run once if issues found. Use for "review this" or as the final step in orchestrator. |
| **pn-review-optimize-loop** | Skill | The procedure the pn-reviewer agent runs: review phase (e.g. pn-review-plugin-submission, pn-config-review, pn-deslop, pn-reality-check) then optimize (e.g. pn-react-next-perf, pn-systematic-debugging); then pn-verification-before-completion. |
| **pn-reality-check** | Skill | Evidence-based certification; default NEEDS_WORK; spec vs. impl cross-check; honest quality assessment. Part of review phase. |
| **pn-evidence-qa** | Skill | Screenshot-based QA and visual proof for UI deliverables. Optional before reality check when UI is primary. |
| **pn-review** | Command | Invoke the review+optimize loop once (same as running pn-reviewer for one pass). Use for ad-hoc "run a review pass" without starting the full agent. |
| **pn-review-plugin-submission** | Skill | Plugin marketplace readiness audit only: manifests, metadata, discovery paths. Use when validating a Cursor plugin before submission. |

---

## Intent → workflow_step (ad-hoc commands)

When the user runs a **command** or **agent** instead of `workflow_step` from step 0, advance state with `workflow_step` after gates when MCP is available:

| Intent | `workflowType` | Step | Required state keys (after gate) |
|--------|----------------|------|----------------------------------|
| Quick visual change after skeptic gate | `visual_tweak` | 2 | `plan`, `planConfirmed` |
| Plan-phase skeptic on existing plan | `full_dev` | 3 | `plan`, `skepticPassed`, `priorArt` |
| Post-build skeptic on UI | `design` | 5 | `skepticOutputPassed`, `skepticOutputVerdict` |
| Game mechanic plan skeptic | `game_feature` | 2 | `plan`, `skepticPassed` |
| Generative media plan skeptic | `media_director` | 4 | `shotPlan`, `pipelineSpec`, `skepticPassed` |

Use `list_workflow_types` for step counts. Pass `run_id` on every call after the first.

**Prompts vs tools:** `pn-skeptic`, `pn-build`, `pn-design`, and other agents/commands are **MCP prompts** (`prompts/get`), not `CallMcpTool` targets. Load with `get_agent` / `get_command` or `prompts/get`.
