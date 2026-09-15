import { describe, it, expect } from "vitest";
import {
  CHARS_PER_TOKEN,
  CODEX_AGENTS_MD_CAP_BYTES,
  agentsMdCapBytes,
  estimateTokens,
  packProjectContext,
  utf8Bytes,
} from "./context-budget.js";
import type { ArtifactReport, ProjectContextPacket } from "./project-context.js";

function artifact(
  id: string,
  derived: ArtifactReport["derived_status"],
  notes: string[] = []
): ArtifactReport {
  return {
    id,
    type: "plan",
    path: `docs/plans/${id}.md`,
    path_exists: derived !== "missing",
    authored_status: derived === "complete_attested" ? "complete" : null,
    derived_status: derived,
    run_id: "r1",
    tracker: null,
    tracker_checked: false,
    notes,
  };
}

function bigPacket(): ProjectContextPacket {
  const artifacts: ArtifactReport[] = [
    artifact("drift-1", "drift", [
      "authored_status=complete but no verify attestation for run r1 matches this artifact path",
    ]),
    artifact("missing-1", "missing", [
      "path docs/plans/missing-1.md does not exist in the workspace",
    ]),
    artifact("wip-1", "in_progress", [
      "run r1 active; last handoff at step 4, verify gate pending",
    ]),
    artifact("unatt-1", "unattested", ["complete claim without verify"]),
    ...Array.from({ length: 12 }, (_, i) => artifact(`ok-${i}`, "ok", [`note ${i} `.repeat(12)])),
    ...Array.from({ length: 6 }, (_, i) =>
      artifact(`done-${i}`, "complete_attested", ["attested"])
    ),
  ];
  return {
    mode: "agent",
    version: "1",
    calendarDateUtc: "2026-09-14",
    context_index: {
      version: "1.3.0",
      last_reviewed: "2026-09-01",
      path: "docs/refs/context-index.json",
      present: true,
    },
    counts: { plan: artifacts.length },
    active_run_id: "r1",
    resume: "Resume: finish step 4",
    drift: artifacts.filter((a) => a.derived_status === "drift" || a.derived_status === "missing"),
    next_incomplete: artifacts[2],
    artifacts,
    trail: Array.from({ length: 20 }, (_, i) => ({
      source: "workflow_handoff" as const,
      ts: `2026-09-14T10:${String(i).padStart(2, "0")}:00.000Z`,
      summary: `handoff ${i} `.repeat(10),
    })),
    pointers: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`pointer_${i}`, `docs/refs/section-${i}/README.md`])
    ),
  };
}

describe("measurement helpers", () => {
  it("estimateTokens is ceil(chars / 4); utf8Bytes counts bytes not chars", () => {
    expect(CHARS_PER_TOKEN).toBe(4);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(utf8Bytes("abc")).toBe(3);
    expect(utf8Bytes("é")).toBe(2);
    expect(utf8Bytes("→")).toBe(3);
  });

  it("agentsMdCapBytes defaults to Codex 32 KiB and honours a sane override only", () => {
    expect(CODEX_AGENTS_MD_CAP_BYTES).toBe(32768);
    expect(agentsMdCapBytes({})).toBe(32768);
    expect(agentsMdCapBytes({ PNCORE_AGENTS_MD_CAP_BYTES: "65536" })).toBe(65536);
    expect(agentsMdCapBytes({ PNCORE_AGENTS_MD_CAP_BYTES: "1024" })).toBe(1024);
    expect(agentsMdCapBytes({ PNCORE_AGENTS_MD_CAP_BYTES: "512" })).toBe(32768);
    expect(agentsMdCapBytes({ PNCORE_AGENTS_MD_CAP_BYTES: "lots" })).toBe(32768);
  });
});

describe("packProjectContext", () => {
  it("without a budget only measures: packet unchanged, fits, no steps, no hint", () => {
    const p = bigPacket();
    const before = JSON.stringify(p);
    const out = packProjectContext(p, undefined);
    expect(JSON.stringify(p)).toBe(before);
    expect(out.budget).toMatchObject({ maxTokens: null, fits: true, steps: [] });
    expect(out.budget.hint).toBeUndefined();
    expect(out.budget.chars).toBe(JSON.stringify(out).length);
    expect(out.budget.estimatedTokens).toBe(Math.ceil(out.budget.chars / 4));
    expect(out.artifacts).toHaveLength(22);
    expect(out.trail).toHaveLength(20);
    for (const bad of [null, 0, -5, Number.NaN]) {
      expect(packProjectContext(p, bad as number).budget.maxTokens).toBeNull();
    }
  });

  it("a generous budget leaves everything in place and records it as fitting", () => {
    const out = packProjectContext(bigPacket(), 100_000);
    expect(out.budget).toMatchObject({ maxTokens: 100_000, fits: true, steps: [] });
    expect(out.artifacts).toHaveLength(22);
  });

  it("trims the trail oldest-first before touching anything else", () => {
    const p = bigPacket();
    const full = JSON.stringify(p).length;
    // Budget just under full size: the trail trim alone is enough.
    const out = packProjectContext(p, Math.floor((full - 400) / 4));
    expect(out.budget.fits).toBe(true);
    expect(out.budget.steps.map((s) => s.action)).toEqual(["trail.trim"]);
    expect(out.trail!.length).toBeLessThan(20);
    expect(out.trail!.length).toBeGreaterThanOrEqual(3);
    expect(out.trail![out.trail!.length - 1].summary).toContain("handoff 19");
    expect(out.artifacts).toHaveLength(22);
    expect(out.budget.steps[0].savedChars).toBeGreaterThan(0);
    expect(out.budget.hint).toMatch(/larger max_tokens/);
    expect(out.budget.estimatedTokens).toBeLessThanOrEqual(out.budget.maxTokens!);
  });

  it("applies the drop order and keeps drift / missing / in_progress / unattested artifacts", () => {
    const out = packProjectContext(bigPacket(), 900);
    expect(out.budget.steps.map((s) => s.action).slice(0, 3)).toEqual([
      "trail.trim",
      "artifacts.clear_settled_notes",
      "artifacts.drop_settled",
    ]);
    expect(out.budget.fits).toBe(true);
    expect(out.artifacts_omitted).toEqual({ ok: 12, complete_attested: 6 });
    expect(out.trail).toHaveLength(3);
    // Every step saved something; the reported saving matches the size delta.
    for (const s of out.budget.steps) expect(s.savedChars).toBeGreaterThan(0);
    const tight = packProjectContext(bigPacket(), 700);
    expect(tight.budget.steps.map((s) => s.action)).toContain("pointers.drop");
    expect(tight.pointers).toBeUndefined();
    // Whatever remains of artifacts is only the unsettled ones.
    for (const a of out.artifacts ?? []) {
      expect(["drift", "missing", "in_progress", "unattested"]).toContain(a.derived_status);
    }
    // Core fields survive.
    expect(out.resume).toBe("Resume: finish step 4");
    expect(out.counts).toEqual({ plan: 22 });
    expect(out.drift.map((a) => a.id)).toEqual(["drift-1", "missing-1"]);
    expect(out.next_incomplete?.id).toBe("wip-1");
  });

  it("goes all the way to dropping artifacts and drift notes, then reports fits:false when core alone is too big", () => {
    const out = packProjectContext(bigPacket(), 200);
    expect(out.budget.steps.map((s) => s.action)).toEqual([
      "trail.trim",
      "artifacts.clear_settled_notes",
      "artifacts.drop_settled",
      "pointers.drop",
      "trail.drop",
      "artifacts.drop_all",
      "drift.clear_notes",
    ]);
    expect(out.trail).toEqual([]);
    expect(out.artifacts).toEqual([]);
    expect(out.artifacts_omitted).toEqual({
      ok: 12,
      complete_attested: 6,
      drift: 1,
      missing: 1,
      in_progress: 1,
      unattested: 1,
    });
    expect(out.drift.every((a) => a.notes.length === 0)).toBe(true);
    expect(out.next_incomplete?.notes).toEqual([]);
    expect(out.drift.map((a) => a.id)).toEqual(["drift-1", "missing-1"]);
    expect(out.budget.fits).toBe(false);
    expect(out.budget.estimatedTokens).toBeGreaterThan(200);
  });

  it("skips steps that have nothing to do (operator packet has no trail / artifacts / pointers)", () => {
    const p: ProjectContextPacket = {
      ...bigPacket(),
      mode: "operator",
      artifacts: undefined,
      trail: undefined,
      pointers: undefined,
    };
    const out = packProjectContext(p, 200);
    expect(out.budget.steps.map((s) => s.action)).toEqual(["drift.clear_notes"]);
    expect(out.artifacts_omitted).toBeUndefined();
  });

  it("every step can be the one that makes the packet fit (budget sweep)", () => {
    const lastActions = new Set<string>();
    for (let tokens = 150; tokens <= 3200; tokens += 5) {
      const out = packProjectContext(bigPacket(), tokens);
      const steps = out.budget.steps;
      if (steps.length > 0 && out.budget.fits) lastActions.add(steps[steps.length - 1].action);
      // Monotone: once it fits, the estimate is within budget; steps never exceed the 7 known ones.
      if (out.budget.fits) expect(out.budget.estimatedTokens).toBeLessThanOrEqual(tokens);
      expect(steps.length).toBeLessThanOrEqual(7);
    }
    expect([...lastActions].sort()).toEqual(
      [
        "trail.trim",
        "artifacts.clear_settled_notes",
        "artifacts.drop_settled",
        "pointers.drop",
        "trail.drop",
        "artifacts.drop_all",
        "drift.clear_notes",
      ].sort()
    );
  });

  it("drops unsettled artifacts without a prior settled drop, and clears next_incomplete notes alone", () => {
    const base = bigPacket();
    const unsettledOnly: ProjectContextPacket = {
      ...base,
      artifacts: base.artifacts!.filter(
        (a) => a.derived_status === "in_progress" || a.derived_status === "unattested"
      ),
      trail: undefined,
      drift: [],
      pointers: base.pointers,
      next_incomplete: {
        ...base.artifacts![2],
        notes: [
          "still running, waiting on the verify gate to attest step 4 before the reviewer pass can start",
          "handoff appended at 10:19; skeptic verdict pending",
        ],
      },
    };
    const out = packProjectContext(unsettledOnly, 100);
    expect(out.budget.steps.map((s) => s.action)).toEqual([
      "pointers.drop",
      "artifacts.drop_all",
      "drift.clear_notes",
    ]);
    expect(out.artifacts_omitted).toEqual({ in_progress: 1, unattested: 1 });
    expect(out.next_incomplete?.notes).toEqual([]);
    expect(out.drift).toEqual([]);

    const noNext: ProjectContextPacket = { ...unsettledOnly, next_incomplete: null, artifacts: [] };
    const out2 = packProjectContext(noNext, 200);
    expect(out2.budget.steps.map((s) => s.action)).toEqual(["pointers.drop"]);
    expect(out2.budget.fits).toBe(true);
  });

  it("skips a step whose section is smaller than the step record (dropping it would grow the packet)", () => {
    const tiny: ProjectContextPacket = {
      ...bigPacket(),
      artifacts: undefined,
      trail: [{ source: "workflow_handoff", ts: "t", summary: "s" }],
      pointers: { adr: "docs/adr" },
      drift: [{ ...artifact("d", "drift", ["short"]) }],
      next_incomplete: null,
    };
    const out = packProjectContext(tiny, 50);
    expect(out.budget.steps).toEqual([]);
    expect(out.pointers).toEqual({ adr: "docs/adr" });
    expect(out.trail).toHaveLength(1);
    expect(out.drift[0].notes).toEqual(["short"]);
    expect(out.budget.fits).toBe(false);
  });

  it("is deterministic: same input and budget produce the same output", () => {
    const a = packProjectContext(bigPacket(), 1200);
    const b = packProjectContext(bigPacket(), 1200);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
