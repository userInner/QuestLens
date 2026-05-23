/**
 * Layer 3 - Deep Forensics (Azure ELA / moiré / AIGC).
 *
 * Validates Requirement 11.6, 11.7, 11.8.
 *
 * This is a placeholder for the demo. The real Azure adapter is task 6.4 [P1].
 * We mirror the pass/fail interface so the orchestrator can already wire L1->L2->L3
 * and demonstrate the funnel during the hackathon, with the real provider
 * swapped in post-demo.
 *
 * The placeholder returns a passing verdict by default. Tests can pass
 * `forceFraudConfidence` to exercise the rejection path.
 */

import type {LayerVerdict, ReasonCode} from "./types.js";

export interface Layer3Input {
  imageBytes: Uint8Array;
  /** Force a specific check to fail; used by tests and demo failure injection. */
  forceFailure?: "ela" | "moire" | "aigc";
  forceFraudConfidence?: number;
}

export interface Layer3Output {
  verdict: LayerVerdict;
  scores: {ela: number; moire: number; aigc: number};
  /** Cost in stablecoin smallest unit. Capped per Requirement 11.8. */
  costUnits: bigint;
}

const REJECT_THRESHOLD = 0.85;
const COST_CAP_UNITS = 100_000n; // 0.10 USDT (6 decimals)

export async function runLayer3(input: Layer3Input): Promise<Layer3Output> {
  const failureScore = clamp01(input.forceFraudConfidence ?? 0.95);
  const passScore = 0.2;

  const scores = {
    ela: input.forceFailure === "ela" ? failureScore : passScore,
    moire: input.forceFailure === "moire" ? failureScore : passScore,
    aigc: input.forceFailure === "aigc" ? failureScore : passScore,
  };
  const cost = COST_CAP_UNITS; // demo: assume worst-case spend so we honor the cap.

  const triggered = (
    Object.entries(scores) as Array<["ela" | "moire" | "aigc", number]>
  ).find(([, score]) => score >= REJECT_THRESHOLD);

  if (triggered) {
    const [check, score] = triggered;
    const reason: ReasonCode =
      check === "ela" ? "IMAGE_TAMPERED" : check === "moire" ? "SCREEN_REPHOTOGRAPHY" : "AI_GENERATED";
    return {
      verdict: {ok: false, layer: 3, reason, slashable: true, details: {check, score}},
      scores,
      costUnits: cost,
    };
  }

  return {
    verdict: {ok: true, layer: 3, reason: "OK", details: {scores}},
    scores,
    costUnits: cost,
  };
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
