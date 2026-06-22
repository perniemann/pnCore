#!/usr/bin/env node
/**
 * Continual learning stop hook: on session stop, may ask the agent to run
 * the pn-continual-learning skill to update AGENTS.md from transcript deltas.
 * Optional env: CONTINUAL_LEARNING_STATE_DIR, CONTINUAL_LEARNING_MAX_BULLETS,
 * CONTINUAL_LEARNING_MIN_TURNS, CONTINUAL_LEARNING_MIN_MINUTES,
 * CONTINUAL_LEARNING_TRIAL_MODE, CONTINUAL_LEARNING_TRIAL_MIN_TURNS,
 * CONTINUAL_LEARNING_TRIAL_MIN_MINUTES, CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd?.() || process.env.CURSOR_PROJECT_ROOT || ".";
const stateDir = process.env.CONTINUAL_LEARNING_STATE_DIR || ".cursor/hooks/state";
const STATE_PATH = resolve(projectRoot, stateDir, "continual-learning.json");
const INCREMENTAL_INDEX_PATH = resolve(projectRoot, stateDir, "continual-learning-index.json");
const DEFAULT_MIN_TURNS = 10;
const DEFAULT_MIN_MINUTES = 120;
const TRIAL_DEFAULT_MIN_TURNS = 3;
const TRIAL_DEFAULT_MIN_MINUTES = 15;
const TRIAL_DEFAULT_DURATION_MINUTES = 24 * 60;

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value) {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

const maxBullets = parsePositiveInt(process.env.CONTINUAL_LEARNING_MAX_BULLETS, 12);

function getFollowupMessage() {
  return `Run the \`pn-continual-learning\` skill now. First read existing \`AGENTS.md\` and update existing entries in place (do not only append). Use incremental transcript processing with index file \`${INCREMENTAL_INDEX_PATH}\`: only read transcripts not in the index or transcripts whose mtime is newer than indexed mtime (re-read changed transcripts). After processing, write back the updated index mtimes and remove entries for deleted transcripts. Update \`AGENTS.md\` only for high-signal, repeated user-correction patterns or durable workspace facts. Exclude one-off/transient details and secrets. Keep each learned section to at most ${maxBullets} bullets. Write plain bullet points only, with no evidence/confidence tags or other metadata annotations. If no meaningful updates exist, respond exactly: No high-signal memory updates.`;
}

function loadState() {
  const fallback = { version: 1, lastRunAtMs: 0, turnsSinceLastRun: 0, lastTranscriptMtimeMs: null, lastProcessedGenerationId: null, trialStartedAtMs: null };
  if (!existsSync(STATE_PATH)) return fallback;
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    const p = JSON.parse(raw);
    if (p.version !== 1) return fallback;
    return {
      version: 1,
      lastRunAtMs: Number.isFinite(p.lastRunAtMs) ? p.lastRunAtMs : 0,
      turnsSinceLastRun: Number.isFinite(p.turnsSinceLastRun) && p.turnsSinceLastRun >= 0 ? p.turnsSinceLastRun : 0,
      lastTranscriptMtimeMs: Number.isFinite(p.lastTranscriptMtimeMs) ? p.lastTranscriptMtimeMs : null,
      lastProcessedGenerationId: typeof p.lastProcessedGenerationId === "string" ? p.lastProcessedGenerationId : null,
      trialStartedAtMs: Number.isFinite(p.trialStartedAtMs) ? p.trialStartedAtMs : null,
    };
  } catch {
    return fallback;
  }
}

function saveState(state) {
  const dir = dirname(STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function getTranscriptMtimeMs(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    return statSync(transcriptPath).mtimeMs;
  } catch {
    return null;
  }
}

async function main() {
  try {
    let input = {};
    const raw = await new Promise((res, rej) => {
      let s = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (c) => { s += c; });
      process.stdin.on("end", () => res(s));
      process.stdin.on("error", rej);
    });
    if (raw.trim()) input = JSON.parse(raw);

    const state = loadState();
    const generationId = input.generation_id ?? null;
    if (generationId && generationId === state.lastProcessedGenerationId) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }
    state.lastProcessedGenerationId = generationId;

    const status = input.status;
    const loopCount = input.loop_count ?? 0;
    const countedTurn = status === "completed" && loopCount === 0;
    const turnIncrement = countedTurn ? 1 : 0;
    const turnsSinceLastRun = state.turnsSinceLastRun + turnIncrement;
    const now = Date.now();

    const trialEnabled = parseBoolean(process.env.CONTINUAL_LEARNING_TRIAL_MODE || process.env.CONTINUOUS_LEARNING_TRIAL_MODE);
    if (trialEnabled && countedTurn && state.trialStartedAtMs === null) state.trialStartedAtMs = now;

    const trialDurationMinutes = parsePositiveInt(process.env.CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES || process.env.CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES, TRIAL_DEFAULT_DURATION_MINUTES);
    const trialMinTurns = parsePositiveInt(process.env.CONTINUAL_LEARNING_TRIAL_MIN_TURNS || process.env.CONTINUOUS_LEARNING_TRIAL_MIN_TURNS, TRIAL_DEFAULT_MIN_TURNS);
    const trialMinMinutes = parsePositiveInt(process.env.CONTINUAL_LEARNING_TRIAL_MIN_MINUTES || process.env.CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES, TRIAL_DEFAULT_MIN_MINUTES);
    const inTrialWindow = trialEnabled && state.trialStartedAtMs !== null && (now - state.trialStartedAtMs) < trialDurationMinutes * 60 * 1000;

    const minTurns = parsePositiveInt(process.env.CONTINUAL_LEARNING_MIN_TURNS || process.env.CONTINUOUS_LEARNING_MIN_TURNS, DEFAULT_MIN_TURNS);
    const minMinutes = parsePositiveInt(process.env.CONTINUAL_LEARNING_MIN_MINUTES || process.env.CONTINUOUS_LEARNING_MIN_MINUTES, DEFAULT_MIN_MINUTES);
    const effectiveMinTurns = inTrialWindow ? trialMinTurns : minTurns;
    const effectiveMinMinutes = inTrialWindow ? trialMinMinutes : minMinutes;
    const minutesSinceLastRun = state.lastRunAtMs > 0 ? Math.floor((now - state.lastRunAtMs) / 60000) : Infinity;
    const transcriptMtimeMs = getTranscriptMtimeMs(input.transcript_path);
    const hasTranscriptAdvanced = transcriptMtimeMs !== null && (state.lastTranscriptMtimeMs === null || transcriptMtimeMs > state.lastTranscriptMtimeMs);

    const shouldTrigger = countedTurn && turnsSinceLastRun >= effectiveMinTurns && minutesSinceLastRun >= effectiveMinMinutes && hasTranscriptAdvanced;

    if (shouldTrigger) {
      state.lastRunAtMs = now;
      state.turnsSinceLastRun = 0;
      state.lastTranscriptMtimeMs = transcriptMtimeMs;
      saveState(state);
      console.log(JSON.stringify({ followup_message: getFollowupMessage() }));
      process.exit(0);
    }

    state.turnsSinceLastRun = turnsSinceLastRun;
    saveState(state);
    console.log(JSON.stringify({}));
    process.exit(0);
  } catch (err) {
    console.error("[pn-continual-learning-stop]", err);
    console.log(JSON.stringify({}));
    process.exit(0);
  }
}

main();
