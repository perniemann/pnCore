/**
 * Auto-select helper for Best-of-N judge verdicts.
 *
 * Rules:
 *   - Single gate survivor  → auto_selected: true, no scores required
 *   - ≥2 scored survivors   → winner = top score;
 *                             auto_selected when (top - second) >= minDelta
 *                             else human_gate_required: true
 */

export const DEFAULT_AUTO_SELECT_MIN_DELTA = 0.15;

/**
 * @typedef {{ candidate_id: string, score: number }} LLMScore
 * @typedef {{ candidate_id: string, passed: boolean }} GateResult
 *
 * @param {{
 *   llm_scores?: LLMScore[],
 *   objective_gate_results?: GateResult[],
 *   minDelta?: number
 * }} opts
 * @returns {{
 *   winner_id: string,
 *   auto_selected: boolean,
 *   human_gate_required: boolean,
 *   score_delta: number | null,
 *   runner_up_id: string | null
 * }}
 */
export function resolveBestOfNSelection({
  llm_scores,
  objective_gate_results,
  minDelta = DEFAULT_AUTO_SELECT_MIN_DELTA,
}) {
  const survivors = objective_gate_results
    ? objective_gate_results.filter((r) => r.passed).map((r) => r.candidate_id)
    : null;

  if (survivors !== null && survivors.length === 1) {
    return {
      winner_id: survivors[0],
      auto_selected: true,
      human_gate_required: false,
      score_delta: null,
      runner_up_id: null,
    };
  }

  if (!llm_scores || llm_scores.length === 0) {
    throw new Error(
      "resolveBestOfNSelection: llm_scores required when survivors >= 2 or gates not provided"
    );
  }

  const scored = survivors
    ? llm_scores.filter((s) => survivors.includes(s.candidate_id))
    : [...llm_scores];

  if (scored.length === 0) {
    throw new Error("resolveBestOfNSelection: no scored survivors to rank");
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const runnerUp = sorted[1] ?? null;

  const delta = runnerUp !== null ? top.score - runnerUp.score : null;
  const autoSelected = delta === null || delta >= minDelta;

  return {
    winner_id: top.candidate_id,
    auto_selected: autoSelected,
    human_gate_required: !autoSelected,
    score_delta: delta,
    runner_up_id: runnerUp?.candidate_id ?? null,
  };
}
