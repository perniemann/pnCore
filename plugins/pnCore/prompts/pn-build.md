---
name: pn-build
description: Full development cycle — discovery, prior art, plan, skeptic, specialist routing, review. For full-stack features, apps, and large changes. When the deliverable is primarily visual, use pn-design instead.
---

# pn-build

**Start every response with:** `[pn-command] 🔺`

When **MCP workflow_step** is available, call `workflow_step("full_dev", 0, {})` and follow each returned instruction. When the user wants **full involvement** (gates at every step), pass `intent: "involved"` in state: `workflow_step("full_dev", 0, { intent: "involved" })`. For new projects, run `get_command("pn-new")` first to establish references and intent; do not bypass pn-new. Otherwise follow the steps below.

**Multi-slice routing:** If discovery reveals ≥2 independent vertical slices (e.g. auth + payments + settings as separate bounded domains), and `featureProgram: true` is in `features.json`, consider `get_command("pn-program")` instead — it provides worktree isolation, contract locking, and a sequential merge queue for concurrent work streams. For a single work stream, stay on `pn-build`.

1. **Discovery:** Run **pn-discovery-questionnaire**. Present each questionnaire section and **ask the user**; do not infer. Gate on user confirmation before proceeding. Skip if user says "skip discovery" or provides a complete spec.

2. **Research:** Run **pn-prior-art-research**. If adapting a project, plan starts with clone/adapt steps; otherwise build-from-scratch.

3. **Plan:** Run **pn-writing-plans** using the discovery spec and prior art research as input. Create bite-sized implementation plan.

3.5. **Skeptic:** Run **pn-skeptic-challenge** on the plan. Do not run specialists until the skeptic pass is accepted (or user says proceed).

4. **Route work:** Act as the pn-project-builder agent. Read `config/specialists.json` for the specialist list. Decide which specialists to use and in what order. Gate: confirm specialist list with user (yes / adjust) — see `reference/conventions.md`. Do not run specialists until user confirms.

**Manual phased builds:** When following `docs/plans/` phase-by-phase instead of a single specialist run, apply **pn-build-gate** phase-complete rules after **each** phase: verify → spawn pn-reviewer Task (`readonly: true`) on the phase diff → fix → user `continue` or `skip review`. Do not merge review and next-phase implementation in one turn.

5. **Run specialists:** Follow each `workflow_step("full_dev", 4, …)` response. **Sequential:** run the listed specialists in order, then advance with `specialistsComplete: true` unless the tool returned parallel tasks. **Single-shot parallel:** when the tool returns `parallel: true` and `tasks`, use the Task tool to spawn subagents (one per task); pass each specialist's agent id and scope as the subagent prompt; advance with `taskResults` covering every id in `specialistList`. **Phased (scaffolder + multiple group-1 specialists):** complete Phase A sequentially, call `workflow_step` on step 4 again with `specialistSequentialComplete: true` and `taskResults` for Phase A only, then run Phase B tasks in parallel and merge summaries before step 5. When `.cursor/skills/project/SKILL.md` exists, read and apply its domain guidance alongside specialist scope. Each specialist runs its own post-step review where applicable.

**pn-assets-manager:** Pass discovery spec and plan. Prompt: "Run in autonomous (batch) mode. Context: discoverySpec, plan. Create logo, hero, icons per taxonomy. Generate or fallback to placeholders. Do not invoke svg_create/image_create (they block). Output ASSET_PHASE_FAILED if nothing created." Do not declare build complete if ASSET_PHASE_FAILED.

**pn-generative-media-director:** When discovery or plan treats generative media as first-class, include in `specialistList` (parallelGroup 1). Pass discovery spec and plan; load `get_agent("pn-generative-media-director")`; deliver workflows, prompt packs, or shot lists per scope. Omit when only standard UI assets are needed.

5.5. **Post-parallel merge:** When `workflow_step` returns **`workflowPhase: "merge"`** at full_dev step 5, follow that instruction (git conflicts, build, reconciled summary), then call `workflow_step("full_dev", 5, { ...state, mergeComplete: true })`. If the tool goes straight to review at step 5, merge is already satisfied. When not using `workflow_step`, after parallel work still run conflict check and build before review per below.

**Manual merge check:** After parallel phases, check `git status` for conflict markers; invoke `get_skill("pn-merge-conflict-fix")` if needed. Verify build. Skip when every specialist ran sequentially only.

6. **Review+optimize loop:** After all specialist phases complete (and merge check passes when parallel), run **one** pass using the pn-reviewer agent's workflow:
   - **Review:** Apply quality gates, deslop, and pn-reality-check (pn-evidence-qa optional for UI-heavy deliverables). List issues.
   - **Optimize:** Apply pn-react-next-perf / pn-systematic-debugging where relevant (skip pn-react-next-perf for non-React/Next projects).
   - **Backend quality (when scope includes backend):** Run `pn-audit-security` for security posture, `pn-audit-errors` to standardize error handling, and `pn-audit-api` for REST convention compliance. Skip if no backend scope.
   - If issues found: fix and re-run once (or until pass if the user requests).

6.5. **Skeptic on output (required):** Run **pn-skeptic-challenge** in "Skeptic on output (post-build)" mode. Gate: confirm with user before proceeding to step 7. Skip path: user may say "skip skeptic".

6a. **(Optional — strict mode)** Run **pn-deliver** to validate against acceptance criteria, package delivery, and produce the delivery pack (summary, file list, how-to-test, checklist, risks, followups).

7. Output a summary of phases completed, any fixes applied, skeptic verdict, and the final pass/fail. If 6a was run, include verifier recommendation and delivery summary.
