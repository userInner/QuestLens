/**
 * Layer 2 - Lightweight AI classification.
 *
 * Validates Requirement 11.4, 11.5.
 *
 * For the hackathon demo this is a stub that returns a fixed pass score for
 * any non-empty image bytes. The real ResNet-50 inference (task 6.2/6.3,
 * marked [P1]) plugs in here behind the same interface.
 *
 * Thresholds per Requirement 11.5:
 *   confidence >= 0.7  -> pass
 *   0.3 <= conf < 0.7 -> escalate to L3
 *   confidence < 0.3  -> reject and slash
 */

import type {LayerVerdict} from "./types.js";

export interface Layer2Input {
  imageBytes: Uint8Array;
  targetCategory: string;
  /** Optional override for tests / demo: forces a specific confidence value. */
  forceConfidence?: number;
}

export interface Layer2Output {
  verdict: LayerVerdict;
  confidence: number;
  /** Whether this submission should be escalated to Layer 3. */
  escalate: boolean;
}

const PASS_THRESHOLD = 0.7;
const REJECT_THRESHOLD = 0.3;

export async function runLayer2(input: Layer2Input): Promise<Layer2Output> {
  if (input.imageBytes.byteLength === 0) {
    return {
      verdict: {
        ok: false,
        layer: 2,
        reason: "IRRELEVANT_CONTENT",
        slashable: true,
        details: {reason: "empty image bytes"},
      },
      confidence: 0,
      escalate: false,
    };
  }

  // Stub: until the real model lands, we honor a forceConfidence hint for tests
  // and otherwise return a clearly-passing score so the Demo Day flow moves
  // forward. This is documented behavior, not silent magic.
  const confidence = clamp01(input.forceConfidence ?? 0.92);

  if (confidence >= PASS_THRESHOLD) {
    return {
      verdict: {ok: true, layer: 2, reason: "OK", details: {confidence, category: input.targetCategory}},
      confidence,
      escalate: false,
    };
  }
  if (confidence < REJECT_THRESHOLD) {
    return {
      verdict: {
        ok: false,
        layer: 2,
        reason: "IRRELEVANT_CONTENT",
        slashable: true,
        details: {confidence, category: input.targetCategory},
      },
      confidence,
      escalate: false,
    };
  }
  // borderline -> escalate
  return {
    verdict: {ok: true, layer: 2, reason: "OK", details: {confidence, category: input.targetCategory, borderline: true}},
    confidence,
    escalate: true,
  };
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
