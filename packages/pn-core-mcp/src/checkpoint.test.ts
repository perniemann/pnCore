import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  META_KEY,
  commitArgsError,
  commitCheckpoint,
  hashState,
  readCheckpointMeta,
  saveStatePlain,
  splitState,
  type CommitInput,
} from "./checkpoint.js";
import { buildProjectContextPacket } from "./project-context.js";

describe("checkpoint commit protocol", () => {
  let cwd: string;
  let statePath: string;
  let handoffPath: string;

  const input = (over: Partial<CommitInput> = {}): CommitInput => ({
    statePath,
    handoffPath,
    state: { plan: "p" },
    run_id: "run-a",
    step: 1,
    summary: "step 1 done",
    ...over,
  });
  const handoffLines = () =>
    existsSync(handoffPath)
      ? readFileSync(handoffPath, "utf-8")
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l) as Record<string, unknown>)
      : [];
  const stored = () => JSON.parse(readFileSync(statePath, "utf-8")) as Record<string, unknown>;

  beforeEach(() => {
    cwd = join(tmpdir(), `pncore-cp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(cwd, ".pncore"), { recursive: true });
    statePath = join(cwd, ".pncore", "workflow-state.json");
    handoffPath = join(cwd, ".pncore", "workflow-handoff.jsonl");
  });

  afterEach(() => {
    if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true });
  });

  it("first commit writes revision 1, binds the run, and returns matching hashes", () => {
    const r = commitCheckpoint(input({ expected_revision: 0 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.revision).toBe(1);
    expect(r.previous_revision).toBe(0);
    expect(r.readBack).toEqual({ revision: 1, stateHash: r.stateHash, run_id: "run-a" });
    const body = stored();
    expect(body.run_id).toBe("run-a");
    expect(body.plan).toBe("p");
    expect(readCheckpointMeta(statePath)).toMatchObject({ revision: 1, run_id: "run-a", step: 1 });
    expect(handoffLines()).toEqual([
      expect.objectContaining({ run_id: "run-a", step: 1, revision: 1, stateHash: r.stateHash }),
    ]);
    expect(existsSync(`${statePath}.lock`)).toBe(false);
  });

  it("successive commits increment the revision and strip a passed-in envelope", () => {
    commitCheckpoint(input());
    const loaded = stored();
    const r = commitCheckpoint(
      input({ state: { ...loaded, extra: 1 }, step: 2, summary: "s2", expected_revision: 1 })
    );
    expect(r.ok && r.revision).toBe(2);
    expect(splitState(stored()).state).toEqual({ plan: "p", extra: 1, run_id: "run-a" });
  });

  it("a stale expected_revision is rejected and nothing is written", () => {
    commitCheckpoint(input());
    const before = readFileSync(statePath, "utf-8");
    const r = commitCheckpoint(input({ step: 2, summary: "s2", expected_revision: 0 }));
    expect(r).toMatchObject({ ok: false, code: "REVISION_CONFLICT", current_revision: 1 });
    expect(readFileSync(statePath, "utf-8")).toBe(before);
    expect(handoffLines()).toHaveLength(1);
  });

  it("refuses to overwrite another run unless overwrite_run is passed", () => {
    commitCheckpoint(input());
    const other = { run_id: "run-b", summary: "b0", step: 0 };
    expect(commitCheckpoint(input(other))).toMatchObject({
      ok: false,
      code: "RUN_MISMATCH",
      current_run_id: "run-a",
    });
    expect(commitCheckpoint(input({ ...other, expected_revision: 1 }))).toMatchObject({
      ok: false,
      code: "RUN_MISMATCH",
    });
    const allowed = commitCheckpoint(
      input({ ...other, expected_revision: 1, overwrite_run: true })
    );
    expect(allowed.ok && allowed.run_id).toBe("run-b");
  });

  it("treats a legacy run_id in an unversioned file as the bound run", () => {
    writeFileSync(statePath, JSON.stringify({ run_id: "run-legacy" }), "utf-8");
    expect(commitCheckpoint(input())).toMatchObject({ ok: false, code: "RUN_MISMATCH" });
    expect(commitCheckpoint(input({ run_id: "run-legacy" }))).toMatchObject({
      ok: true,
      revision: 1,
    });
  });

  it("rejects a state body whose run_id disagrees with run_id", () => {
    const r = commitCheckpoint(input({ state: { run_id: "run-other" } }));
    expect(r).toMatchObject({ ok: false, code: "RUN_MISMATCH" });
    expect(existsSync(statePath)).toBe(false);
  });

  it("an interrupted commit leaves the prior state authoritative and the extra handoff uncommitted", () => {
    commitCheckpoint(input());
    const r = commitCheckpoint(input({ step: 2, summary: "s2", state: { plan: "p2" } }), {
      beforeCommit: () => {
        throw new Error("simulated crash");
      },
    });
    expect(r).toMatchObject({ ok: false, code: "IO_ERROR" });
    expect(readCheckpointMeta(statePath)?.revision).toBe(1);
    expect(stored().plan).toBe("p");
    expect(handoffLines().map((l) => l.revision)).toEqual([1, 2]);
    expect(existsSync(`${statePath}.lock`)).toBe(false);

    const packet = buildProjectContextPacket({ cwd, mode: "operator" });
    expect(packet.active_run.state_revision).toBe(1);
    expect(packet.active_run.last_completed_step).toBe(1);
    expect(packet.consistency.mismatches.map((m) => m.code)).toContain("handoff_revision_ahead");
    expect(packet.active_run.run_id).toBe("run-a");
  });

  it("a fresh lock blocks a second writer; a stale lock is taken over", () => {
    writeFileSync(`${statePath}.lock`, "{}", "utf-8");
    expect(commitCheckpoint(input())).toMatchObject({ ok: false, code: "LOCKED" });
    expect(existsSync(statePath)).toBe(false);
    const old = new Date(Date.now() - 60_000);
    utimesSync(`${statePath}.lock`, old, old);
    expect(commitCheckpoint(input())).toMatchObject({ ok: true, revision: 1 });
    expect(existsSync(`${statePath}.lock`)).toBe(false);
  });

  it("a stale lock replaced by a fresh one before takeover is put back, not stolen", () => {
    const lockPath = `${statePath}.lock`;
    writeFileSync(lockPath, "{}", "utf-8");
    const old = new Date(Date.now() - 60_000);
    utimesSync(lockPath, old, old);
    const fresh = JSON.stringify({ token: "other-writer" });
    const r = commitCheckpoint(input(), {
      onStaleLock: () => {
        rmSync(lockPath);
        writeFileSync(lockPath, fresh, "utf-8");
        const future = new Date(Date.now() + 1000);
        utimesSync(lockPath, future, future);
      },
    });
    expect(r).toMatchObject({ ok: false, code: "LOCKED" });
    expect(readFileSync(lockPath, "utf-8")).toBe(fresh);
    expect(existsSync(statePath)).toBe(false);
    expect(readdirSync(join(cwd, ".pncore")).filter((f) => f.endsWith(".stale"))).toEqual([]);
  });

  it("release leaves a lock that another holder owns", () => {
    const lockPath = `${statePath}.lock`;
    const foreign = JSON.stringify({ token: "other-writer" });
    const r = commitCheckpoint(input(), {
      beforeCommit: () => writeFileSync(lockPath, foreign, "utf-8"),
    });
    expect(r).toMatchObject({ ok: true });
    expect(readFileSync(lockPath, "utf-8")).toBe(foreign);
  });

  it("reports IO_ERROR when the lock cannot be created", () => {
    writeFileSync(join(cwd, "blocker"), "file", "utf-8");
    const r = commitCheckpoint(input({ statePath: join(cwd, "blocker", "state.json") }));
    expect(r).toMatchObject({ ok: false, code: "IO_ERROR" });
  });

  it("reports a read-back mismatch when the file changes under the commit", () => {
    const r = commitCheckpoint(input(), {
      afterCommit: () => writeFileSync(statePath, JSON.stringify({ run_id: "run-a" }), "utf-8"),
    });
    expect(r).toMatchObject({ ok: false, code: "IO_ERROR", current_revision: 0 });
    expect(existsSync(`${statePath}.lock`)).toBe(false);
  });

  it("history appends the prior state before it is replaced", () => {
    const historyPath = `${statePath}.history.jsonl`;
    const first = commitCheckpoint(input({ historyPath }));
    expect(first.ok && first.history_path).toBeUndefined();
    const second = commitCheckpoint(
      input({ historyPath, step: 2, summary: "s2", state: { plan: "p2" } })
    );
    expect(second.ok && second.history_path).toBe(historyPath);
    const lines = readFileSync(historyPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      revision: 1,
      run_id: "run-a",
      state: { plan: "p", run_id: "run-a" },
    });
  });

  it("hashState ignores key order and the envelope", () => {
    expect(hashState({ a: 1, b: { c: [1, 2], d: null } })).toBe(
      hashState({ b: { d: null, c: [1, 2] }, a: 1, [META_KEY]: { revision: 9 } })
    );
    expect(hashState({ a: 1 })).not.toBe(hashState({ a: 2 }));
  });

  it("readCheckpointMeta and splitState tolerate missing, invalid, and partial envelopes", () => {
    expect(readCheckpointMeta(statePath)).toBeNull();
    writeFileSync(statePath, "{", "utf-8");
    expect(readCheckpointMeta(statePath)).toBeNull();
    writeFileSync(statePath, "[]", "utf-8");
    expect(readCheckpointMeta(statePath)).toBeNull();
    expect(splitState({ a: 1, [META_KEY]: { revision: "1" } })).toEqual({
      state: { a: 1 },
      meta: null,
    });
    expect(splitState({ [META_KEY]: [] }).meta).toBeNull();
  });

  it("an unparsable prior file needs expected_revision 0; history keeps its bytes", () => {
    const historyPath = `${statePath}.history.jsonl`;
    writeFileSync(statePath, "not json", "utf-8");
    expect(commitCheckpoint(input())).toMatchObject({ ok: false, code: "PARSE_ERROR" });
    expect(readFileSync(statePath, "utf-8")).toBe("not json");
    const r = commitCheckpoint(input({ expected_revision: 0, historyPath }));
    expect(r).toMatchObject({ ok: true, revision: 1, history_path: historyPath });
    expect(JSON.parse(readFileSync(historyPath, "utf-8").trim())).toMatchObject({
      revision: 0,
      run_id: null,
      raw: "not json",
    });
    writeFileSync(statePath, "[1]", "utf-8");
    expect(commitCheckpoint(input({ expected_revision: 1 }))).toMatchObject({
      ok: false,
      code: "PARSE_ERROR",
    });
    expect(commitCheckpoint(input({ expected_revision: 0 }))).toMatchObject({ ok: true });
  });

  it("plain saves drop a caller-supplied envelope and respect the lock", () => {
    commitCheckpoint(input());
    const raw = stored();
    expect(saveStatePlain(statePath, { ...raw, plan: "edited" })).toEqual({ ok: true });
    expect(stored()).toEqual({ plan: "edited", run_id: "run-a" });
    expect(readCheckpointMeta(statePath)).toBeNull();
    writeFileSync(`${statePath}.lock`, "{}", "utf-8");
    expect(saveStatePlain(statePath, { plan: "x" })).toMatchObject({ ok: false, code: "LOCKED" });
    expect(stored().plan).toBe("edited");
  });

  it("commitArgsError requires run_id, step, and summary together", () => {
    expect(commitArgsError({})).toBeNull();
    expect(commitArgsError({ run_id: "r", step: 1, summary: "s" })).toBeNull();
    expect(commitArgsError({ run_id: "r" })).toMatch(/together/);
    expect(commitArgsError({ overwrite_run: true })).toMatch(/together/);
  });
});
