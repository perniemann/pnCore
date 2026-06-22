# AGENTS.md and user preferences

Learned preferences and durable workspace facts live in **AGENTS.md**, updated by **pn-continual-learning** from transcript deltas. Use this page to choose AGENTS.md vs project rules vs User Rules.

## Hard Constraints vs Learned Preferences

| Store in | Use for | Examples |
|----------|---------|----------|
| **Cursor User Rules** (Settings → Rules) | Non-negotiable rules that apply to all your projects | "Never add Co-authored-by trailer"; "Always terminate running servers before starting a new one" |
| **.cursor/rules/** (project rules) | Project-specific non-negotiable rules | "Use TypeScript for all new files"; "This repo uses pnpm only" |
| **.cursor/rules/project-context.mdc** | Project scope + [pn-default] 🔺 + MCP bootstrap; pn-new, pn-setup, or full_dev creates this | Context tag + triangle + what we're building + load pn-build-gate/pn-mcp-proactive when MCP available; every new chat gets it |
| **.cursor/skills/project/SKILL.md** | Project-specific domain guidance; pn-new or pn-setup creates this | Domain, constraints, patterns from discovery or codebase analysis; specialists reference when executing |
| **AGENTS.md** | Learned preferences inferred from behavior; can evolve | "Prefer plans before implementation"; "Use ; not && in PowerShell" |

**Rule of thumb:** If it must never be violated, put it in User Rules or a project rule. If it improves behavior but can be overridden, AGENTS.md is fine.

## Example: Hard Constraints Rule

Create `.cursor/rules/hard-constraints.mdc` in your project:

```markdown
---
description: Non-negotiable constraints; never violate these
alwaysApply: true
---

# Hard Constraints

- Never add trailer "Co-authored-by: Cursor <cursoragent@cursor.com>"
- Always terminate running servers before starting a new one
```

Or add these to **Cursor Settings → Rules** (User Rules) for global enforcement.

## Retrieval Policy (pn-agents-md rule)

The pn-agents-md rule enforces:

- Use AGENTS.md for preferences and workspace facts
- For consequential actions (writes, commits, deployments), verify with live tool reads; do not rely solely on AGENTS.md
- Hard constraints belong in User Rules or project rules

## Continual Learning Flow

1. pn-continual-learning extracts preferences from transcripts
2. **User confirmation** (2026 best practice): Presents each new/changed bullet: "I learned: [bullet]. Keep? (yes / no / edit)"
3. User may say "skip confirmation" to write all without prompting
4. Optional metadata: `.cursor/hooks/state/agents-metadata.json` for source/confidence when traceability is needed

## Active profile — tuning the stop hook

The default thresholds (10 turns / 120 minutes) suit low-activity or shared repos. For high-activity workspaces where you want learning to trigger more often, set environment variables in the project or shell profile:

| Profile | `MIN_TURNS` | `MIN_MINUTES` | When to use |
|---------|-------------|---------------|-------------|
| **Default** | 10 | 120 | Quiet repos; shared machines |
| **Active** (`TRIAL_MODE=1`) | 3 | 15 | Daily-driver workspaces during first 2 weeks |
| **Custom** | any | any | Tune with `CONTINUAL_LEARNING_MIN_TURNS` + `CONTINUAL_LEARNING_MIN_MINUTES` |

**Recommended first-install setup for active projects:**

```bash
# In the project .env, shell profile, or Cursor terminal env:
CONTINUAL_LEARNING_TRIAL_MODE=1
```

After 2 weeks lower the sensitivity by unsetting `TRIAL_MODE` or setting explicit values. `install-to-project` prints this recommendation on Windows where the stop hook may not fire automatically — follow it if AGENTS.md is not updating between sessions.

### Windows / hook reliability note

Cursor stop hooks do not fire reliably on all Windows versions or Cursor builds. If AGENTS.md is not updating automatically:

1. Check `.cursor/hooks/hooks.json` — `stop[0].command` should be `node ./.cursor/scripts/pn-continual-learning-stop.mjs`
2. Run `pn-continual-learning` manually after rough sessions, or accept the offer at the end of `/pn-retro`
3. Set `CONTINUAL_LEARNING_TRIAL_MODE=1` so the threshold is met when the hook does fire

## Agent file structure (pn-agents)

When creating or updating pn-agent files (`content/agents/*.md`), follow this structure:

- **Frontmatter:** `name`, `description`, `model: inherit`
- **When to use** — When to invoke this agent
- **Tone** (optional) — 1–2 sentences for agents where behavioral stance matters (e.g. pn-skeptic, pn-reviewer, pn-project-builder). Challenge assumptions; evidence-first; gate on confirmation.
- **Skills and rules to use** — Skills and rules the agent applies
- **Workflow** — Step-by-step process
- **Guardrails** — Constraints, limits, gates
- **Output** — What the agent produces or reports
- **Success Metrics** — Measurable outcomes that indicate success (optional but recommended)

### Success Metrics

Include a **Success Metrics** section defining when the agent has succeeded. Examples:

- "Verification passes (tests/build); no critical issues; deslop complete" (pn-reviewer)
- "All discovery sections answered and spec saved; user confirmed" (pn-discovery-questionnaire)
- "Components built with a11y compliance; post-change review passed" (pn-frontend-developer)

Success metrics make agent behavior evaluable and help the model self-assess completion.
