/**
 * Verification pipeline types shared across L1, L2, L3.
 * Validates Requirement 11 from the spec.
 */

import type {DataRequirementV1, ProofV1} from "@questlens/schemas";

/**
 * Reason codes returned by each pipeline layer. Mirrored in the design doc's
 * Error Handling table and the Worker_Client error message map.
 */
export type ReasonCode =
  | "OK"
  // L1 (no slash, return stake)
  | "INVALID_SIG"
  | "TIMESTAMP_DRIFT"
  | "GPS_OUT_OF_RANGE"
  | "PLATFORM_ATTEST_FAIL"
  | "MOCK_LOCATION"
  | "DEVICE_UNSUPPORTED"
  // L2 (slash on rejection)
  | "IRRELEVANT_CONTENT"
  | "L2_TIMEOUT"
  // L3 (slash on rejection)
  | "IMAGE_TAMPERED"
  | "SCREEN_REPHOTOGRAPHY"
  | "AI_GENERATED";

export type LayerVerdict =
  | {ok: true; layer: 1 | 2 | 3; reason: "OK"; details?: Record<string, unknown>}
  | {
      ok: false;
      layer: 1 | 2 | 3;
      reason: ReasonCode;
      slashable: boolean;
      details?: Record<string, unknown>;
    };

export interface PipelineInput {
  proof: ProofV1;
  dataRequirement: DataRequirementV1;
  /** Now-timestamp in ms used for clock drift checks. Injected for testability. */
  now?: number;
  /** When set, escalates Layer 3 even if escalation rules are not met. */
  forceLayer3?: boolean;
  /** Task bounty (smallest unit of stablecoin) used for Layer 3 trigger rules. */
  taskBudget?: bigint;
}

export interface PipelineResult {
  verdict: LayerVerdict;
  layersRun: Array<1 | 2 | 3>;
  /** Per-layer sub-verdicts for audit logs and telemetry. */
  trace: LayerVerdict[];
}
