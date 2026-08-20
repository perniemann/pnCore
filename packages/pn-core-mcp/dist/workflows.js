/**
 * Deterministic workflow definitions.
 * Control flow lives here; the LLM assists each step but does not decide sequence.
 * 2026 best practice: "Gating LLM invocation behind deterministic routing decisions."
 */
import { getResource } from "./content.js";
import { disposeVerifyEnabled, loadBestOfNFeatures, loadFeatures, typedEnvelopesEnabled, } from "./features.js";
import { applyTournamentDisposeVerify } from "./dispose-verify-bind.js";
import { validateTaskResults } from "./specialist-envelopes.js";
import { applySkepticGateStateChecks } from "./skeptic-gate-state.js";
import { debug } from "./debug.js";
import { applyOrchestrationLead } from "./orchestration-lead.js";
import { applyTierAlias, buildSuggestedTier, isModelTier, renderTierHint, resolveTournamentBuilderModel, } from "./model-tiers.js";
/** Terminal-step reminder — only emitted when Paperclip env vars are configured. */
function paperclipWorkflowHint() {
    if (!process.env.PAPERCLIP_API_URL || !process.env.PAPERCLIP_API_KEY)
        return "";
    return " Paperclip: load get_skill('pn-paperclip'); use paperclip_issue_checkout before work when governance requires it; when finished, call paperclip_issue_update with status done (issueId from context or PAPERCLIP_ISSUE_ID) and an optional comment.";
}
const HANDOFF_AFTER_STEP = " After completing this step, call workflow_handoff_append with run_id from the latest workflow_step response, this step index, and a short bullet summary (bounded). Echo run_id on every workflow_step call.";
const GATE_STATE_FROM_CONFIRM = " Pass gate keys as structured records from workflow_confirm: { verdict, go_no_go, gate_id, confirmed_at } — not bare true (required when intent is involved or strictSkepticGates is enabled).";
function withHandoff(steps) {
    return steps.map((s) => ({ ...s, instruction: s.instruction + HANDOFF_AFTER_STEP }));
}
const designSteps = [
    {
        instruction: "Load get_skill('pn-discovery-questionnaire'), section 3 (design subsections 3a-3g). Present all subsections. Use ask_question when available. Do not infer. After user answers, call workflow_step(step=1) with state: { discoverySpec }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured design Q&A presentation; synthesis happens in step 1.",
    },
    {
        instruction: "Load pn-core://reference/design-intent.md. Emit Design Read one-liner and tuning dials (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY). From discoverySpec, produce a design plan (Design Read + dials, page mode, typography, tokens, components). Reference get_skill('pn-frontend-design-philosophy') Phase 0 then Phase 1–3. REQUIRED: run get_skill('pn-skeptic-challenge') on the plan — output both plan and skeptic verdict. After user confirms, call workflow_step(step=2) with state: { plan, skepticPassed: <gate record from workflow_confirm>, skepticVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoverySpec"],
        modelTier: "premium",
        tierRationale: "Design plan + skeptic: page mode, typography, token, and philosophy tradeoffs.",
    },
    {
        instruction: "Run pn-assets-manager in batch mode with discoverySpec and plan. Create logo, hero, icons per taxonomy. Do NOT invoke svg_create/image_create workflows. Output ASSET_PHASE_FAILED if nothing created; fix and re-run. When done, call workflow_step(step=3) with state: { assetsComplete: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["plan", "skepticPassed", "skepticVerdict"],
        modelTier: "fast",
        tierRationale: "Mechanical asset taxonomy fan-out; image generation is offloaded.",
    },
    {
        instruction: "Build the design using get_skill('pn-frontend-design'), get_skill('pn-frontend-design-philosophy'), get_skill('pn-frontend-scaffolding'). If discoverySpec specifies a component library, enforce library-first via get_skill('pn-ui-component-libraries'). Apply best practices (pn-core://reference/best-practices.md). When page mode is Portfolio, Product marketing, or Editorial, run get_command('pn-preflight') (studio tier if embedded-studio DNA applies); do not complete on SHIP: NO-GO. When done, call workflow_step(step=4) with state: { buildComplete: true }.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["plan", "skepticPassed", "skepticVerdict", "assetsComplete"],
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-skeptic-challenge') in post-build mode. Review output against plan and philosophy. Output skeptic verdict. After user confirms, call workflow_step(step=5) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 5,
        requiredFromState: ["buildComplete"],
        modelTier: "premium",
        tierRationale: "Rigorous post-build critique of built output against plan and aesthetics baseline.",
    },
    {
        instruction: "Run get_skill('pn-docs-sync'). Output summary: what was built, skeptic findings, success metrics status. Design workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Mechanical docs-sync and brief terminal summary.",
    },
];
const fullDevStep0Base = "Load get_skill('pn-discovery-questionnaire'). Present all sections (Technical, Backend tech if applicable, Security, Design, Requirements, Scope). Use ask_question when available. Do not infer for security or backend tech. ALSO ask this exact question and capture the answer into state.includeGenerativeMedia (boolean): \"Does this run involve generative media beyond standard UI placeholders — campaigns, film, ComfyUI/T2V pipelines? (yes/no). If yes, set includeGenerativeMedia: true.\" After user confirms, call workflow_step(step=1) with state: { discoverySpec, includeGenerativeMedia }.";
const fullDevStep0Involved = "REQUIRED (intent=involved): Load get_skill('pn-discovery-questionnaire'). Present each section ONE BY ONE — wait for user answers before proceeding. Do not infer. Use ask_question per section when available. ALSO ask this exact question and capture the answer into state.includeGenerativeMedia (boolean): \"Does this run involve generative media beyond standard UI placeholders — campaigns, film, ComfyUI/T2V pipelines? (yes/no). If yes, set includeGenerativeMedia: true.\" After all sections answered and confirmed, call workflow_step(step=1) with state: { discoverySpec, intent: 'involved', includeGenerativeMedia }.";
const fullDevSteps = [
    {
        instruction: fullDevStep0Base,
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured discovery Q&A; no plan synthesis yet.",
    },
    {
        instruction: "If .cursor/rules/project-context.mdc does not exist, create it (alwaysApply: true, triangle tag, one-sentence goal/stack/scope from discoverySpec, pn-build-gate + pn-mcp-proactive references; ≤25 lines). Then load get_skill('pn-prior-art-research'), run it from discoverySpec, save to docs/research/. Recommend adapt vs build. After user confirms, call workflow_step(step=2) with state: { priorArt }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoverySpec"],
    },
    {
        instruction: "Load get_skill('pn-writing-plans'). Create plan from discoverySpec and priorArt. Save to docs/plans/. Set state.planArtifactPath and state.planSummary (≤800 words). Update project-context.mdc if present. Run get_skill('pn-skeptic-challenge') on the plan — output both. After user confirms, call workflow_step(step=3) with state: { plan, skepticPassed: <gate record from workflow_confirm>, planArtifactPath, planSummary }." +
            GATE_STATE_FROM_CONFIRM +
            " Optional: set **createGithubIssues: true** to run gated GitHub Issue slicing on step 3 (get_skill('pn-github-vertical-slices') via official GitHub MCP) before specialist routing.",
        gate: "human",
        nextStep: 3,
        requiredFromState: ["priorArt"],
        modelTier: "premium",
        tierRationale: "Plan writing across full feature scope plus skeptic challenge.",
    },
    {
        instruction: "Read pn-core://config/specialists.json. Select specialists and order. REQUIRED inclusions: pn-assets-manager when UI in scope; pn-backend-developer when backend/data layer in scope. OPTIONAL OPT-IN: include pn-generative-media-director ONLY when state.includeGenerativeMedia === true (captured at step 0); do NOT infer from prompt content. Agents listed in specialists.json `optInOnly` are not auto-included. When pn-generative-media-director IS included, step 4 MUST hand its work off to workflow_step('media_director', 0, {}) rather than load the agent ad-hoc. Routing: parallelGroup 0 runs sequentially (Phase A), group 1 runs parallel (Phase B) — see pn-core://reference/parallel-rules.md. Present list to user for confirmation. After confirmed, call workflow_step(step=4) with state: { specialistList, routeConfirmed: true }.",
        gate: "human",
        nextStep: 4,
        requiredFromState: ["plan", "skepticPassed"],
    },
    {
        instruction: "Run specialists per workflow_step response. Sequential: run in order, then workflow_step(step=5) with specialistsComplete: true. Phased: complete Phase A, call workflow_step(step=4) with specialistSequentialComplete: true and partial taskResults. Then run Phase B parallel tasks, merge summaries. Single-shot parallel: run tasks, then step=5 with taskResults. For pn-assets-manager: batch mode, create logo/hero/icons per taxonomy; fix ASSET_PHASE_FAILED before proceeding. For pn-generative-media-director: MUST call workflow_step('media_director', 0, {}) for the gated deep flow (intent → topics+inline-grill → brief → plan+pipeline+skeptic → produce → review → delivery); do NOT load the agent and deliver ad-hoc.",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["specialistList", "routeConfirmed"],
    },
    {
        instruction: "Load get_command('pn-review'). Run review+optimize pass (quality gates, deslop, pn-reality-check). Apply best practices (pn-core://reference/best-practices.md). Fix and re-run once if issues found. Run get_skill('pn-skeptic-challenge') post-build. Run get_skill('pn-docs-sync'). Update project-context.mdc if scope changed. Output summary. After user confirms, call workflow_step(step=6) with state: { reviewComplete: <gate record>, skepticOutputPassed: <gate record> }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 6,
        requiredFromState: ["specialistsComplete"],
        modelTier: "premium",
        tierRationale: "Quality gates, deslop, post-build skeptic across all specialist outputs.",
    },
    {
        instruction: "Full-dev workflow complete. Output brief final summary." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 6,
        requiredFromState: ["reviewComplete", "skepticOutputPassed"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const projectKickoffSteps = [
    {
        instruction: "Load get_skill('pn-discovery-questionnaire'). Present all sections. Use ask_question when available. Do not infer for security/backend tech. Save to docs/discovery/. After user confirms, call workflow_step(step=1) with state: { discoverySpec, discoveryPath }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured discovery Q&A; doc authoring starts in step 1.",
    },
    {
        instruction: "Load get_skill('pn-create-prd'). Run from discoverySpec (feature-matrix for full app/multi-phase, else 8-section). Save to docs/refs/PRD.md. After user confirms, call workflow_step(step=2) with state: { discoverySpec, prdPath: 'docs/refs/PRD.md' }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoverySpec"],
        modelTier: "premium",
        tierRationale: "Cross-cutting product requirements doc; structured spec authoring.",
    },
    {
        instruction: "Load get_skill('pn-create-design-doc'). Run from discoverySpec. Save to docs/refs/DESIGN-DOC.md. After user confirms, call workflow_step(step=3) with state: { designDocPath: 'docs/refs/DESIGN-DOC.md' }.",
        gate: "human",
        nextStep: 3,
        requiredFromState: ["discoverySpec", "prdPath"],
        modelTier: "premium",
        tierRationale: "Architecture and design-decision document.",
    },
    {
        instruction: "Load get_skill('pn-create-domain-doc'). Run from discoverySpec. Creates docs/refs/DOMAIN-DOC.md if scope includes mechanics; skips otherwise. After user confirms, call workflow_step(step=4) with state: { domainDocPath } (omit if skipped).",
        gate: "human",
        nextStep: 4,
        requiredFromState: ["discoverySpec", "designDocPath"],
        modelTier: "premium",
        tierRationale: "Domain mechanics and entities; needs careful synthesis.",
    },
    {
        instruction: "Load get_skill('pn-prior-art-research'). Run from discoverySpec. Save to docs/research/. Recommend adapt vs build. After user confirms, call workflow_step(step=5) with state: { priorArtPath }.",
        gate: "human",
        nextStep: 5,
        requiredFromState: ["discoverySpec", "designDocPath"],
    },
    {
        instruction: "Optional refs (run when applicable): multi-stack → get_skill('pn-create-stack-doc') → docs/refs/STACK.md; multiple MCPs → get_skill('pn-create-mcp-architecture') → docs/refs/MCP-ARCHITECTURE.md; UI in scope → get_skill('pn-ui-design-specs') → docs/refs/UI-DESIGN-SPEC.md. Skip non-applicable. After user confirms, call workflow_step(step=6) with state: { stackDocPath?, mcpArchPath?, uiSpecPath? }.",
        gate: "human",
        nextStep: 6,
        requiredFromState: ["priorArtPath"],
    },
    {
        instruction: "Load get_skill('pn-create-refs-index'). Create docs/refs/README.md indexing all created refs. After user confirms, call workflow_step(step=7) with state: { refsIndexPath: 'docs/refs/README.md' }.",
        gate: "human",
        nextStep: 7,
        requiredFromState: ["prdPath", "designDocPath", "priorArtPath"],
        modelTier: "fast",
        tierRationale: "Mechanical index of created refs.",
    },
    {
        instruction: "Create .cursor/rules/project-context.mdc (alwaysApply: true, triangle tag, goal/stack/scope, pn-build-gate + pn-mcp-proactive refs). Create .cursor/skills/project/SKILL.md with domain guidance. Output: 'Refs complete. Next: run full_dev or design workflow.' Project kickoff complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 7,
        requiredFromState: ["refsIndexPath"],
        modelTier: "fast",
        tierRationale: "Mechanical project-context and skill stub from locked refs.",
    },
];
const promptOptimizeSteps = [
    {
        instruction: "Load get_skill('pn-prompt-optimize'). Present questionnaire. Use ask_question when available. Do not infer. After user replies, call workflow_step(step=1) with state: { promptSpec }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured prompt-intake questionnaire.",
    },
    {
        instruction: "From promptSpec, produce draft optimized prompt (4-Block layout per pn-prompt-optimize). Output: draft, notes, usage tips. After user confirms or provides feedback, call workflow_step(step=2) with state: { draft, notes, usage, reviewComplete: <gate record from workflow_confirm>, userFeedback? }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 2,
        requiredFromState: ["promptSpec"],
        modelTier: "premium",
        tierRationale: "Meta-prompting: producing a 4-Block optimized prompt is reasoning-heavy.",
    },
    {
        instruction: "If userFeedback provided, revise draft. Output final prompt (copy-pasteable), notes, usage. Do not execute the prompt. Prompt_optimize complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["draft", "reviewComplete"],
    },
];
const frontendAuditSteps = [
    {
        instruction: "Confirm audit scope. If state.scope exists, use it. Otherwise ask which pages/sections to audit. Use ask_question when available. After confirmed, call workflow_step(step=1) with state: { scope }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Scoping a small list of pages — light reasoning.",
    },
    {
        instruction: "Run 5 surgical audit phases in order: (1) get_command('pn-audit-typography') — type scale, font, hierarchy; (2) get_command('pn-audit-layout') — spacing tokens, grid, rhythm; (3) get_command('pn-audit-design-tokens') — CSS variables, dark mode; (4) get_command('pn-audit-a11y') — WCAG contrast, keyboard, ARIA; (5) get_command('pn-audit-performance-fe') — Core Web Vitals, bundle, images. Also run Phase 1 (page mode), Phase 4 (motion/scroll/media), Phase 5 (state architecture) inline from get_skill('pn-frontend-design-philosophy'). Apply best practices (pn-core://reference/best-practices.md). Output: inventory, scorecard, component/state/motion maps, performance budget, fix roadmap. Save to docs/audits/. Call workflow_step(step=2) with state: { auditComplete: true, auditPath? }.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["scope"],
        modelTier: "premium",
        tierRationale: "Five surgical audit phases across typography, layout, tokens, a11y, perf.",
    },
    {
        instruction: "Output summary: scorecard highlights, top risks, fast vs structural fixes, design philosophy summary. Frontend audit complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["auditComplete"],
        modelTier: "fast",
        tierRationale: "Scorecard recap.",
    },
];
const imageCreateSteps = [
    {
        instruction: "Load get_skill('pn-cinematography-lighting'), get_skill('pn-image-prompt-engineering'), get_skill('pn-image-creator'). Present questionnaire (subject, environment, lighting, camera, style, output, constraints). Use ask_question when available. Do not infer. After user replies, call workflow_step(step=1) with state: { imageSpec }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured image-intake questionnaire.",
    },
    {
        instruction: "Produce image spec (summary, format, dimensions, path). Present output contract for confirmation. Do not generate until confirmed. After confirmed, call workflow_step(step=2) with state: { specConfirmed: true, imageSpec }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["imageSpec"],
    },
    {
        instruction: "Generate image per imageSpec. PNG: finalize prompt via pn-cinematography-lighting + pn-image-prompt-engineering, then generate; save to assets/. SVG: route to pn-svg-creator. When done, call workflow_step(step=3) with state: { imageComplete: true, outputPath }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["specConfirmed", "imageSpec"],
        modelTier: "fast",
        tierRationale: "Image generation is offloaded to the gen-image tool.",
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-render-verify') on outputPath, then get_skill('pn-skeptic-challenge') post-build on the image. Output skeptic verdict. After user confirms, call workflow_step(step=4) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["imageComplete", "outputPath"],
        modelTier: "premium",
        tierRationale: "Skeptic review of generated image against spec (parity with svg_create).",
    },
    {
        instruction: "Output summary: what was created, path, format, skeptic verdict. Image_create complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const mediaDirectorSteps = [
    {
        instruction: "Confirm this is an involved generative-media run (campaigns, film, ComfyUI/T2V pipelines — not standard UI placeholders). Ask the user: (a) deliverable kind: stills | video | pipeline | mix; (b) optional grillTopics flag (true = force Socratic interrogation on every required topic; false = skip even on weak answers with a logged warning; omit = adaptive auto-trigger per rules in step 1). Use ask_question when available. After user confirms, call workflow_step(step=1) with state: { request, grillTopics? }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Run-intent confirmation and flags only.",
    },
    {
        instruction: "Required-topics questionnaire with INLINE ADAPTIVE GRILL. Load get_skill('pn-cinematography-lighting'), get_skill('pn-image-prompt-engineering'), get_skill('pn-image-creator'), and get_skill('pn-generative-video-pipelines') when video is in scope. Present these six sections ONE BY ONE via ask_question: (1) Purpose, (2) Audience-goal, (3) Visual direction, (4) Deliverable contract (format/dimensions/duration/aspect), (5) Technical-pipeline (ComfyUI / closed API / hybrid; checkpoints; VAEs; seeds; dtype; VRAM), (6) Licensing-policy (commercial use, realistic-person/celebrity/minor risk). After EACH answer, apply the GRILL TRIGGER RULES verbatim — fire get_skill('pn-grill') inline on that branch when ANY of: (a) blank; (b) answer length < 10 characters; (c) single-word value for visual_direction or purpose; (d) the answer contradicts a previously answered topic. ALSO: when state.grillTopics === true, force grill on every topic regardless of answer quality; when state.grillTopics === false (explicitly set), skip grill even on weak answers and emit gate_log_append { outcome: 'grill_skipped_explicit' }. After all six topics are answered and any triggered grill branches resolved, call workflow_step(step=2) with state: { requiredTopics, grillComplete: true }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["request"],
        modelTier: "premium",
        tierRationale: "Six-section adaptive interrogation with inline grill.",
    },
    {
        instruction: "Synthesize requiredTopics into a creative brief. Write to docs/media/<slug>-brief.md covering: look/tone, motion grammar (for video), must-have list, never-have list, visual references, and target color space / display intent. Use get_skill('pn-documentation') for structure. Present brief for confirmation. After user confirms, call workflow_step(step=3) with state: { briefPath, brief }.",
        gate: "human",
        nextStep: 3,
        requiredFromState: ["requiredTopics", "grillComplete"],
        modelTier: "premium",
        tierRationale: "Synthesize requiredTopics into a creative brief.",
    },
    {
        instruction: "Produce the plan + pipeline spec, then run skeptic. For stills: shot list with prompts, camera (mm lens, f-stop when relevant) and lighting specs (key-to-fill ratio, color temperature in K) per shot. For video: segment plan (fps, resolution, aspect, duration, consistency strategy — single-pass vs chunked). Pick pipeline: ComfyUI graph (load get_skill('pn-comfyui-workflows') for graph patterns) / closed API / hybrid. Pin checkpoints, VAEs, samplers, seeds, dtype (fp16/bf16), VRAM assumptions. REQUIRED: run get_skill('pn-skeptic-challenge') on the plan — output verdict. After user confirms, call workflow_step(step=4) with state: { shotPlan, pipelineSpec, skepticPassed: <gate record from workflow_confirm> }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["briefPath", "brief"],
        modelTier: "premium_thinking",
        tierRationale: "ComfyUI graphs, shot lists, lighting specs, pipeline pinning — multi-dimensional.",
    },
    {
        instruction: "Generate per shotPlan and pipelineSpec. ComfyUI: save workflow JSON + record seeds; document custom node pack versions and ComfyUI version. Closed API: record endpoint, model name, parameters. Save outputs to assets/ (or path from brief). For video: emit segment files and document container/codec/fps/duration. When done, call workflow_step(step=5) with state: { produceComplete: true, outputPaths }.",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["shotPlan", "pipelineSpec", "skepticPassed"],
    },
    {
        instruction: "Human review gate. Read each output against the brief — assert physical consistency (lighting, shadows, perspective) using get_skill('pn-cinematography-lighting'). Check must-have / never-have list. Optional: one reroll if specific gaps; if reroll, regenerate that shot/segment only with seed change documented. Present review summary. After user confirms, call workflow_step(step=6) with state: { reviewPassed: true }.",
        gate: "human",
        nextStep: 6,
        requiredFromState: ["produceComplete", "outputPaths"],
        modelTier: "premium",
        tierRationale: "Read outputs against brief; assert physical consistency.",
    },
    {
        instruction: "Output summary: brief path, output paths, seeds, pipeline notes (ComfyUI version + custom nodes if applicable, or API endpoint + model + parameters), and any reroll notes. Media_director workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 6,
        requiredFromState: ["reviewPassed"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const visualTweakSteps = [
    {
        instruction: "Clarify tweak target. Ask what should change. Use ask_question when available. If multiple options, ask before locking. After confirmed, call workflow_step(step=1) with state: { target }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Lightweight clarification.",
    },
    {
        instruction: "Produce short plan (what, which files, approach). Non-trivial changes: run get_skill('pn-skeptic-challenge'). Minor adjustments: skip skeptic. After user confirms, call workflow_step(step=2) with state: { plan, planConfirmed: true }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["target"],
    },
    {
        instruction: "Implement tweak using pn-frontend-design, pn-design-system, or pn-game-logic as appropriate. When done, call workflow_step(step=3) with state: { tweakComplete: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["plan", "planConfirmed"],
        modelTier: "fast",
        tierRationale: "Localized change against an existing surface.",
    },
    {
        instruction: "Output summary: what changed, files touched. Visual_tweak complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["tweakComplete"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const gameFeatureSteps = [
    {
        instruction: "Load get_skill('pn-game-logic'). Present questionnaire (mechanic type, inputs/triggers, desired states, balance/constraints). Use ask_question when available. Do not infer. After user replies, call workflow_step(step=1) with state: { gameSpec }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured game-mechanic intake questionnaire.",
    },
    {
        instruction: "Create implementation plan (game loop fit, state changes, integration points). Run get_skill('pn-skeptic-challenge') on the plan. Output both. After user confirms, call workflow_step(step=2) with state: { plan, skepticPassed: <gate record from workflow_confirm> }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 2,
        requiredFromState: ["gameSpec"],
        modelTier: "premium",
        tierRationale: "Mechanic design and integration plan with skeptic challenge.",
    },
    {
        instruction: "Implement using get_skill('pn-game-logic') per plan. When done, call workflow_step(step=3) with state: { gameFeatureComplete: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["plan", "skepticPassed"],
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-skeptic-challenge') in post-build mode on the implemented game mechanic. Review output against plan and game logic requirements. Output skeptic verdict. After user confirms, call workflow_step(step=4) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["gameFeatureComplete"],
        modelTier: "premium",
        tierRationale: "Skeptic on built mechanic against plan.",
    },
    {
        instruction: "Output summary: mechanic added, files changed, skeptic verdict. Game_feature complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const svgCreateSteps = [
    {
        instruction: "Load get_skill('pn-svg-creator'). Present questionnaire (Purpose, Identity, Style, Animation, Colors, Size, Constraints). Use ask_question when available. Do not infer. After user replies, call workflow_step(step=1) with state: { svgSpec }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured SVG-intake questionnaire.",
    },
    {
        instruction: "Produce SVG spec (Markdown) via get_skill('pn-documentation'). Save to docs/svg/. Do not generate until user confirms. After confirmed, call workflow_step(step=2) with state: { specPath, svgSpec, specConfirmed: true }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["svgSpec"],
    },
    {
        instruction: "Generate SVG per spec using get_skill('pn-svg'). Write to assets/ or path from spec. When done, call workflow_step(step=3) with state: { svgComplete: true, svgPath }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["specConfirmed", "svgSpec"],
        modelTier: "premium",
        tierRationale: "Hand-authoring SVG paths and animation is non-trivial reasoning.",
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-skeptic-challenge') post-build on the SVG. Output skeptic verdict. After user confirms, call workflow_step(step=4) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["svgComplete", "svgPath"],
        modelTier: "premium",
        tierRationale: "Skeptic review of generated SVG.",
    },
    {
        instruction: "Output summary: spec path, SVG path, skeptic verdict. Svg_create complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const backendAuditSteps = [
    {
        instruction: "Confirm scope and stack. Check .pncore-stack.md; if missing, recommend pn-setup, then ask: runtime, framework, DB/ORM, auth, audit areas (all/API/security/data/errors/performance). Use ask_question when available. After confirmed, call workflow_step(step=1) with state: { scope, stackContext }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
    },
    {
        instruction: "Phase 1 — API Design: Load get_command('pn-audit-api'). Check naming, methods, status codes, validation, schema leaks, pagination. Output issues table with severity. Save to docs/audits/. Call workflow_step(step=2) with state: { apiAuditComplete: true, apiIssues }.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["scope", "stackContext"],
        modelTier: "premium",
        tierRationale: "Surface-level API design review with severity scoring.",
    },
    {
        instruction: "Phase 2 — Security: Load get_command('pn-audit-security') + get_skill('pn-auth-patterns'). Check SQLi, JWT, hashing, IDOR, secrets, CORS, headers, rate limiting. Output security issues table with severity. Save to docs/audits/. Present security findings for analyst triage — note any critical or major findings that require immediate attention. After user acknowledges security posture and confirms whether to continue, call workflow_step(step=3) with state: { securityAuditComplete: true, securityIssues }.",
        gate: "human",
        nextStep: 3,
        requiredFromState: ["apiAuditComplete"],
        modelTier: "premium_thinking",
        tierRationale: "Security audit — subtle vulns and chained-attack paths benefit from extended thinking.",
    },
    {
        instruction: "Phase 3 — Data Model: Load get_command('pn-audit-data') + get_skill('pn-database-migrations'). Check FKs, indexes, money types, nullability, migrations, N+1. Output data issues table. Save to docs/audits/. Call workflow_step(step=4) with state: { dataAuditComplete: true, dataIssues }.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["securityAuditComplete"],
        modelTier: "premium",
        tierRationale: "Schema, indexes, migrations; needs cross-section reasoning.",
    },
    {
        instruction: "Phase 4 — Error Handling: Load get_command('pn-audit-errors') + get_skill('pn-observability'). Check error middleware, shapes, requestId, logging, stack leaks, shutdown. Output issues table. Call workflow_step(step=5) with state: { errorAuditComplete: true, errorIssues }.",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["dataAuditComplete"],
    },
    {
        instruction: "Phase 5 — Performance: Load get_command('pn-audit-performance') + get_skill('pn-caching'). Check N+1, indexes, pagination, caching, blocking I/O, connection pools. Output issues table with impact. Call workflow_step(step=6) with state: { perfAuditComplete: true, perfIssues }.",
        gate: "model",
        nextStep: 6,
        requiredFromState: ["errorAuditComplete"],
        modelTier: "premium",
        tierRationale: "Multi-vector perf analysis (N+1, caching, pools, blocking I/O).",
    },
    {
        instruction: "Output final summary: scorecard, critical findings, fix roadmap (top 5 by Impact x Confidence / Effort), quick wins. Save to docs/audits/backend-audit-summary.md. Backend audit complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 6,
        requiredFromState: ["perfAuditComplete"],
    },
];
const unrealFeatureSteps = [
    {
        instruction: "Load get_skill('pn-unreal-mcp'). Present the comparison matrix and decision tree. Use ask_question when available. Collect: UE version (e.g. 5.7), chosen MCP server (ChiR24/remi/Sallah/kangnam/jim/StraySpark), and feature scope. Produce discoverySpec. After user confirms, call workflow_step(step=1) with state: { discoverySpec, ueVersion, ueMcpServer }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
    },
    {
        instruction: "Run get_skill('pn-api-probe') targeting the UE version and ueMcpServer tool surface from discoverySpec (focus on unreal Python module, EditorScriptingUtilities, K2Node deprecations per the UE 5.7 probe targets section). Then produce a feature plan (implementation approach, Blueprint/actor/material scope, UE subsystems, acceptance criteria). REQUIRED: run get_skill('pn-skeptic-challenge') on the plan — output both plan and skeptic verdict. After user confirms, call workflow_step(step=2) with state: { apiProbe, plan, skepticPassed: <gate record from workflow_confirm>, skepticVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoverySpec", "ueVersion", "ueMcpServer"],
        modelTier: "premium",
        tierRationale: "Engine API probe + feature plan + skeptic challenge.",
    },
    {
        instruction: "Build the feature using the connected UE MCP server's tool surface (actor, Blueprint, material, level, and sequencer tools as appropriate per plan and ueMcpServer). Follow the tool-name mapping from pn-unreal-mcp for the chosen server. Address every acceptance criterion in the plan. When done, call workflow_step(step=3) with state: { buildComplete: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["plan", "skepticPassed", "skepticVerdict"],
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-render-verify') with the UE 5.7 appendix — capture viewport/render output and enumerate each spec item (Lumen, Nanite, Blueprint compile state, World Partition, MetaSounds, Niagara, PIE-vs-standalone traps as applicable). Then run get_skill('pn-skeptic-challenge') post-build using render-verify evidence. Output skeptic verdict. After user confirms, call workflow_step(step=4) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["buildComplete"],
        modelTier: "premium",
        tierRationale: "Render-verify against UE 5.7 appendix + post-build skeptic.",
    },
    {
        instruction: "Output summary: UE version, MCP server used, feature built, render-verify findings, skeptic verdict, acceptance criteria status. Unreal_feature workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
const godotFeatureSteps = [
    {
        instruction: "Load get_skill('pn-godot-mcp'). Present the comparison matrix and decision tree. Use ask_question when available. Collect: Godot version (e.g. 4.4), chosen MCP server (Coding-Solo/gdai/ee0pdt/tugcantopaloglu/bradypp), and feature scope. Produce discoverySpec. After user confirms, call workflow_step(step=1) with state: { discoverySpec, godotVersion, godotMcpServer }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
    },
    {
        instruction: "Run get_skill('pn-api-probe') targeting the Godot version and godotMcpServer tool surface from discoverySpec (focus on GDScript API changes, deprecated nodes, GDExtension compatibility, TileMapLayer migration per the Godot 4.x probe targets section). Then produce a feature plan (implementation approach, node/scene/script scope, Godot subsystems, acceptance criteria). REQUIRED: run get_skill('pn-skeptic-challenge') on the plan — output both plan and skeptic verdict. After user confirms, call workflow_step(step=2) with state: { apiProbe, plan, skepticPassed: <gate record from workflow_confirm>, skepticVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoverySpec", "godotVersion", "godotMcpServer"],
        modelTier: "premium",
        tierRationale: "Engine API probe + feature plan + skeptic challenge.",
    },
    {
        instruction: "Build the feature using the connected Godot MCP server's tool surface (node creation, scene edit, script creation/fixing, project run, error capture as appropriate per plan and godotMcpServer). Follow the tool-name mapping from pn-godot-mcp for the chosen server. Address every acceptance criterion in the plan. When done, call workflow_step(step=3) with state: { buildComplete: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["plan", "skepticPassed", "skepticVerdict"],
    },
    {
        instruction: "REQUIRED: Run get_skill('pn-render-verify') with the Godot appendix — capture viewport screenshot or SubViewport output and enumerate each spec item (scene composition, shader output, animation state, physics correctness, UI layout, headless run exit code as applicable). Then run get_skill('pn-skeptic-challenge') post-build using render-verify evidence. Output skeptic verdict. After user confirms, call workflow_step(step=4) with state: { skepticOutputPassed: <gate record from workflow_confirm>, skepticOutputVerdict }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["buildComplete"],
        modelTier: "premium",
        tierRationale: "Render-verify against Godot appendix + post-build skeptic.",
    },
    {
        instruction: "Output summary: Godot version, MCP server used, feature built, render-verify findings, skeptic verdict, acceptance criteria status. Godot_feature workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["skepticOutputPassed", "skepticOutputVerdict"],
        modelTier: "fast",
        tierRationale: "Brief terminal summary.",
    },
];
// FSI analyst draft: 6-step deterministic workflow for financial-services analyst deliverables.
// Spine: scope → sources → draft → QC → human gate sign-off → deliver.
// Every client-facing or policy-adjacent step is gated "human" (pn-fsi-analyst-discipline).
const fsiAnalystDraftSteps = [
    {
        instruction: "Load get_skill('pn-fsi-analyst-discipline'). Ask the user: (1) What deliverable is needed? Supported: comps | dcf | earnings-note | market-research | ic-memo | gl-recon | model-audit. (2) What is the subject (company, sector, deal, or account)? (3) What data sources are available (uploaded files, MCP connectors configured in workspace .mcp.json, or manual input)? (4) What is the as-of date? (5) Who is the reviewing professional (analyst / PM / compliance / counsel)? Use ask_question when available. Do not infer deliverableType or subject. After user answers, call workflow_step(step=1) with state: { fsiScope: { deliverableType, subject, sourcesAvailable, asOfDate, reviewerRole } }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
    },
    {
        instruction: "Do NOT call get_skill('pn-fsi-analyst-discipline') — already loaded at step 0. Ingest and validate all sources listed in fsiScope.sourcesAvailable. For each source confirm it is accessible and contains data needed for fsiScope.deliverableType. If a MCP financial data connector is configured in workspace .mcp.json, attempt to pull required structured data now. For each required input that is absent from all sources, log it as an [est.] item with the assumption that will be used. Output: sources summary table (source | status | data available) and a complete assumptionLog (list of [est.] items and data gaps). Call workflow_step(step=2) with state: { sourcesValidated: true, assumptionLog }.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["fsiScope"],
    },
    {
        instruction: "Do NOT call get_skill('pn-fsi-analyst-discipline') — already loaded at step 0. Based on fsiScope.deliverableType, invoke the corresponding FSI skill: comps → get_skill('pn-comps-analysis'); dcf → get_skill('pn-dcf-model'); earnings-note → get_skill('pn-earnings-analysis'); market-research → get_skill('pn-market-research'); ic-memo → get_skill('pn-ic-memo'); gl-recon → get_skill('pn-gl-reconciler'); model-audit → get_skill('pn-financial-model-audit'). Follow that skill's Instructions section in full. Include all [est.] items from assumptionLog in the deliverable. Save draft to docs/fsi/[subject]-[deliverableType]-draft.md. Call workflow_step(step=3) with state: { draftComplete: true, draftPath }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["sourcesValidated", "assumptionLog"],
        modelTier: "premium_thinking",
        tierRationale: "Financial-model rigor: DCF/comps/IC memo construction with audit-trail.",
    },
    {
        instruction: "Do NOT call get_skill('pn-fsi-analyst-discipline') — already loaded at step 0. Run QC: (1) When deliverableType is dcf, comps, ic-memo, or model-audit: load get_skill('pn-financial-model-audit') and run the full audit checklist on any model content in the draft; record auditVerdict (PASS / FLAG). (2) Verify every [est.] item from assumptionLog is visibly flagged in the draft. (3) Verify scope declaration is present at the top of the deliverable. (4) Run get_skill('pn-skeptic-challenge') on the draft — output both draft and skeptic verdict. Present QC findings, auditVerdict (when applicable), and skeptic verdict for analyst review. After user confirms, call workflow_step(step=4) with state: { qcPassed: true, qcVerdict, auditVerdict? }.",
        gate: "human",
        nextStep: 4,
        requiredFromState: ["draftComplete", "draftPath"],
        modelTier: "premium_thinking",
        tierRationale: "Triple-pass QC including model-audit checklist + skeptic.",
    },
    {
        instruction: "MANDATORY HUMAN GATE — do not skip. Do NOT call get_skill('pn-fsi-analyst-discipline') — already loaded at step 0. Present the complete draft at draftPath for final sign-off. Confirm all four conditions before proceeding: (1) Non-advice framing is present ('This is draft analyst work product…'). (2) Scope declaration is complete (subject, as-of date, sources, reviewer). (3) All [est.] items from assumptionLog are visible in the draft body. (4) fsiScope.reviewerRole is identified as the sign-off authority. Do not finalize, distribute, or act on the deliverable until the analyst explicitly confirms. After explicit sign-off, call workflow_step(step=5) with state: { signOffConfirmed: true }.",
        gate: "human",
        nextStep: 5,
        requiredFromState: ["qcPassed", "qcVerdict"],
    },
    {
        instruction: "Produce final delivery summary: deliverable type, subject, draftPath, as-of date, reviewer, QC verdict, audit verdict (if applicable), [est.] item count, skeptic verdict. State explicitly: 'This draft is staged for professional review by [reviewerRole]. No distribution or downstream action should occur before sign-off.' FSI_analyst_draft workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["signOffConfirmed"],
        modelTier: "fast",
        tierRationale: "Brief terminal sign-off summary.",
    },
];
// Business strategy: 9-step workflow (idea/codebase/hybrid modes).
// Spine: framing → codebase-intake (conditional) → evidence → strategic-frame →
//        grill → pressure-test → skeptic (conditional) → verdict-lock → deliver.
// Step 5 loops back to grill on Weak verdict (cap=2, then approval_checkpoint).
// Step 5 jumps directly to step 8 on Pivot verdict.
// Step 6 is skipped when state.includesImplementation !== true.
const businessStrategySteps = [
    // Step 0: Framing and mode detect
    {
        instruction: "Load get_skill('pn-business-strategy-orchestration'). Ask the user to describe their idea, codebase, or hybrid input. Detect mode: 'idea' if no repo path is provided; 'codebase' if a repo path is given (--from-repo or user provides one); 'hybrid' only when user explicitly requests. Collect: problem statement, target audience, initial hypotheses (1–3). Produce framing: { problem, audience, hypotheses[] }. When mode is 'idea', call workflow_step(step=2) and skip step 1. Otherwise call workflow_step(step=1) with state: { mode, repoPath, framing }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
    },
    // Step 1: Codebase intake (skip when mode === "idea")
    {
        instruction: "Conditional step — skip when state.mode === 'idea' (call workflow_step(step=2) directly). Load get_skill('pn-codebase-to-strategy'). Run codebase analysis on state.repoPath. Produce N≤3 candidate strategic angles, each: { id, icp, value_prop_sentence, monetization_hypothesis, evidence_refs[file:line] }. Present candidates. Use workflow_confirm with option to select one candidate id. After user selects, call workflow_step(step=2) with state: { candidates, selectedAngle }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["mode", "framing"],
        modelTier: "premium",
        tierRationale: "Extracting strategic angles from a codebase: synthesis-heavy.",
    },
    // Step 2: Evidence gathering (companion-MCP-aware)
    {
        instruction: "Enumerate available companion MCPs by checking tool-name prefixes: 'mcp_user-octocode_*' or 'mcp_octocode_*' → codebase_intake; Tavily/Brave/Exa tools → web_evidence; FRED/AlphaVantage tools → market_data. For each factual claim, append an evidence JSONL entry via workflow_handoff_append: { kind:'evidence', run_id, claim, source_url, retrieved_at, quote, confidence_0_1, scorecard_row, source_kind, companion }. Valid scorecard_row values: pain | buyer | urgency | differentiation | speed | founder | fatal_flaw | competition | market_size. Gather evidence covering all 6 pressure-test scorecard rows (pain, buyer, urgency, differentiation, speed, founder). Use companion MCPs when present; fall back to host WebSearch/WebFetch (companion: 'host_websearch'). Set evidenceLogPath to '.pncore/workflow-handoff.jsonl'. Call workflow_step(step=3) with state: { evidenceLogPath }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["framing"],
    },
    // Step 3: Strategic frame (five dimensions)
    {
        instruction: "Build the strategic frame across five dimensions: (1) market_sizing — TAM/SAM/SOM with citations; (2) comps — competition as today's behavior (a spreadsheet IS a competitor), not just named tools; (3) jtbd — jobs-to-be-done, switching triggers, progress milestones; (4) biz_model — revenue model, pricing hypothesis, unit economics; (5) risks — top 3 fatal flaws and kill criteria. Append evidence entries for each claim via workflow_handoff_append. If the frame contains a roadmap or implementation plan, set includesImplementation: true. Call workflow_step(step=4) with state: { frames: { market_sizing, comps, jtbd, biz_model, risks }, includesImplementation }.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["evidenceLogPath"],
        modelTier: "premium_thinking",
        tierRationale: "TAM/SAM/SOM, JTBD, biz_model, risks — multi-dimensional reasoning.",
    },
    // Step 4: Grill discussion
    {
        instruction: "Load get_skill('pn-grill'). Run Socratic interrogation on the framing + strategic frame + evidence gathered so far. Focus questioning on assumptions underlying each pressure-test scorecard row. Ask one question at a time; provide recommended answers; walk every assumption branch until resolved. When grill is complete, call workflow_step(step=5) with state: { grillComplete: true }.",
        gate: "human",
        nextStep: 5,
        requiredFromState: ["frames", "evidenceLogPath"],
        modelTier: "premium",
        tierRationale: "Socratic interrogation requires depth and adversarial reasoning.",
    },
    // Step 5: Pressure-test verdict
    {
        instruction: "Load get_skill('pn-pressure-test'). Apply the 6-row scorecard (pain intensity, buyer clarity, urgency, differentiation, speed to validate, founder advantage) to the framing + evidence log. Call workflow_handoff_read and verify each scorecard row has ≥1 evidence entry tagged to that row. If any row has zero entries, do not lock verdict — return to grill (set grillComplete: false and call workflow_step(step=4)). When evidence gate passes, output verdict: Strong / Weak / Pivot, plus killCriteria and firstTenCustomers. Call workflow_step(step=6) with state: { pressureTestVerdict, killCriteria, firstTenCustomers }.",
        gate: "human",
        nextStep: 6,
        requiredFromState: ["grillComplete"],
        modelTier: "premium_thinking",
        tierRationale: "6-row scorecard verdict against evidence — high-stakes verdict.",
    },
    // Step 6: Skeptic challenge (conditional on includesImplementation)
    {
        instruction: "Conditional step — skip when state.includesImplementation !== true (call workflow_step(step=7) directly with state: { skepticVerdict: 'skipped' }). Load get_skill('pn-skeptic-challenge'). Run skeptic challenge on the implementation plan or roadmap in the strategic frame. Output: proceed or revise. Set skepticVerdict. After user confirms, call workflow_step(step=7) with state: { skepticVerdict }.",
        gate: "human",
        nextStep: 7,
        requiredFromState: ["pressureTestVerdict"],
        modelTier: "premium",
        tierRationale: "Skeptic on implementation plan.",
    },
    // Step 7: Verdict lock + user spot-check
    {
        instruction: "Verdict lock gate. Call workflow_handoff_read to surface the evidence log. Present the evidence count per scorecard row and per companion source. Use workflow_confirm with three options: 'confirm' (lock verdict, proceed to delivery), 'revise' (send specific rows back to grill — call workflow_step(step=4) with grillComplete: false), 'audit' (render N=3 random evidence citations with verbatim quotes for side-by-side inspection, then return to this step). State explicitly to the user: 'This workflow guarantees auditable evidence, not absolute truth — citation truthfulness depends on your spot-check here.' After user confirms, call workflow_step(step=8) with state: { verdictLocked: true }.",
        gate: "human",
        nextStep: 8,
        requiredFromState: ["pressureTestVerdict"],
    },
    // Step 8: Deliver HTML brief + markdown digest
    {
        instruction: "Deliver the business strategy brief. (1) Write the markdown digest first using the structure from 'business-strategy-brief.md.template' (front-matter: run_id, created_at, mode, verdict, selected_angle; sections: scorecard, fatal flaws, competition, first 10 customers, MVP wedge, evidence log, open assumptions, kill criteria). Save to docs/strategy/[slug]-strategy-brief.md. (2) Render the single-file HTML brief using 'business-strategy-brief.html.template' — inline CSS, no external fetch. Section order: verdict badge → idea summary → mode and inputs → scorecard (visual, 6 rows) → fatal flaws → competition → first 10 customers → MVP wedge → evidence log (collapsible) → decision log (collapsible) → open assumptions → kill criteria. If .pncore-design.md exists in the project, apply its design tokens; otherwise use the default from pn-core://reference/aesthetics-baseline.md. Save to docs/strategy/[slug]-strategy-brief.html. (3) Optionally offer a Cursor Canvas — only if Cursor's built-in `canvas` skill is available in the user's session (it is not shipped by pnCore). Skip silently otherwise; the HTML brief is the primary stakeholder artifact. Output both file paths and a provenance summary: evidence count per companion. Business_strategy workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "model",
        nextStep: 8,
        requiredFromState: ["verdictLocked"],
    },
];
/**
 * Kahn's algorithm toposort for slice dependency DAGs.
 * Returns the processing order (dependencies first) or null if a cycle exists.
 * sliceIds: all slice ids; dependsOnMap: sliceId → ids it depends on.
 */
function toposortSlices(sliceIds, dependsOnMap) {
    const inDegree = {};
    const adj = {};
    for (const id of sliceIds) {
        inDegree[id] = 0;
        adj[id] = [];
    }
    for (const id of sliceIds) {
        for (const dep of dependsOnMap[id]) {
            if (!adj[dep])
                adj[dep] = [];
            adj[dep].push(id);
            inDegree[id]++;
        }
    }
    const queue = sliceIds.filter((id) => inDegree[id] === 0);
    const result = [];
    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);
        for (const neighbor of adj[node]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0)
                queue.push(neighbor);
        }
    }
    return result.length === sliceIds.length ? result : null;
}
const TOURNAMENT_PATH_DEFS = [
    {
        id: "path-a",
        constraint: "Minimize surface area",
        model: "claude-4.6-sonnet-medium-thinking",
        builderTier: "standard",
    },
    {
        id: "path-b",
        constraint: "Optimize happy path",
        model: "gpt-5.3-codex",
        builderTier: "standard",
    },
    {
        id: "path-c",
        constraint: "Maximize extensibility",
        model: "gemini-3.1-pro",
        builderTier: "standard",
    },
];
const implementationTournamentSteps = [
    {
        instruction: "Load get_skill('pn-best-of-n'). Restate spec in ≤5 sentences. Confirm scope is NOT auth, RLS, payments, or secrets (use parallel review panel instead). List objective gate commands (verifyCommands: [{ cmd, exit: 0 }]). Set tournamentN to 2 or 3 (default from features.bestOfN.defaultN). After user confirms scope and gates, call workflow_step('implementation_tournament', step=1) with state: { specSummary, verifyCommands, tournamentN, scopeConfirmed: true }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Scope and gate checklist before fan-out.",
    },
    {
        instruction: "Parallel builder fan-out (see tasks[] when tournamentN ≥ 2). Each path uses Task subagent_type best-of-n-runner in an isolated worktree under .worktrees/. Builders use standard tier (capped by features.bestOfN.maxCostTier). Do NOT merge to main. When all paths report, call workflow_step(step=2) with state: { candidates[], objectiveGateResults[] }.",
        gate: "model",
        nextStep: 2,
        requiredFromState: ["specSummary", "verifyCommands", "scopeConfirmed"],
        modelTier: "standard",
        tierRationale: "Orchestrate parallel builders; implementation runs in subagents.",
    },
    {
        instruction: "Hard gate: discard candidates with non-zero verify exit. If zero survivors → go_no_go: no_go. If one survivor → set selectedCandidate to that id, judgeComplete: true, skip LLM judge. If ≥2 survivors → call workflow_step(step=3) with objectiveGateResults and candidates for survivors only.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["objectiveGateResults"],
        modelTier: "fast",
        tierRationale: "Mechanical elimination from verify exit codes.",
    },
    {
        instruction: "Premium judge pass (maker ≠ checker). Score 0–1 per survivor. Compute auto_select with scripts/best-of-n-select.mjs (threshold: features.bestOfN.autoSelectMinDelta, default 0.15). Save audit JSON to docs/audits/best-of-n-YYYY-MM-DD-<slug>.json and validate with scripts/validate-best-of-n-contract.mjs. Human gate when human_gate_required. After winner confirmed, call workflow_step(step=4) with { selectedCandidate, judgeComplete: true, auditPath, taskResults }." +
            GATE_STATE_FROM_CONFIRM,
        gate: "human",
        nextStep: 4,
        requiredFromState: ["objectiveGateResults"],
        modelTier: "premium_thinking",
        tierRationale: "Separate judge tier after objective gates.",
    },
    {
        instruction: "Merge or copy winner worktree changes to main. Re-run verifyCommands from step 0. Run pn-build-gate phase-complete on merged diff. Discard loser worktrees under .worktrees/. Log report_usage per fan-out/judge/merge when MCP available. When merge and verify pass, call workflow_step('implementation_tournament', step=5) with state: { mergeComplete: true, selectedCandidate, auditPath, specSummary, taskResults: { implementation_tournament: '<merge summary>' }, plan, skepticPassed, planArtifactPath, planSummary, discoverySpec } (pass plan fields when parent full_dev supplied them; standalone tournaments must include specSummary).",
        gate: "model",
        nextStep: 5,
        requiredFromState: ["selectedCandidate", "judgeComplete"],
        modelTier: "standard",
        tierRationale: "Merge winner and run project verify gates.",
    },
    {
        instruction: "TOURNAMENT HANDOFF — continue delivery on main via full_dev review phase (specialists skipped; implementation came from tournament). Call workflow_step('full_dev', 5, { tournamentHandoff: true, specSummary, specialistList: ['implementation_tournament'], taskResults: { implementation_tournament: <same merge summary> }, mergeComplete: true, selectedCandidate, auditPath, plan, skepticPassed, discoverySpec }). When no parent full_dev plan exists (standalone tournament), omit plan/skepticPassed — full_dev accepts specSummary-only handoff. Follow returned full_dev instructions through step 6. Implementation tournament workflow complete after full_dev step 6." +
            paperclipWorkflowHint(),
        gate: "model",
        nextStep: 5,
        requiredFromState: ["mergeComplete", "selectedCandidate"],
        modelTier: "fast",
        tierRationale: "Hand off to full_dev review; no further tournament steps.",
    },
];
const featureProgramSteps = [
    {
        instruction: "Feature-program workflow (multi-slice hierarchical orchestration). Load get_skill('pn-discovery-questionnaire'). Present all sections and gate on user confirmation. Save spec to docs/discovery/YYYY-MM-DD-<programSlug>.md. Ask for a program slug (kebab-case, e.g. 'user-auth-payments') and confirm the program branch name (default: program/<programSlug>). After user confirms, call workflow_step('feature_program', step=1) with state: { discoveryPath, programSlug, programBranch }.",
        gate: "human",
        nextStep: 1,
        requiredFromState: [],
        modelTier: "fast",
        tierRationale: "Structured program discovery Q&A; decomposition is step 1.",
    },
    {
        instruction: "Decompose into vertical slices using get_skill('pn-program-orchestration') and get_skill('pn-slice-contracts'). HARD EXIT: if the program resolves to a single slice, output 'Single-slice program — run /pn-build instead.' and stop. For ≥2 slices: (a) Define each slice with id, title, ownedPaths[], dependsOn[], contractsProduced[], contractsConsumed[]. Sizing rule: target ≤4 files / ≤100 LOC per specialist task inside each slice. (b) Lock interface contracts (TS interfaces, JSON Schema, or OpenAPI stubs) in docs/refs/contracts/<programSlug>/. (c) Emit .cursor/worktrees.json with per-slice setup commands for the project stack (see get_skill('pn-slice-contracts') for templates). (d) Validate the dependency DAG — workflow_step enforces no cycles at step 1. Present slices and contracts for user confirmation. After confirmed, call workflow_step('feature_program', step=2) with state: { slices, contractsPath, worktreesConfigPath }.",
        gate: "human",
        nextStep: 2,
        requiredFromState: ["discoveryPath", "programSlug"],
        modelTier: "premium_thinking",
        tierRationale: "DAG design + contract authoring across the program.",
    },
    {
        instruction: "Per-slice planning. Run get_skill('pn-writing-plans') for each slice. Save each plan to docs/plans/<programSlug>/<sliceId>.md. Set slices[i].planArtifactPath and slices[i].planSummary (≤500 words each). Run get_skill('pn-skeptic-challenge') on each plan. After all plans are confirmed, call workflow_step('feature_program', step=3) with state: { slices (with planArtifactPath and planSummary populated for every slice), slicesPlanned: true }.",
        gate: "model",
        nextStep: 3,
        requiredFromState: ["slices", "contractsPath"],
        modelTier: "premium",
        tierRationale: "Plan per slice with skeptic challenge each.",
    },
    {
        instruction: "Parallel slice execution (see tasks[] from workflow_step response). Each slice runs a full_dev workflow (starting at step 3 — specialist routing) in its own git worktree. Pass the slice's plan, planArtifactPath, planSummary, and skepticPassed: <gate record from workflow_confirm> as the child state, plus discoverySpec from the program state." +
            GATE_STATE_FROM_CONFIRM +
            " When all slices complete, update each slice's runId, worktreePath, branch, and status in slices[], then call workflow_step('feature_program', step=4) with state: { slices (updated), taskResults (one entry per slice id) }.",
        gate: "model",
        nextStep: 4,
        requiredFromState: ["slices", "slicesPlanned"],
    },
    {
        instruction: "Integration gate. Step 4 runs in two sub-phases — call workflow_step(step=4) again after each sub-phase:\n\nSub-phase A — Verifier gate: For each slice in mergeQueueOrder, run pn-testing-specialist and contract-conformance checks in the slice worktree. Set slices[i].verifierReport = { passed: true/false, evidence: '...' }. When all slices pass, call workflow_step(step=4) with updated slices[] and mergeQueueOrder.\n\nSub-phase B — Sequential merge: Merge each verified slice into the program branch in mergeQueueOrder. After each merge: run build + tests; use get_skill('pn-merge-conflict-fix') for conflicts; commit. When all merged, call workflow_step('feature_program', step=5) with state: { mergeComplete: true, mergedSlices }.",
        gate: "human",
        nextStep: 5,
        requiredFromState: ["slices", "taskResults"],
        modelTier: "premium",
        tierRationale: "Verifier gate + sequential merge across slices.",
    },
    {
        instruction: "Program review. Load get_command('pn-review'). Run review+optimize pass on the merged program branch. Run get_skill('pn-skeptic-challenge') post-build on the full program. Run get_skill('pn-docs-sync'). Output a program summary covering all slices, verifier results, and skeptic verdict. Feature-program workflow complete." +
            paperclipWorkflowHint() +
            " Do not call workflow_step again.",
        gate: "human",
        nextStep: 5,
        requiredFromState: ["mergeComplete"],
        modelTier: "premium",
        tierRationale: "Cross-slice review and skeptic on the merged program.",
    },
];
// withHandoff() appends a HANDOFF_AFTER_STEP reminder so each step writes to
// .pncore/workflow-handoff.jsonl for cross-session resume. It is applied only
// to multi-phase workflows where losing context between sessions is costly:
//   design, full_dev, project_kickoff, backend_audit, unreal_feature, godot_feature,
//   fsi_analyst_draft, business_strategy, media_director, feature_program,
//   implementation_tournament.
// The remaining workflows (prompt_optimize, frontend_audit, image_create,
// visual_tweak, game_feature, svg_create) are short, atomic, or single-artifact
// flows where the handoff log adds noise without recovery value. Add withHandoff()
// when a new workflow has >=4 steps OR spans multiple sessions.
/** Internal engine step keys — not exposed on workflowTypeEnum. */
export const INTERNAL_ENGINE_WORKFLOW_TYPES = ["unreal_feature", "godot_feature"];
export const workflowSteps = {
    design: withHandoff(designSteps),
    full_dev: withHandoff(fullDevSteps),
    project_kickoff: withHandoff(projectKickoffSteps),
    prompt_optimize: promptOptimizeSteps,
    frontend_audit: frontendAuditSteps,
    backend_audit: withHandoff(backendAuditSteps),
    image_create: imageCreateSteps,
    visual_tweak: visualTweakSteps,
    game_feature: gameFeatureSteps,
    svg_create: svgCreateSteps,
    /** engine_feature routes to unreal_feature or godot_feature via state.engine in getWorkflowStep. */
    engine_feature: withHandoff(unrealFeatureSteps),
    unreal_feature: withHandoff(unrealFeatureSteps),
    godot_feature: withHandoff(godotFeatureSteps),
    fsi_analyst_draft: withHandoff(fsiAnalystDraftSteps),
    business_strategy: withHandoff(businessStrategySteps),
    media_director: withHandoff(mediaDirectorSteps),
    feature_program: withHandoff(featureProgramSteps),
    implementation_tournament: withHandoff(implementationTournamentSteps),
};
/** Workflow types exposed via MCP tools (workflowTypeEnum). */
export const PUBLIC_WORKFLOW_TYPES = Object.keys(workflowSteps).filter((t) => !INTERNAL_ENGINE_WORKFLOW_TYPES.includes(t));
/**
 * Resolve the model tier for a (workflowType, step) pair, applying per-step
 * overrides and global tier aliases from features.json / PNCORE_FEATURES.
 * Used by the suggest_model_tier MCP tool and by withTierHint() below.
 */
export function resolveStepTier(workflowType, step) {
    const steps = workflowSteps[workflowType];
    if (!steps || step < 0 || step >= steps.length)
        return null;
    const def = steps[step];
    const stepTier = def.modelTier ?? "standard";
    const features = loadFeatures();
    const overrideKey = `${workflowType}.${step}`;
    const override = features.modelTierOverrides[overrideKey];
    const beforeAlias = override && isModelTier(override) ? override : stepTier;
    const finalTier = applyTierAlias(beforeAlias, features.tierAliases);
    return buildSuggestedTier(finalTier, def.tierRationale);
}
/**
 * Attach `suggestedModelTier` to a WorkflowStepResult and prepend a short
 * inline hint to `instruction` when the resolved tier is non-standard. Central
 * helper so every early-return branch in getWorkflowStep is consistent.
 *
 * Pass `override` when a branch describes work whose tier differs from the
 * step's default — e.g. an iteration loop-back instructs the model to redo
 * a previous step's work, so the previous step's tier is more honest.
 */
function withTierHint(result, workflowType, step, state, override) {
    let suggested;
    const features = loadFeatures();
    if (override) {
        const aliased = applyTierAlias(override.tier, features.tierAliases);
        suggested = buildSuggestedTier(aliased, override.rationale);
    }
    else {
        suggested = resolveStepTier(workflowType, step);
    }
    let enriched = result;
    if (suggested !== null) {
        if (suggested.tier === "standard") {
            enriched = { ...result, suggestedModelTier: suggested };
        }
        else {
            enriched = {
                ...result,
                suggestedModelTier: suggested,
                instruction: `${renderTierHint(suggested)}\n\n${result.instruction}`,
            };
        }
    }
    return applyOrchestrationLead(enriched, state, {
        tierAliases: features.tierAliases,
        parallel: enriched.parallel === true,
    });
}
function loadSpecialistsConfig() {
    const res = getResource("pn-core://config/specialists.json");
    if (!res)
        return null;
    try {
        return JSON.parse(res.text);
    }
    catch (err) {
        debug("workflows", "specialists.json parse failed (treated as missing)", {
            err: String(err),
        });
        return null;
    }
}
/** parallelGroups[id] > 0 → parallel batch after sequential phase; else sequential-first (scaffold, etc.). */
function partitionSpecialistsForParallel(list, groups) {
    const sequentialIds = list.filter((id) => !(groups[id] > 0));
    const parallelIds = list.filter((id) => groups[id] > 0);
    const vals = parallelIds.map((id) => groups[id]);
    const canParallelizeParallelIds = parallelIds.length >= 2 && vals.length === parallelIds.length && new Set(vals).size === 1;
    return { sequentialIds, parallelIds, canParallelizeParallelIds };
}
export function getWorkflowStep(workflowType, step, state) {
    // engine_feature: routes to unreal_feature or godot_feature based on state.engine.
    if (workflowType === "engine_feature") {
        const engine = state.engine;
        if (engine !== "unreal" && engine !== "godot") {
            return {
                error: "engine_feature requires state.engine: 'unreal' | 'godot'. Set it in workflow state before calling workflow_step.",
            };
        }
        // Delegate to underlying engine type without emitting a deprecation note.
        return getWorkflowStep((engine + "_feature"), step, state);
    }
    const steps = workflowSteps[workflowType];
    if (!steps)
        return { error: `Unknown workflow type: ${workflowType}` };
    if (step < 0 || step >= steps.length)
        return { error: `Invalid step ${step} for workflow ${workflowType}` };
    const def = steps[step];
    // full_dev step 5: accept specialistsComplete, taskResults, or tournament handoff
    if (workflowType === "full_dev" && step === 5) {
        if (state.tournamentHandoff === true) {
            const results = state.taskResults;
            const summary = results?.implementation_tournament;
            if (summary === undefined || summary === null || String(summary).trim() === "") {
                return {
                    error: "Step 5 tournamentHandoff requires taskResults.implementation_tournament with a non-empty merge summary from implementation_tournament step 5.",
                };
            }
            const hasPlan = typeof state.plan === "string" && state.plan.trim() !== "";
            const hasSpec = typeof state.specSummary === "string" && state.specSummary.trim() !== "";
            if (!hasPlan && !hasSpec) {
                return {
                    error: "Step 5 tournamentHandoff requires plan or specSummary for review context. Standalone tournaments pass specSummary from implementation_tournament state.",
                };
            }
        }
        else {
            const hasComplete = state.specialistsComplete === true;
            const list = state.specialistList;
            const results = state.taskResults;
            const hasTaskResults = Array.isArray(list) &&
                list.length > 0 &&
                results &&
                typeof results === "object" &&
                list.every((id) => results[id] != null && String(results[id]).trim() !== "");
            if (!hasComplete && !hasTaskResults) {
                return {
                    error: "Step 5 requires state: specialistsComplete (true) or taskResults (object with an entry for each specialist in specialistList). Complete step 4 first.",
                };
            }
        }
    }
    else {
        const missing = def.requiredFromState.filter((key) => {
            const val = state[key];
            return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
        });
        if (missing.length > 0) {
            const prevStep = step - 1;
            return {
                error: `Step ${step} requires state: ${missing.join(", ")}. Complete step ${prevStep >= 0 ? prevStep : "0"} first and call workflow_step with the required state from that step.`,
            };
        }
    }
    if (typedEnvelopesEnabled() && state.taskResults && typeof state.taskResults === "object") {
        const envelopeCheck = validateTaskResults(state.taskResults);
        if ("error" in envelopeCheck) {
            return { error: envelopeCheck.error };
        }
    }
    const skepticGateCheck = applySkepticGateStateChecks(step, state, def.requiredFromState);
    if (skepticGateCheck?.error) {
        return { error: skepticGateCheck.error };
    }
    const skepticGateWarning = skepticGateCheck?.warning;
    if (workflowType === "full_dev" && step === 3 && loadFeatures().strictPlanSummary) {
        const pa = state.planArtifactPath;
        const ps = state.planSummary;
        if (typeof pa !== "string" || pa.trim() === "" || typeof ps !== "string" || ps.trim() === "") {
            return {
                error: "Step 3 requires non-empty planArtifactPath (path to full plan under docs/plans/) and planSummary when strictPlanSummary is enabled (pn-core://config/features.json or PNCORE_FEATURES).",
            };
        }
    }
    // full_dev step 3: optional gated GitHub Issues phase before specialist routing (same step index)
    if (workflowType === "full_dev" &&
        step === 3 &&
        state.createGithubIssues === true &&
        state.githubVerticalSlicesComplete !== true) {
        return withTierHint({
            instruction: "GITHUB_ISSUES_PHASE (optional gated automation): State.createGithubIssues is true. Ensure the official GitHub MCP server ([github/github-mcp-server](https://github.com/github/github-mcp-server)) exposes issues + labels toolsets (see upstream docs). Load get_skill('pn-github-vertical-slices'); use discoverySpec, plan, planArtifactPath, and planSummary from state to create tracer-bullet Issues in dependency order. If MCP is unavailable or the user declines Issue creation, set githubIssuesSkipped: true. When finished, call workflow_step(step=3) with the same state keys plus githubVerticalSlicesComplete: true (preserve intent when set)." +
                HANDOFF_AFTER_STEP,
            nextStep: 3,
            requiredInputs: ["githubVerticalSlicesComplete"],
            gate: "human",
            done: false,
            workflowPhase: "github_issues",
        }, workflowType, step, state, { tier: "premium", rationale: "Vertical slicing into tracer-bullet GitHub Issues." });
    }
    const nextDef = step + 1 < steps.length ? steps[step + 1] : null;
    const intent = state.intent;
    let instruction = def.instruction;
    let gate = def.gate;
    // full_dev intent=involved: stricter instructions and gates
    if (workflowType === "full_dev" && intent === "involved") {
        if (step === 0) {
            instruction = fullDevStep0Involved;
        }
        else if (step === 1) {
            instruction =
                "Load get_skill('pn-prior-art-research'). Run from discoverySpec, save to docs/research/. Recommend adapt vs build. REQUIRED: wait for explicit user confirmation before proceeding. After confirmed, call workflow_step(step=2) with state: { priorArt, intent: 'involved' }.";
            gate = "human";
        }
        else if (step === 2) {
            instruction =
                "Load get_skill('pn-writing-plans'). Create plan from discoverySpec + priorArt. Save to docs/plans/. Run get_skill('pn-skeptic-challenge') — output both. REQUIRED: wait for user confirmation. After confirmed, call workflow_step(step=3) with state: { plan, skepticPassed: <gate record from workflow_confirm>, intent: 'involved', planArtifactPath, planSummary }." +
                    GATE_STATE_FROM_CONFIRM +
                    " Optional: **createGithubIssues: true** for gated GitHub Issue slicing on step 3 before specialists.";
        }
        else if (step === 3) {
            instruction =
                "Read pn-core://config/specialists.json. Select specialists (same REQUIRED inclusions as standard flow — see step 3 base instruction). Present list for confirmation. REQUIRED: wait for user confirmation. After confirmed, call workflow_step(step=4) with state: { specialistList, routeConfirmed: true, intent: 'involved' }.";
        }
        else if (step === 5) {
            instruction =
                "Load get_command('pn-review'). Run review+optimize pass. Apply best practices (pn-core://reference/best-practices.md). Fix once if issues. Run get_skill('pn-skeptic-challenge') post-build. Run get_skill('pn-docs-sync'). Output summary. REQUIRED: wait for user confirmation. After confirmed, call workflow_step(step=6) with state: { reviewComplete: <gate record>, skepticOutputPassed: <gate record>, intent: 'involved' }." +
                    GATE_STATE_FROM_CONFIRM;
        }
    }
    const baseResult = {
        instruction,
        nextStep: def.nextStep,
        requiredInputs: nextDef?.requiredFromState ?? [],
        gate,
        done: step >= steps.length - 1,
    };
    // full_dev step 4: parallel specialists; phased when group-0 and group-1+ both appear
    if (workflowType === "full_dev" && step === 4) {
        const list = state.specialistList;
        if (Array.isArray(list) && list.length >= 1) {
            const config = loadSpecialistsConfig();
            const groups = config?.parallelGroups;
            if (groups && typeof groups === "object") {
                const g = groups;
                const { sequentialIds, parallelIds, canParallelizeParallelIds } = partitionSpecialistsForParallel(list, g);
                const phased = sequentialIds.length > 0 && canParallelizeParallelIds;
                const seqDone = state.specialistSequentialComplete === true;
                const tr = state.taskResults && typeof state.taskResults === "object"
                    ? state.taskResults
                    : {};
                const seqSummariesComplete = sequentialIds.every((id) => tr[id] != null && String(tr[id]).trim() !== "");
                if (phased) {
                    if (!seqDone) {
                        const seqHint = sequentialIds.join(", ");
                        const parHint = parallelIds.join(", ");
                        const trKeys = sequentialIds.map((id) => `"${id}"`).join(", ");
                        return withTierHint({
                            ...baseResult,
                            instruction: `Two-phase specialist run (parallelGroups in config/specialists.json). Phase A — sequential: run these specialists in list order before any parallel work: ${seqHint}. Apply each agent's scope and skills; each runs its own post-step review where applicable. For pn-assets-manager in Phase A: pass discoverySpec and plan; use the same batch-mode prompt as in this workflow's step-4 instructions. When Phase A is complete, call workflow_step with step=4 and the same specialistList and routeConfirmed (and intent if set), plus specialistSequentialComplete: true and taskResults with a non-empty summary for each Phase A specialist (${trKeys}). You will then receive Phase B to run in parallel: ${parHint}. Do not call workflow_step with step=5 until Phase B is done and taskResults includes every id in specialistList.`,
                        }, workflowType, step, state);
                    }
                    if (!seqSummariesComplete) {
                        return {
                            error: `Phase A incomplete: taskResults must contain a non-empty summary for each sequential specialist before Phase B: ${sequentialIds.join(", ")}.`,
                        };
                    }
                    const tasks = parallelIds.map((id) => ({
                        id,
                        agentId: id,
                        instruction: `Apply get_agent('${id}') scope and skills. When done, set taskResults['${id}'] to a short summary (keep existing Phase A entries). When every specialist in specialistList has a summary, call workflow_step(step=5, state) with that full taskResults object.`,
                    }));
                    return withTierHint({
                        ...baseResult,
                        instruction: `Phase B — parallel: run these specialists in parallel (or any order): ${parallelIds.join(", ")}. Merge summaries into taskResults; preserve Phase A keys. When all Phase B tasks are done, call workflow_step with step=5 and state containing taskResults with one entry per id in specialistList: ${list.map((id) => `"${id}": "<summary>"`).join(", ")}.`,
                        parallel: true,
                        tasks,
                    }, workflowType, step, state);
                }
                if (list.length >= 2 &&
                    sequentialIds.length === 0 &&
                    canParallelizeParallelIds &&
                    parallelIds.length === list.length) {
                    const tasks = list.map((id) => ({
                        id,
                        agentId: id,
                        instruction: `Apply get_agent('${id}') scope and skills. When done, add a short summary to taskResults['${id}'] and call workflow_step(step=5, state) with taskResults for all specialists.`,
                    }));
                    return withTierHint({
                        ...baseResult,
                        instruction: `Run the following specialists in parallel (or any order). When all are done, call workflow_step with step=5 and state containing taskResults: { ${list.map((id) => `"${id}": "<summary>"`).join(", ")} }.`,
                        parallel: true,
                        tasks,
                    }, workflowType, step, state);
                }
            }
        }
    }
    if (workflowType === "full_dev" && step === 5 && loadFeatures().mergePhaseFullDev) {
        const list = state.specialistList;
        const results = state.taskResults;
        const multiParallel = Array.isArray(list) &&
            list.length >= 2 &&
            results &&
            typeof results === "object" &&
            list.every((id) => results[id] != null && String(results[id]).trim() !== "");
        if (multiParallel && state.mergeComplete !== true) {
            return withTierHint({
                instruction: "MERGE PHASE (required before review): Check git status for conflict markers; if present, load get_skill('pn-merge-conflict-fix') and resolve. Run the project build (e.g. npm run build) and fix until it passes. Produce one reconciled summary of integrated work across all specialists. Then call workflow_step with workflowType='full_dev', step=5, same specialistList, taskResults, run_id, and mergeComplete: true (plus plan, skepticPassed, routeConfirmed as before).",
                nextStep: 5,
                requiredInputs: ["mergeComplete", "specialistList", "taskResults"],
                gate: "model",
                done: false,
                workflowPhase: "merge",
            }, workflowType, step, state, { tier: "standard", rationale: "Conflict resolution + build + reconciled summary." });
        }
    }
    // design step 4: when skeptic-on-output failed, loop back to build or gate on approval
    if (workflowType === "design" && step === 4 && state.skepticOutputPassed === false) {
        const iterCount = typeof state.iterationCount === "number" ? state.iterationCount : 0;
        const capApproved = state.iterationCapApproved === true;
        if (iterCount >= 2 && !capApproved) {
            return {
                error: `Design iteration cap reached (iterationCount: ${iterCount}). The skeptic-on-output has failed ${iterCount} time(s) without resolution. Call approval_checkpoint with workflow_type: "design", workflow_step: 4 to get a pncoreHumanGateTicket, then call workflow_step again with state including iterationCapApproved: true and the ticket. This aligns with the 3 failed attempts rule in pn-skeptic-challenge (iterationCount 2 = 3 build attempts: initial + first retry + second retry after approval).`,
            };
        }
        const nextCount = iterCount + 1;
        return withTierHint({
            instruction: `Skeptic on output failed (iteration ${nextCount} of 2 before approval required). Address the issues listed in skepticOutputVerdict. Return to build: call workflow_step("design", 3, state) with the existing plan/skepticPassed/skepticVerdict/assetsComplete fields, clear buildComplete from state, and set iterationCount: ${nextCount}. After rebuilding, run get_skill("pn-render-verify") if the deliverable is visual, then run get_skill("pn-skeptic-challenge") post-build, then call workflow_step("design", 4, state) with the new skepticOutputPassed and skepticOutputVerdict.` +
                HANDOFF_AFTER_STEP,
            nextStep: 3,
            requiredInputs: def.requiredFromState,
            gate: "human",
            done: false,
        }, workflowType, 3, state, { tier: "standard", rationale: "Rebuild against skeptic-flagged issues." });
    }
    // unreal_feature step 3: when skeptic-on-output failed, loop back to build or gate on approval
    if (workflowType === "unreal_feature" && step === 3 && state.skepticOutputPassed === false) {
        const iterCount = typeof state.iterationCount === "number" ? state.iterationCount : 0;
        const capApproved = state.iterationCapApproved === true;
        if (iterCount >= 2 && !capApproved) {
            return {
                error: `Engine_feature (unreal) iteration cap reached (iterationCount: ${iterCount}). The skeptic-on-output has failed ${iterCount} time(s) without resolution. Call approval_checkpoint with workflow_type: "engine_feature", workflow_step: 3, and run_id to get a pncoreHumanGateTicket, then call workflow_step again with state including engine: "unreal", iterationCapApproved: true, and the ticket. This aligns with the 3 failed attempts rule in pn-skeptic-challenge (iterationCount 2 = 3 build attempts: initial + first retry + second retry after approval).`,
            };
        }
        const nextCount = iterCount + 1;
        return withTierHint({
            instruction: `Skeptic on output failed (iteration ${nextCount} of 2 before approval required). Address the issues listed in skepticOutputVerdict. Return to build: call workflow_step("engine_feature", 2, { ...state, engine: "unreal" }) with the existing plan/skepticPassed/skepticVerdict fields, clear buildComplete from state, and set iterationCount: ${nextCount}. After rebuilding, run get_skill("pn-render-verify") with the UE 5.7 appendix, then run get_skill("pn-skeptic-challenge") post-build, then call workflow_step("engine_feature", 3, { ...state, engine: "unreal" }) with the new skepticOutputPassed and skepticOutputVerdict.` +
                HANDOFF_AFTER_STEP,
            nextStep: 2,
            requiredInputs: def.requiredFromState,
            gate: "human",
            done: false,
        }, workflowType, 2, state, { tier: "standard", rationale: "Rebuild against render-verify and skeptic findings." });
    }
    // business_strategy step 5: pressure-test verdict routing
    // Pivot → jump to step 8 (deliver pivot artifact).
    // Weak → loop back to step 4 (grill) with iteration cap 2, then approval_checkpoint.
    if (workflowType === "business_strategy" && step === 5) {
        const verdict = state.pressureTestVerdict;
        if (verdict === "Pivot") {
            return withTierHint({
                instruction: "Pivot verdict reached. The thesis requires a fundamental redirect — this run ends here. Deliver a pivot-path artifact: state the core assumption that failed, identify 2–3 alternative thesis directions with brief rationale for each, and recommend which to explore next. Save to docs/strategy/[slug]-strategy-pivot.md. Inform the user: start a fresh /pn-strategy run for the new thesis. Business_strategy workflow complete (Pivot path)." +
                    HANDOFF_AFTER_STEP,
                nextStep: 8,
                requiredInputs: def.requiredFromState,
                gate: "human",
                done: true,
            }, workflowType, step, state, { tier: "premium", rationale: "Synthesize failure-mode and alternative thesis directions." });
        }
        if (verdict === "Weak") {
            const iterCount = typeof state.discussionIterations === "number" ? state.discussionIterations : 0;
            const capApproved = state.iterationCapApproved === true;
            if (iterCount >= 2 && !capApproved) {
                return {
                    error: `Business_strategy discussion cap reached (discussionIterations: ${iterCount}). The pressure-test has returned Weak ${iterCount} time(s). Call approval_checkpoint with workflow_type: "business_strategy", workflow_step: 5 to get a pncoreHumanGateTicket, then call workflow_step again with state including iterationCapApproved: true and the ticket to continue the grill loop.`,
                };
            }
            const nextCount = iterCount + 1;
            return withTierHint({
                instruction: `Pressure-test returned Weak (iteration ${nextCount} of 2 before approval required). The scorecard shows gaps — address the weakest rows in grill. Return to grill: call workflow_step("business_strategy", 4, state) with grillComplete: false, keep all prior state fields, and set discussionIterations: ${nextCount}. After grill resolves the gaps, re-run pressure-test (step 5) with updated evidence.` +
                    HANDOFF_AFTER_STEP,
                nextStep: 4,
                requiredInputs: def.requiredFromState,
                gate: "human",
                done: false,
            }, workflowType, 4, state);
        }
    }
    // feature_program step 0: gate on featureProgram feature flag
    if (workflowType === "feature_program" && step === 0) {
        if (!loadFeatures().featureProgram) {
            return {
                error: 'feature_program workflow is behind the featureProgram feature flag (default: false). Enable it by adding {"featureProgram": true} to pn-core://config/features.json or the PNCORE_FEATURES env var. Alternatively, use /pn-build (workflow_step("full_dev", 0, {})) for single-pipeline development.',
            };
        }
    }
    // implementation_tournament step 0: gate on bestOfN.enabled feature flag
    if (workflowType === "implementation_tournament" && step === 0) {
        if (!loadBestOfNFeatures().enabled) {
            return {
                error: 'implementation_tournament is behind the bestOfN.enabled feature flag (default: false). Enable it by adding {"bestOfN": {"enabled": true}} to pn-core://config/features.json or PNCORE_FEATURES. For skill-only tournaments, use get_skill(\'pn-best-of-n\') or /pn-best-of-n until the flag is on.',
            };
        }
    }
    // feature_program step 1: single-slice hard exit + DAG cycle validation
    if (workflowType === "feature_program" && step === 1) {
        const slices = state.slices;
        if (Array.isArray(slices)) {
            if (slices.length < 2) {
                return withTierHint({
                    instruction: "Single-slice program detected (slices.length < 2). The feature_program tier adds orchestration overhead that is not warranted for a single work stream. Run /pn-build or workflow_step('full_dev', 0, {}) instead — it delivers the same result with lower overhead. Feature-program workflow complete (single-slice exit)." +
                        HANDOFF_AFTER_STEP,
                    nextStep: 1,
                    requiredInputs: [],
                    gate: "human",
                    done: true,
                }, workflowType, step, state, { tier: "fast", rationale: "Terminal redirect note — no further reasoning required." });
            }
            const sliceIds = slices.map((s) => s.id);
            const dependsOnMap = {};
            for (const s of slices) {
                dependsOnMap[s.id] = s.dependsOn ?? [];
            }
            const sorted = toposortSlices(sliceIds, dependsOnMap);
            if (sorted === null) {
                return {
                    error: "Dependency DAG cycle detected in slices[].dependsOn. A cycle means slices transitively depend on each other, which prevents a safe merge order. Fix the dependsOn declarations (remove circular links) and call workflow_step again.",
                };
            }
        }
    }
    // implementation_tournament step 1: parallel best-of-n-runner fan-out
    if (workflowType === "implementation_tournament" && step === 1) {
        const specSummary = state.specSummary;
        const verifyCommands = state.verifyCommands;
        const tournamentNRaw = typeof state.tournamentN === "number" ? state.tournamentN : loadBestOfNFeatures().defaultN;
        const tournamentN = Math.min(3, Math.max(2, Math.floor(tournamentNRaw)));
        const gateList = Array.isArray(verifyCommands)
            ? verifyCommands
                .filter((v) => typeof v?.cmd === "string" && v.cmd.trim() !== "")
                .map((v) => v.cmd.trim())
                .join("; ")
            : "";
        if (typeof specSummary === "string" && specSummary.trim() !== "" && gateList !== "") {
            const bonFeatures = loadBestOfNFeatures();
            const rawMaxCostTier = isModelTier(bonFeatures.maxCostTier)
                ? bonFeatures.maxCostTier
                : "standard";
            const maxCostTier = applyTierAlias(rawMaxCostTier, loadFeatures().tierAliases);
            const paths = TOURNAMENT_PATH_DEFS.slice(0, tournamentN);
            const tasks = paths.map((p) => {
                const builder = resolveTournamentBuilderModel(p.model, p.builderTier, maxCostTier);
                const capNote = builder.capped
                    ? ` (capped to ${builder.tier} tier per bestOfN.maxCostTier=${maxCostTier})`
                    : "";
                return {
                    id: p.id,
                    agentId: p.id,
                    instruction: `Implement: ${specSummary.trim()}\n` +
                        `Worktree: .worktrees/bon-${p.id} (create from HEAD; implement ONLY in worktree).\n` +
                        `Constraint: ${p.constraint}.\n` +
                        `Required builder model tier: ${builder.tier} — use ${builder.model}${capNote}. Do not exceed maxCostTier.\n` +
                        `Run before submit: ${gateList}.\n` +
                        (disposeVerifyEnabled()
                            ? `Call workflow_verify with a catalog commandId (do not self-report exit codes). Pass attestationId in parent state verifyAttestationIds and objectiveGateResults[].attestationId for id "${p.id}".\n`
                            : "") +
                        `Output: summary, files touched, verify exit codes. Append to parent state objectiveGateResults[] (and candidates[] when available) for id "${p.id}". Do NOT merge to main.`,
                };
            });
            return withTierHint({
                ...baseResult,
                instruction: `Parallel tournament fan-out (N=${tournamentN}): spawn Task subagents (subagent_type: best-of-n-runner) for each task below in isolated worktrees. Same spec, different constraint per path. When all paths complete, call workflow_step('implementation_tournament', step=2) with candidates[] and objectiveGateResults[]${disposeVerifyEnabled() ? " and verifyAttestationIds[] from workflow_verify" : ""}.`,
                parallel: true,
                tasks,
                workflowPhase: "tournament_fanout",
            }, workflowType, step, state);
        }
    }
    // implementation_tournament step 2: single-survivor fast path after objective gates
    if (workflowType === "implementation_tournament" && step === 2) {
        const attested = applyTournamentDisposeVerify(state);
        if ("error" in attested) {
            return { error: attested.error };
        }
        if (attested.skipped === false) {
            const { survivors, acceptance } = attested;
            if (survivors.length === 0) {
                return withTierHint({
                    ...baseResult,
                    instruction: "Zero survivors after attested objective gates. Set go_no_go: no_go. phasesPassed is true; accepted is false — a red suite is a completed verify, not a green run.",
                    nextStep: 2,
                    done: false,
                    workflowPhase: "tournament_gate",
                    acceptance,
                }, workflowType, step, state, { tier: "fast", rationale: "Attested verify produced no survivors." });
            }
            if (survivors.length === 1) {
                const winnerId = survivors[0];
                return withTierHint({
                    ...baseResult,
                    instruction: `Single survivor "${winnerId}" after attested objective gates — skip LLM judge. Call workflow_step('implementation_tournament', step=4) with selectedCandidate: "${winnerId}", judgeComplete: true, and taskResults summarizing the merge-ready worktree.`,
                    nextStep: 4,
                    done: false,
                    workflowPhase: "tournament_gate",
                    acceptance,
                }, workflowType, step, state, { tier: "fast", rationale: "Mechanical winner when only one path passes attested gates." });
            }
            return withTierHint({
                ...baseResult,
                instruction: `${baseResult.instruction}\n\nAttested verify kept ${survivors.length} survivors. Proceed to judge with those candidates only.`,
                nextStep: 3,
                workflowPhase: "tournament_gate",
                acceptance,
            }, workflowType, step, state);
        }
        const gateResults = state.objectiveGateResults;
        if (Array.isArray(gateResults)) {
            const survivors = gateResults.filter((g) => typeof g.candidate_id === "string" && g.passed === true);
            if (survivors.length === 0) {
                return {
                    error: "Zero survivors after objective gates. Set go_no_go: no_go in audit JSON; escalate human (narrow spec, fix tests, or increase N).",
                };
            }
            if (survivors.length === 1) {
                const winnerId = survivors[0].candidate_id;
                return withTierHint({
                    ...baseResult,
                    instruction: `Single survivor "${winnerId}" after objective gates — skip LLM judge. Call workflow_step('implementation_tournament', step=4) with selectedCandidate: "${winnerId}", judgeComplete: true, and taskResults summarizing the merge-ready worktree.`,
                    nextStep: 4,
                    done: false,
                    workflowPhase: "tournament_gate",
                }, workflowType, step, state, { tier: "fast", rationale: "Mechanical winner when only one path passes gates." });
            }
        }
    }
    // implementation_tournament step 3: remind judge of auto-select threshold
    if (workflowType === "implementation_tournament" && step === 3) {
        const minDelta = loadBestOfNFeatures().autoSelectMinDelta;
        return withTierHint({
            ...baseResult,
            instruction: `${baseResult.instruction}\n\nAuto-select threshold (bestOfN.autoSelectMinDelta): ${minDelta}. Use resolveBestOfNSelection / scripts/best-of-n-select.mjs (validator reads the same threshold from features.json / PNCORE_FEATURES).`,
            workflowPhase: "tournament_judge",
        }, workflowType, step, state);
    }
    // implementation_tournament step 5: explicit full_dev handoff payload
    if (workflowType === "implementation_tournament" && step === 5) {
        const selected = state.selectedCandidate;
        const summary = state.taskResults &&
            typeof state.taskResults === "object" &&
            state.taskResults.implementation_tournament;
        if (typeof selected === "string" && selected.trim() !== "" && summary != null) {
            return withTierHint({
                ...baseResult,
                instruction: `${baseResult.instruction}\n\nHandoff state template: workflow_step('full_dev', 5, { tournamentHandoff: true, specSummary: <from state>, plan: <from state when parent full_dev>, skepticPassed: <from state when available>, specialistList: ['implementation_tournament'], taskResults: { implementation_tournament: ${JSON.stringify(String(summary))} }, mergeComplete: true, selectedCandidate: '${selected}', auditPath: <from state> })`,
                workflowPhase: "tournament_handoff",
                done: true,
            }, workflowType, step, state);
        }
    }
    // feature_program step 3: return parallel tasks (one per slice)
    if (workflowType === "feature_program" && step === 3) {
        const slices = state.slices;
        if (Array.isArray(slices) && slices.length >= 2) {
            const tasks = slices.map((sl) => ({
                id: sl.id,
                agentId: sl.id,
                instruction: `Slice: ${sl.id}. ${sl.worktreePath ? `Work in git worktree: ${sl.worktreePath} (branch: ${sl.branch ?? sl.id}).` : `Create or use the worktree for slice '${sl.id}' per .cursor/worktrees.json.`} ` +
                    `Call workflow_step('full_dev', 3, { plan: <slice plan text>, planArtifactPath: '${sl.planArtifactPath ?? ""}', planSummary: '${sl.planSummary ?? ""}', skepticPassed: <gate record from workflow_confirm>, discoverySpec: <parent program discoverySpec from state> }) and follow each returned instruction through to full_dev completion. ` +
                    `When full_dev workflow_step returns done: true, record a completion summary. ` +
                    `Set taskResults['${sl.id}'] in the parent program state to that summary. ` +
                    `When every slice in slices[] has a taskResults entry, call workflow_step('feature_program', step=4, fullProgramState) to advance.`,
            }));
            return withTierHint({
                ...baseResult,
                instruction: `Parallel slice execution: run all ${slices.length} slices in parallel, each in its own git worktree (see .cursor/worktrees.json). Each slice runs a full_dev workflow starting at step 3 (specialist routing). Load get_skill('pn-program-orchestration') for slice-level guidance. When all slices report done, call workflow_step('feature_program', step=4) with slices[] updated (runId, worktreePath, branch, status per slice) and taskResults with one summary entry per slice id.`,
                parallel: true,
                tasks,
            }, workflowType, step, state);
        }
    }
    // feature_program step 4: verifier gate and sequential merge queue
    if (workflowType === "feature_program" && step === 4 && state.mergeComplete !== true) {
        const slices = state.slices;
        if (Array.isArray(slices) && slices.length >= 2) {
            const sliceIds = slices.map((s) => s.id);
            const dependsOnMap = {};
            for (const s of slices) {
                dependsOnMap[s.id] = s.dependsOn ?? [];
            }
            const mergeOrder = toposortSlices(sliceIds, dependsOnMap) ?? sliceIds;
            const failedOrUnverified = slices.filter((s) => !s.verifierReport || s.verifierReport.passed !== true);
            if (failedOrUnverified.length > 0) {
                return withTierHint({
                    ...baseResult,
                    instruction: `VERIFIER GATE (required before merge). Planned merge order: ${mergeOrder.join(" → ")}. For each slice, run pn-testing-specialist and contract-conformance checks in the slice worktree. Set slices[i].verifierReport = { passed: true/false, evidence: "..." }. Slices not yet verified or with passed: false: ${failedOrUnverified.map((s) => s.id).join(", ")}. Fix any failures. When all slices have verifierReport.passed === true, call workflow_step('feature_program', step=4) again with updated slices[] and mergeQueueOrder: ${JSON.stringify(mergeOrder)}.`,
                    nextStep: 4,
                    workflowPhase: "merge",
                    done: false,
                }, workflowType, step, state);
            }
            // All verified — proceed to merge
            return withTierHint({
                ...baseResult,
                instruction: `All slices verified. MERGE PHASE — sequential. Merge each slice branch into the program branch in this order: ${mergeOrder.join(" → ")}. After each merge: (1) run build and tests, (2) use get_skill('pn-merge-conflict-fix') if conflicts arise, (3) commit to program branch. When all slices are merged, call workflow_step('feature_program', step=5) with state: { mergeComplete: true, mergedSlices: ${JSON.stringify(mergeOrder)} }.`,
                nextStep: 4,
                workflowPhase: "merge",
                done: false,
            }, workflowType, step, state, { tier: "standard", rationale: "Sequential git merges with build + test gates." });
        }
    }
    // godot_feature step 3: when skeptic-on-output failed, loop back to build or gate on approval
    if (workflowType === "godot_feature" && step === 3 && state.skepticOutputPassed === false) {
        const iterCount = typeof state.iterationCount === "number" ? state.iterationCount : 0;
        const capApproved = state.iterationCapApproved === true;
        if (iterCount >= 2 && !capApproved) {
            return {
                error: `Engine_feature (godot) iteration cap reached (iterationCount: ${iterCount}). The skeptic-on-output has failed ${iterCount} time(s) without resolution. Call approval_checkpoint with workflow_type: "engine_feature", workflow_step: 3, and run_id to get a pncoreHumanGateTicket, then call workflow_step again with state including engine: "godot", iterationCapApproved: true, and the ticket. This aligns with the 3 failed attempts rule in pn-skeptic-challenge (iterationCount 2 = 3 build attempts: initial + first retry + second retry after approval).`,
            };
        }
        const nextCount = iterCount + 1;
        return withTierHint({
            instruction: `Skeptic on output failed (iteration ${nextCount} of 2 before approval required). Address the issues listed in skepticOutputVerdict. Return to build: call workflow_step("engine_feature", 2, { ...state, engine: "godot" }) with the existing plan/skepticPassed/skepticVerdict fields, clear buildComplete from state, and set iterationCount: ${nextCount}. After rebuilding, run get_skill("pn-render-verify") with the Godot appendix, then run get_skill("pn-skeptic-challenge") post-build, then call workflow_step("engine_feature", 3, { ...state, engine: "godot" }) with the new skepticOutputPassed and skepticOutputVerdict.` +
                HANDOFF_AFTER_STEP,
            nextStep: 2,
            requiredInputs: def.requiredFromState,
            gate: "human",
            done: false,
        }, workflowType, 2, state, { tier: "standard", rationale: "Rebuild against render-verify and skeptic findings." });
    }
    let result = baseResult;
    if (skepticGateWarning) {
        result = {
            ...baseResult,
            instruction: `${skepticGateWarning}\n\n${baseResult.instruction}`,
        };
    }
    if (workflowType === "full_dev" &&
        step === 5 &&
        state.tournamentHandoff === true &&
        (state.skepticPassed === undefined ||
            state.skepticPassed === null ||
            state.skepticPassed === false)) {
        result = {
            ...result,
            instruction: "[tournamentStandalone] No parent skepticPassed — treat specSummary and auditPath as the review baseline; run get_skill('pn-skeptic-challenge') post-build before sign-off.\n\n" +
                result.instruction,
        };
    }
    return withTierHint(result, workflowType, step, state);
}
