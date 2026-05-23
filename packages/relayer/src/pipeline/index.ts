/**
 * Pipeline orchestrator. Validates Requirement 11.1 and 11.6 (escalation rules).
 *
 * Flow:
 *   L1 -> if reject (no slash) return.
 *   L2 -> reject(<0.3) slashes; pass(>=0.7) settles unless bounty/dispute force L3;
 *         borderline (0.3-0.7) escalates to L3.
 *   L3 -> reject (any score >= 0.85) slashes; otherwise settles.
 */

import type {DataRequirementV1, ProofV1} from "@questlens/schemas";

import {runLayer1} from "./layer1.js";
import {runLayer2} from "./layer2.js";
import {runLayer3} from "./layer3.js";
import type {LayerVerdict, PipelineInput, PipelineResult} from "./types.js";

const HIGH_VALUE_THRESHOLD = 1_000_000n; // > 1.0 USDT (6 decimals)

export interface RunPipelineDeps {
  imageBytes: Uint8Array;
}

export async function runPipeline(
  input: PipelineInput,
  deps: RunPipelineDeps,
): Promise<PipelineResult> {
  const trace: LayerVerdict[] = [];
  const layersRun: Array<1 | 2 | 3> = [];

  // ---- Layer 1 ----
  const l1 = runLayer1({proof: input.proof, dataRequirement: input.dataRequirement, ...(input.now !== undefined ? {now: input.now} : {})});
  layersRun.push(1);
  trace.push(l1);
  if (!l1.ok) {
    return {verdict: l1, layersRun, trace};
  }

  // ---- Layer 2 ----
  const l2 = await runLayer2({
    imageBytes: deps.imageBytes,
    targetCategory: input.dataRequirement.targetCategory,
  });
  layersRun.push(2);
  trace.push(l2.verdict);
  if (!l2.verdict.ok) {
    return {verdict: l2.verdict, layersRun, trace};
  }

  // ---- Layer 3 trigger rules (R11.6) ----
  const triggerL3 =
    l2.escalate ||
    input.forceLayer3 === true ||
    (input.taskBudget !== undefined && input.taskBudget > HIGH_VALUE_THRESHOLD);

  if (!triggerL3) {
    return {verdict: l2.verdict, layersRun, trace};
  }

  const l3 = await runLayer3({imageBytes: deps.imageBytes});
  layersRun.push(3);
  trace.push(l3.verdict);
  return {verdict: l3.verdict, layersRun, trace};
}

export {runLayer1} from "./layer1.js";
export {runLayer2} from "./layer2.js";
export {runLayer3} from "./layer3.js";
export {haversineMeters} from "./geo.js";
export type {LayerVerdict, PipelineInput, PipelineResult, ReasonCode} from "./types.js";
export type {ProofV1, DataRequirementV1};
