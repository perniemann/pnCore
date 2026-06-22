---
name: pn-orchestration-philosophy
description: Defines orchestration rulebook: scope before build, prior art before invent, plan before code, zero-context handoff. Use when discovering requirements, researching prior art, or writing implementation plans. Aligns with requirements elicitation and WBS practices (current).
---

# Orchestration Philosophy

## Purpose

Use this as an orchestration rulebook for:

- Requirements discovery and scope definition
- Prior art research before implementation
- Implementation planning and work breakdown
- Handoff and execution coordination

Industry data: ~70% of software project failures stem from inadequate requirements; structured discovery yields 40–50% cost reduction; poorly planned projects average 189% cost overrun.

## When to use

- Before any build, scaffold, or multi-step feature
- When user requests new app, page, plugin, or substantial feature
- When writing implementation plans
- When coordinating specialists or handoff
- Establishing orchestration standards for a team or AI agent

For workflow, audit checklist, and templates, see [reference.md](reference.md).

---

## Core Philosophy (non-negotiables)

### Scope before build

Define what is in scope and out of scope before writing code. Elicit requirements; analyze and specify; manage explicitly. Avoid the "everyone knows" trap—document assumptions. No implementation until scope is confirmed.

### Prior art before invent

Research existing solutions before building from scratch. Adapt when suitable; build only when necessary. Document what was considered and why chosen or rejected. Save time and reduce reinvention.

### Plan before code (multi-step work)

For complex work: write a plan with exact file paths, complete code, and verification steps. Bite-sized tasks (2–5 min). Assume zero context—an engineer with no prior knowledge can execute. DRY, YAGNI, TDD in the plan.

### Confirm before proceed

Gate: do not proceed to implementation until user confirms the discovery spec or plan. Output "Proceed? Reply yes or add/correct." Never infer critical items (security, auth, data sensitivity)—ask or state assumption explicitly.

### Zero-context handoff

Plans and specs must be executable by someone with no prior context. Document everything: which files, what code, how to verify. No "add validation" without the actual validation code. Exact commands with expected output.

### Single source of truth

Discovery spec is the source for security assumptions, design tone, and scope. Plans reference the discovery spec. Prior art findings feed the plan. One canonical doc per phase; no scattered assumptions.

**Write these fields as explicit labeled entries (key: value) or bullet pairs rather than prose paragraphs — prose is for human readers; labeled structure reduces what a downstream agent must infer.**

**Map is not the territory.** Discovery specs and plans approximate runtime reality; they are not it. Re-verify critical assumptions (file paths, schema, API shapes, env config) at the moment of implementation, not only at planning time. When implementation contradicts the spec, update the spec — never silently diverge.

### Architecture mirrors orchestration (Conway)

The way you split specialists, agents, or workflow phases becomes the architecture of what they build. Splitting frontend and backend into separate agents produces a frontend/backend boundary in the artifact even when the problem does not require one. Before adding a new specialist or workflow phase, ask: "Is this split a property of the problem, or only of the team?" When the desired architecture is known, structure the orchestration to match it (Inverse Conway).

---

## Design Rulebook (Do / Don't)

### A) Discovery Rules

**Do**

- Elicit explicitly (ask; do not infer for critical items)
- Cover technical, security, design, and requirements
- Document assumptions; state "assume X until confirmed" when unknown
- Save to `docs/discovery/YYYY-MM-DD-<slug>.md`
- Gate: do not proceed until user confirms
- Require at least purpose and tone before frontend work
- Re-verify spec assumptions against the running system at implementation time (not only at discovery time)

**Don't**

- Don't infer security, auth, or data sensitivity—ask or state assumption
- Don't skip scope and out-of-scope definition
- Don't proceed to plan or build before the user confirms (workflow_confirm or explicit yes)
- Don't assume "obvious" requirements are shared

### B) Prior Art Rules

**Do**

- Run prior art research before implementation when discovery allows
- Document what was considered and why chosen/rejected
- Include "Adapting: [repo/URL]" or "Build from scratch" in plan
- When adapting: first task is clone/init; strip unrelated; align with spec
- When replacing a working system: extract the minimum working subset first; evolve incrementally (Strangler Fig). Do not greenfield a v2 from a wishlist
- Greenfield work starts from the simplest system that works, then evolves (Gall's Law). Do not design a complex system from a blank file — sketch the smallest version that compiles or runs, then grow it

**Don't**

- Don't build from scratch when adaptation is suitable
- Don't skip prior art without explicit user skip
- Don't leave prior art findings undocumented in the plan
- Don't redesign a working system from scratch because v1 "feels messy" — refactor in place or strangle, do not rewrite

### C) Planning Rules

**Do**

- Save plans to `docs/plans/YYYY-MM-DD-<feature>.md`
- Include discovery ref and prior art ref in plan header
- Write bite-sized tasks (one action, 2–5 min)
- Include exact file paths (create, modify, test)
- Include complete code in plan—not "add X"
- Include verification: exact command, expected result
- Reference pn-verification-before-completion before completion claims
- Estimate as a range, not a point; assume the work will exceed the optimistic estimate (Hofstadter's Law). For multi-day plans, surface a reserve buffer in the plan header instead of hiding it inside tasks

**Don't**

- Don't write "add validation" — write the validation code
- Don't assume context—plan for zero-context execution
- Don't mix multiple behaviors in one task
- Don't omit documented verification commands from the plan

### D) Handoff Rules

**Do**

- Present execution choice after plan: full dev loop vs manual
- Offer pn-build when applicable
- State next step clearly (e.g. pn-prior-art-research before plan)
- Keep discovery and plan as single source of truth

**Don't**

- Don't auto-proceed before explicit user approval
- Don't hand off without clear next step
- Don't scatter assumptions across multiple docs
- Don't recover a stuck phase by adding more parallel specialists or agents — coordination overhead grows non-linearly (Brooks's Law). Stop, narrow scope, or escalate to human; see `pn-skeptic-challenge` 3-failed-attempts rule

### E) Scope Management Rules

**Do**

- Define MVP vs full scope explicitly
- List out-of-scope items
- Document constraints (timeline, tech limits)
- Revisit scope when new requirements emerge
- Time-box discovery, prior-art, and review explicitly; work expands to fill the time available (Parkinson's Law). Cap each phase and stop when the box closes — re-plan rather than overrun silently
- Identify the vital few (~20% of items that produce ~80% of value) and ship them first (Pareto). Out-of-scope items are not failures; they are deferred trailing 80%

**Don't**

- Don't expand scope before the user approves the change
- Don't leave scope ambiguous
- Don't assume "we'll figure it out later"

---

## Final Principle

The target is not "we'll iterate and fix it."

It is:

**Scope confirmed + prior art checked + plan executable + gate before proceed.**

That is the rulebook.
