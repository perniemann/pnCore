# Workflow state schema

Canonical schema for the state object passed to `workflow_step`. Clients may persist this (e.g. to `.pncore/workflow-state.json`) to resume after disconnect. See RUNBOOK for when to use workflow_step vs get_command.

## Correlation: `run_id`

- **`run_id`** (or legacy **`pncoreRunId`**): UUID string. On the first `workflow_step` call per run, if omitted, the server generates one and returns **`run_id`** on the JSON response. **Echo the same value** on every later `workflow_step`, `report_usage`, `gate_log_append`, and on `approval_checkpoint` when tying tickets to the run.
- **`.pncore/workflow-runs.jsonl`** lines include **`runId`** when run logging is enabled.

## Design workflow (workflowType: "design")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | discoverySpec |
| 1 | discoverySpec | plan, skepticPassed, skepticVerdict |
| 2 | plan, skepticPassed, skepticVerdict | assetsComplete |
| 3 | plan, skepticPassed, skepticVerdict, assetsComplete | buildComplete |
| 4 | buildComplete | skepticOutputPassed, skepticOutputVerdict |
| 5 | skepticOutputPassed, skepticOutputVerdict | (summary; no new keys) |

**State shape (design):** `{ request?, discoverySpec?, plan?, skepticPassed?, skepticVerdict?, assetsComplete?, buildComplete?, skepticOutputPassed?, skepticOutputVerdict?, iterationCount?, iterationCapApproved? }`

- **iterationCount:** `number` — incremented each time step 4 returns `nextStep: 3` (skeptic-on-output failed, loop back to build). Tracks the number of unsuccessful skeptic-on-output cycles. Align with the "3 failed attempts rule" in `pn-skeptic-challenge`: 2 unsuccessful skeptic-output cycles ≈ 3 build attempts (initial + first retry + second retry after approval).
- **iterationCapApproved:** `true` — set after a successful `approval_checkpoint` call when `iterationCount >= 2`. Pass this alongside `pncoreHumanGateTicket` to unblock further iteration. Each additional cycle requires a new approval checkpoint.

---

## Full-dev workflow (workflowType: "full_dev")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | discoverySpec |
| 1 | discoverySpec | priorArt |
| 2 | priorArt | plan, skepticPassed, planArtifactPath, planSummary |
| 3 | plan, skepticPassed | specialistList, routeConfirmed (same step may be invoked twice for phased parallel; see task contract) |
| 4 | specialistList, routeConfirmed | specialistsComplete **or** taskResults (when parallel) |
| 5 | specialistsComplete or taskResults (+ **`mergeComplete: true`** when step 5 returned merge phase) | reviewComplete, skepticOutputPassed |
| 6 | reviewComplete, skepticOutputPassed | (summary; no new keys) |

To enter step 5, state must contain either `specialistsComplete === true` or `taskResults` with an entry for every id in `specialistList`. When **`workflow_step` returns `workflowPhase: "merge"`** at step 5, complete merge work, then call step 5 again with **`mergeComplete: true`** and the same `taskResults` / `specialistList` / `run_id`.

**State shape (full_dev):** `{ run_id?, request?, intent?, discoverySpec?, includeGenerativeMedia?, priorArt?, plan?, planArtifactPath?, planSummary?, skepticPassed?, createGithubIssues?, githubVerticalSlicesComplete?, githubIssuesSkipped?, specialistList?, routeConfirmed?, specialistSequentialComplete?, taskResults?, mergeComplete?, specialistsComplete?, reviewComplete?, skepticOutputPassed?, rollingSummary? }`

- **includeGenerativeMedia:** `boolean` — captured at step 0 from the pinned discovery question ("Does this run involve generative media beyond standard UI placeholders — campaigns, film, ComfyUI/T2V pipelines?"). When `true`, step 3 includes `pn-generative-media-director` in `specialistList` and step 4 MUST hand its work off to `workflow_step("media_director", 0, {})` rather than load the agent ad-hoc. No prompt-sniffing — explicit flag only.

- **intent:** `"full_auto" | "design_focused" | "involved"` — from pn-new. When `"involved"`, discovery and prior-art steps enforce strict human gates (ask each section, gate on confirmation). Pass through state when advancing steps.
- **specialistList:** string[] — agent ids in order (e.g. `["pn-frontend-developer","pn-backend-developer"]`).
- **specialistSequentialComplete:** boolean — set `true` after Phase A when step 4 returned phased instructions (group-0 specialists first); must accompany `taskResults` with a non-empty summary for every Phase A specialist before Phase B is returned.
- **taskResults:** Record<string, string> — when step 4 returns `parallel: true` (single-shot or Phase B), required for step 5 with one entry per id in `specialistList`; value = short summary of what that specialist did. During phased flow, populate Phase A ids first, then merge Phase B ids.
- **planArtifactPath:** string — path to full plan file under `docs/plans/` (set at step 2 output). **planSummary:** executive summary for warm state. When feature **`strictPlanSummary`** is enabled (`pn-core://config/features.json` or `PNCORE_FEATURES`), step 3 requires both.
- **mergeComplete:** boolean — set `true` after the merge sub-phase when step 5 returned `workflowPhase: "merge"`.
- **rollingSummary:** optional short string the client may keep in saved state; MCP canonical handoff is **`workflow_handoff_append`** / **`workflow_handoff_read`**.

### Optional GitHub Issues phase (full_dev step 3)

When **`createGithubIssues: true`** is passed into step 3 state (typically alongside outputs from step 2), the first **`workflow_step` response for step 3** may return **`workflowPhase: "github_issues"`** with instructions to run **pn-github-vertical-slices** (official **GitHub MCP** server required). Complete Issue creation or skip, then call **`workflow_step(step=3)` again** with **`githubVerticalSlicesComplete: true`** and the same prior keys (preserve **`intent`** when set).

| Key | Type | Role |
|-----|------|------|
| **createGithubIssues** | boolean | Opt-in from step 2 handoff; triggers gated phase before specialist routing. |
| **githubVerticalSlicesComplete** | boolean | Set after Issues exist or phase skipped — unlocks normal step 3 (specialist selection). |
| **githubIssuesSkipped** | boolean (optional) | Set when MCP unavailable or user declines Issue creation; still set **githubVerticalSlicesComplete** to proceed. |

---

## Task contract (step 4 full_dev)

When `workflow_step` returns `parallel: true` and `tasks`:

- **tasks:** `{ id: string, instruction: string, agentId: string }[]` — each task is one specialist; client may run them in parallel or any order.
- **Required state for step 5:** `taskResults: { [taskId]: string }` with exactly one entry per **specialist id in `specialistList`** (not only per task when phased). Server validates before advancing.
- **Sequential:** If `parallel` is absent or false and instructions are not phased, client runs specialists in order and sets `specialistsComplete: true` (and may optionally set taskResults).
- **Phased parallel:** When instructions say Phase A (sequential) then Phase B (parallel), call `workflow_step("full_dev", 4, state)` again after Phase A with `specialistSequentialComplete: true` and `taskResults` containing every Phase A specialist; the tool then returns Phase B with `parallel: true` and `tasks` for the remaining ids. Merge Phase B summaries into the same `taskResults` before step 5.
- **Single-shot parallel:** Entire `specialistList` shares one positive `parallelGroup` (see `config/specialists.json`); one `parallel: true` response covers all tasks.

---

## Frontend-audit workflow (workflowType: "frontend_audit")

| Step | requiredFromState (to enter step) | State keys produced |
|------|-----------------------------------|---------------------|
| 0 | (none) | scope (optional, from request) |
| 1 | scope | auditComplete, auditPath (optional) |
| 2 | auditComplete | (summary; no new keys) |

**State shape (frontend_audit):** `{ scope?, auditComplete?, auditPath? }`

---

## Image-create workflow (workflowType: "image_create")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | — |
| 1 | imageSpec | imageSpec |
| 2 | imageSpec | specConfirmed, imageSpec |
| 3 | specConfirmed, imageSpec | imageComplete, outputPath |

**State shape (image_create):** `{ imageSpec?, specConfirmed?, imageComplete?, outputPath? }`

---

## Visual-tweak workflow (workflowType: "visual_tweak")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | — |
| 1 | target | target |
| 2 | target | plan, planConfirmed |
| 3 | plan, planConfirmed | tweakComplete |

**State shape (visual_tweak):** `{ target?, plan?, planConfirmed?, tweakComplete? }`

---

## Game-feature workflow (workflowType: "game_feature")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | — |
| 1 | gameSpec | gameSpec |
| 2 | gameSpec | plan, skepticPassed |
| 3 | plan, skepticPassed | gameFeatureComplete |

**State shape (game_feature):** `{ gameSpec?, plan?, skepticPassed?, gameFeatureComplete? }`

---

## SVG-create workflow (workflowType: "svg_create")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | svgSpec |
| 1 | svgSpec | specPath, svgSpec, specConfirmed |
| 2 | specConfirmed, svgSpec | svgComplete, svgPath |
| 3 | svgComplete, svgPath | skepticOutputPassed, skepticOutputVerdict |
| 4 | skepticOutputPassed, skepticOutputVerdict | (summary; no new keys) |

**State shape (svg_create):** `{ svgSpec?, specPath?, specConfirmed?, svgComplete?, svgPath?, skepticOutputPassed?, skepticOutputVerdict? }`

---

## Project-kickoff workflow (workflowType: "project_kickoff")

| Step | requiredFromState (to enter step) | State keys produced |
|------|-----------------------------------|---------------------|
| 0 | (none) | discoverySpec, discoveryPath |
| 1 | discoverySpec | prdPath |
| 2 | discoverySpec, prdPath | designDocPath |
| 3 | discoverySpec, designDocPath | domainDocPath (optional) |
| 4 | discoverySpec, designDocPath | priorArtPath |
| 5 | priorArtPath | stackDocPath?, mcpArchPath?, uiSpecPath? |
| 6 | prdPath, designDocPath, priorArtPath | refsIndexPath |
| 7 | refsIndexPath | (complete; no new keys) |

**State shape (project_kickoff):** `{ discoverySpec?, discoveryPath?, prdPath?, designDocPath?, domainDocPath?, priorArtPath?, stackDocPath?, mcpArchPath?, uiSpecPath?, refsIndexPath? }`

- **discoveryPath:** path to saved discovery spec file (e.g. `docs/discovery/YYYY-MM-DD-<slug>.md`)
- **domainDocPath / stackDocPath / mcpArchPath / uiSpecPath:** optional — only present when the step determines they are applicable

---

## Backend-audit workflow (workflowType: "backend_audit")

| Step | requiredFromState (to enter step) | State keys produced |
|------|-----------------------------------|---------------------|
| 0 | (none) | scope, stackContext |
| 1 | scope, stackContext | apiAuditComplete, apiIssues |
| 2 | apiAuditComplete | securityAuditComplete, securityIssues |
| 3 | securityAuditComplete | dataAuditComplete, dataIssues |
| 4 | dataAuditComplete | errorAuditComplete, errorIssues |
| 5 | errorAuditComplete | perfAuditComplete, perfIssues |
| 6 | perfAuditComplete | (summary; no new keys) |

**State shape (backend_audit):** `{ scope?, stackContext?, apiAuditComplete?, apiIssues?, securityAuditComplete?, securityIssues?, dataAuditComplete?, dataIssues?, errorAuditComplete?, errorIssues?, perfAuditComplete?, perfIssues? }`

- **scope:** string — areas to audit (e.g. `"all"` or `"security,data model"`)
- **stackContext:** string — backend runtime, framework, DB, auth summary
- **\*Issues:** `{ critical: number, major: number, minor: number }` — issue counts by severity per phase; `perfIssues` uses `{ high: number, medium: number, low: number }` (impact levels)

---

## Unreal-feature workflow (workflowType: "unreal_feature")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | discoverySpec, ueVersion, ueMcpServer |
| 1 | discoverySpec, ueVersion, ueMcpServer | apiProbe, plan, skepticPassed, skepticVerdict |
| 2 | plan, skepticPassed, skepticVerdict | buildComplete |
| 3 | buildComplete | skepticOutputPassed, skepticOutputVerdict |
| 4 | skepticOutputPassed, skepticOutputVerdict | (summary; no new keys) |

**State shape (unreal_feature):** `{ request?, discoverySpec?, ueVersion?, ueMcpServer?, apiProbe?, plan?, skepticPassed?, skepticVerdict?, buildComplete?, skepticOutputPassed?, skepticOutputVerdict?, iterationCount?, iterationCapApproved? }`

- **ueVersion:** string — UE version string (e.g. `"5.7"`). Used to scope api-probe targets.
- **ueMcpServer:** string — chosen MCP server id (e.g. `"ChiR24"`, `"remi"`, `"Sallah"`, `"kangnam"`, `"jim"`, `"StraySpark"`). Determines tool-name surface for the build step.
- **apiProbe:** object — structured output from `pn-api-probe` (runtime_version, available_apis, deprecated_apis, version_gaps, recommendation). Used to ground the plan in confirmed 5.7 API surface.
- **iterationCount:** `number` — incremented each time step 3 returns `nextStep: 2` (skeptic-on-output failed, loop back to build). Tracks the number of unsuccessful skeptic-on-output cycles. Align with the "3 failed attempts rule" in `pn-skeptic-challenge`: 2 unsuccessful skeptic-output cycles ≈ 3 build attempts (initial + first retry + second retry after approval).
- **iterationCapApproved:** `true` — set after a successful `approval_checkpoint` call when `iterationCount >= 2`. Pass this alongside `pncoreHumanGateTicket` to unblock further iteration. Each additional cycle requires a new approval checkpoint.

---

## FSI analyst draft workflow (workflowType: "fsi_analyst_draft")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | fsiScope |
| 1 | fsiScope | sourcesValidated, assumptionLog |
| 2 | sourcesValidated, assumptionLog | draftComplete, draftPath |
| 3 | draftComplete, draftPath | qcPassed, qcVerdict, auditVerdict (optional) |
| 4 | qcPassed, qcVerdict | signOffConfirmed |
| 5 | signOffConfirmed | (summary; no new keys) |

**State shape (fsi_analyst_draft):** `{ fsiScope?, sourcesValidated?, assumptionLog?, draftComplete?, draftPath?, qcPassed?, qcVerdict?, auditVerdict?, signOffConfirmed? }`

- **fsiScope:** `{ deliverableType, subject, sourcesAvailable, asOfDate, reviewerRole }` — set at step 0. `deliverableType` is one of: `comps | dcf | earnings-note | market-research | ic-memo | gl-recon | model-audit`.
- **assumptionLog:** string — summary of all `[est.]` items and data gaps enumerated in the sources step. Carried forward into the draft and verified during QC.
- **draftPath:** string — path to the saved draft under `docs/fsi/` (e.g. `docs/fsi/AcmeCorp-dcf-draft.md`).
- **qcVerdict:** string — skeptic challenge verdict from the QC step (proceed / revise).
- **auditVerdict:** `"PASS"` | `"FLAG"` — present when `deliverableType` is `dcf`, `comps`, `ic-memo`, or `model-audit`; output of `pn-financial-model-audit`. Absent otherwise.
- **signOffConfirmed:** `true` — set at step 4 when the reviewer explicitly approves the draft for delivery.

### Gate policy

Steps 0, 3, and 4 are always `gate: "human"`. Step 4 is the mandatory delivery sign-off gate — it enforces the non-advice boundary from `pn-fsi-analyst-discipline` and must not be bypassed. To require `approval_checkpoint` tickets on human gates for this workflow, add `"fsi_analyst_draft"` to `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS`.

---

## Business-strategy workflow (workflowType: "business_strategy")

| Step | requiredFromState (to enter step) | State keys produced |
|------|----------------------------------|---------------------|
| 0 | (none) | mode, repoPath?, framing |
| 1 | mode, framing | candidates, selectedAngle (skipped when mode==="idea") |
| 2 | framing | evidenceLogPath |
| 3 | evidenceLogPath | frames, includesImplementation |
| 4 | frames, evidenceLogPath | grillComplete |
| 5 | grillComplete | pressureTestVerdict, killCriteria, firstTenCustomers |
| 6 | pressureTestVerdict | skepticVerdict (skipped when includesImplementation!==true) |
| 7 | pressureTestVerdict | verdictLocked |
| 8 | verdictLocked | (delivers artifacts; no new keys) |

**State shape (business_strategy):** `{ mode?, repoPath?, framing?, candidates?, selectedAngle?, evidenceLogPath?, frames?, includesImplementation?, grillComplete?, discussionIterations?, iterationCapApproved?, pressureTestVerdict?, killCriteria?, firstTenCustomers?, skepticVerdict?, verdictLocked? }`

- **mode:** `"idea" | "codebase" | "hybrid"` — detected at step 0 or set by `--mode` flag. When `"idea"`, step 1 is skipped.
- **repoPath:** string — set when mode is `"codebase"` or `"hybrid"`; path passed to `pn-codebase-to-strategy`.
- **framing:** `{ problem: string, audience: string, hypotheses: string[] }` — produced at step 0.
- **candidates:** `Array<{ id, icp, value_prop_sentence, monetization_hypothesis, evidence_refs: string[] }>` — up to 3 strategic angles from `pn-codebase-to-strategy` (step 1); `evidence_refs` are `file:line` strings.
- **selectedAngle:** string — candidate id chosen via `workflow_confirm` at step 1.
- **evidenceLogPath:** string — path to the run-scoped evidence JSONL (default: `.pncore/workflow-handoff.jsonl`).
- **frames:** `{ market_sizing: string, comps: string, jtbd: string, biz_model: string, risks: string }` — strategic frame produced at step 3.
- **includesImplementation:** boolean — `true` when the strategic frame contains a roadmap or implementation plan; gates step 6.
- **grillComplete:** boolean — set `true` after each grill session at step 4; set `false` when returning to grill from pressure-test (Weak loop).
- **discussionIterations:** number — incremented each time step 5 returns `nextStep: 4` (Weak verdict, loop back to grill). Capped at 2 before `approval_checkpoint` is required.
- **iterationCapApproved:** `true` — set after a successful `approval_checkpoint` call when `discussionIterations >= 2`. Each additional grill cycle requires a new checkpoint.
- **pressureTestVerdict:** `"Strong" | "Weak" | "Pivot"` — from `pn-pressure-test` scorecard at step 5. Pivot terminates the run at step 8 (pivot-path artifact only).
- **killCriteria:** string — conditions that would invalidate the thesis; produced at step 5.
- **firstTenCustomers:** string — who exactly and how to reach them; produced at step 5.
- **skepticVerdict:** `"proceed" | "revise" | "skipped"` — from `pn-skeptic-challenge` at step 6 (`"skipped"` when `includesImplementation !== true`).
- **verdictLocked:** `true` — set at step 7 after user confirms via `workflow_confirm`.

### Evidence-log JSONL entry (appended at steps 2–3 via `workflow_handoff_append`)

Each entry follows this shape:

```jsonc
{
  "kind": "evidence",
  "run_id": "string",
  "claim": "string",
  "source_url": "string",
  "retrieved_at": "ISO-8601",
  "quote": "string (verbatim from source)",
  "confidence_0_1": 0.0,
  "scorecard_row": "pain | buyer | urgency | differentiation | speed | founder | fatal_flaw | competition | market_size",
  "source_kind": "web | repo | user | doc",
  "companion": "octocode | tavily | brave | exa | fred | alpha_vantage | host_websearch | host_webfetch | host_localsearch | none"
}
```

### Conditional steps

- **Step 1** is skipped when `state.mode === "idea"` — call `workflow_step(step=2)` directly from step 0.
- **Step 6** is skipped when `state.includesImplementation !== true` — call `workflow_step(step=7)` with `{ skepticVerdict: "skipped" }`.

### Gate policy

Steps 0, 1, 4, 5, 7 are `gate: "human"`. Steps 2, 3, 8 are `gate: "model"`. Step 6 is `gate: "human"` when not skipped.

The verdict-lock step (7) surfaces the evidence log via `workflow_confirm` with three options: **confirm** (lock and deliver), **revise** (return specific rows to grill), **audit** (sample N=3 random citations with verbatim quotes). The workflow guarantees auditable evidence, not absolute truth — truthfulness depends on user spot-check at lock.

---

## Media-director workflow (workflowType: "media_director")

Opt-in deep flow for generative media (campaigns, film, ComfyUI/T2V pipelines). Invoke standalone via `workflow_step("media_director", 0, {})` or as a sub-flow from `full_dev` when `state.includeGenerativeMedia === true`.

| Step | requiredFromState (to enter step) | State keys produced |
|------|-----------------------------------|---------------------|
| 0 | (none) | request, grillTopics? |
| 1 | request | requiredTopics, grillComplete |
| 2 | requiredTopics, grillComplete | briefPath, brief |
| 3 | briefPath, brief | shotPlan, pipelineSpec, skepticPassed |
| 4 | shotPlan, pipelineSpec, skepticPassed | produceComplete, outputPaths |
| 5 | produceComplete, outputPaths | reviewPassed |
| 6 | reviewPassed | (summary; no new keys) |

**State shape (media_director):** `{ run_id?, request?, grillTopics?, requiredTopics?, grillComplete?, briefPath?, brief?, shotPlan?, pipelineSpec?, skepticPassed?, produceComplete?, outputPaths?, reviewPassed? }`

- **request:** string — deliverable kind from step 0 (stills | video | pipeline | mix) plus any free-form context.
- **grillTopics:** `boolean | undefined` — `true` forces `pn-grill` on every required topic; `false` skips grill even on weak answers (gate_log_append outcome `grill_skipped_explicit`); omit for adaptive auto-trigger per rules below.
- **requiredTopics:** object — six fields captured at step 1: `purpose`, `audienceGoal`, `visualDirection`, `deliverableContract`, `technicalPipeline`, `licensingPolicy`. Each may be revised by inline grill before step 1 returns.
- **grillComplete:** `true` — set when all six topics are answered AND any triggered grill branches resolved. Step 2 will not advance without this.
- **briefPath:** string — `docs/media/<slug>-brief.md`.
- **shotPlan / pipelineSpec:** strings or structured objects — shot list with prompts + camera/lighting (stills) or segment plan (video); pipeline choice (ComfyUI / closed API / hybrid) with pinned checkpoints/VAEs/seeds/dtype.
- **outputPaths:** string[] — generated asset paths under `assets/` (or path from brief).

### Grill trigger rules (step 1, verbatim)

Auto-fire `get_skill('pn-grill')` inline on a required topic when ANY of these is true for that topic's answer:

- blank
- length < 10 characters
- single-word value for `visualDirection` or `purpose`
- contradicts another already-answered topic

Plus:

- `state.grillTopics === true` → grill every topic regardless of answer quality
- `state.grillTopics === false` (explicitly set) → skip grill even on weak answers; emit `gate_log_append { outcome: "grill_skipped_explicit" }`

### Gate policy

Steps 0, 1, 2, 3, 5 are `gate: "human"`. Steps 4 and 6 are `gate: "model"`. Step 5 is the mandatory human review gate against the brief — do not bypass.

---

## Persistence and resume

- State is client-held by default. To persist: use optional tools `workflow_state_save` and `workflow_state_load` with a path (e.g. `.pncore/workflow-state.json` in the workspace), or persist the state object yourself and pass it to the next session.
- When resuming: call `workflow_step(workflowType, step, state)` with the restored state; server validates and returns the next instruction.

### Resume checklist (outer loop, no daemon)

1. **Locate state:** Default file is `.pncore/workflow-state.json` unless `PNCORE_STATE_PATH` overrides it (absolute path recommended when the MCP cwd is not the workspace root).
2. **Restore:** Call `workflow_state_load` with the same path, or read the JSON object from disk.
3. **Continue:** Call `workflow_step(workflowType, step, state)` with the **same** `step` you were about to execute (or the step you last completed, per your notes). If the tool errors on missing keys, merge in fields from the prior step before retrying.
4. **Persist after each step:** After user confirmation or model completion of a step, call `workflow_state_save` with the updated state so disconnects do not lose progress.
5. **Logs (optional):** `.pncore/workflow-runs.jsonl` records step transitions with **`runId`** (`PNCORE_RUN_LOG` to change path or disable with empty env where supported). Use **`workflow_usage_totals`** with `run_id` on `.pncore/usage.jsonl` for token sums. Use **`workflow_handoff_read`** / **`workflow_handoff_append`** on `.pncore/workflow-handoff.jsonl` for cross-session summaries.

### TTL and rotation

- Workflow state JSON can grow with `taskResults` and discovery blobs. Rotate or archive files between major milestones if needed.
- Human-gate approval tickets (when using opt-in mandatory approval) expire after **24 hours**; stale tickets require a new `approval_checkpoint` call.

---

## Opt-in mandatory approval on human gates

When the MCP server sets **`PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS`** to a comma-separated list of `workflowType` values (e.g. `full_dev,project_kickoff`), every **`workflow_step`** whose returned `gate` is **`human`** for those workflows requires a one-time server-issued ticket:

1. User calls **`approval_checkpoint`** with valid `approval_token`, `action_label`, and **`workflow_type` + `workflow_step`** matching the upcoming `workflow_step` call.
2. Response includes **`pncoreHumanGateTicket`**.
3. Call **`workflow_step`** with `state` containing **`pncoreHumanGateTicket`** (alongside normal keys). The server validates and consumes the ticket; reuse the same state object without the ticket key on the next human gate (each gate needs a new checkpoint).

Tickets are stored under **`.pncore/human-gate-tickets.jsonl`** by default (`PNCORE_HUMAN_GATE_TICKETS_PATH` to override). **`PNCORE_APPROVAL_TOKEN`** must be set on the server or checkpoints fail closed.

---

## Gate audit log (optional)

Use MCP tool **`gate_log_append`** to append JSON lines (default **`.pncore/gate-log.jsonl`**) with `timestamp`, `gate_type`, `workflowType`, `step`, `outcome`, optional `action_label`, and optional **`run_id`** for audit trails beyond `approval_checkpoint` and workflow run logs.
