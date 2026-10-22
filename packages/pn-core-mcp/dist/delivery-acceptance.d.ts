/**
 * Server-earned acceptance for full_dev step 6 (delivery ledger).
 *
 * Computed only when an attestation feature is on (disposeVerify or strictSkepticGates).
 * With both off the server has nothing it could have earned acceptance from, so it returns
 * "unearned" and writes no acceptance event, instead of marking every default run not_accepted.
 */
import { type Acceptance } from "./acceptance.js";
export declare function fullDevAcceptance(state: Record<string, unknown>): Acceptance | "unearned";
