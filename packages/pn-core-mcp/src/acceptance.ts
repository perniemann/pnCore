/**
 * Earned acceptance: phasesPassed is not accepted.
 */

/**
 * Strongest evidence behind an acceptance, weakest first: source (code exists and was reviewed),
 * static (attested verify passed), runtime (exercised in a running environment), product
 * (accepted by a human against the goal). The server never widens a scope past its evidence;
 * it earns at most `static` today.
 */
export type AcceptanceScope = "source" | "static" | "runtime" | "product";

export type Acceptance = {
  phasesPassed: boolean;
  verifyEarned: boolean;
  humanEarned: boolean;
  accepted: boolean;
  reasons: string[];
  scope?: AcceptanceScope;
};

export function computeAcceptance(input: {
  phasesPassed: boolean;
  verifyEarned: boolean;
  humanEarned: boolean;
  accepted?: boolean;
  reasons?: string[];
  scope?: AcceptanceScope;
}): Acceptance {
  const reasons = [...(input.reasons ?? [])];
  const accepted =
    input.accepted ?? (input.phasesPassed && input.verifyEarned && input.humanEarned);
  if (!input.phasesPassed) reasons.push("phases_incomplete");
  if (!input.verifyEarned) reasons.push("verify_not_earned");
  if (!input.humanEarned) reasons.push("human_not_earned");
  if (!accepted && !reasons.includes("not_accepted")) reasons.push("not_accepted");
  return {
    phasesPassed: input.phasesPassed,
    verifyEarned: input.verifyEarned,
    humanEarned: input.humanEarned,
    accepted,
    reasons,
    ...(input.scope ? { scope: input.scope } : {}),
  };
}
