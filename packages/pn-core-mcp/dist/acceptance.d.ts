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
export declare function computeAcceptance(input: {
    phasesPassed: boolean;
    verifyEarned: boolean;
    humanEarned: boolean;
    accepted?: boolean;
    reasons?: string[];
    scope?: AcceptanceScope;
}): Acceptance;
