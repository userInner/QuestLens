/**
 * Proof v1 - Open Standard for QuestLens evidence bundles.
 *
 * Spec reference: Requirement 10 and design Component 4.
 * Public URL: https://schema.questlens.io/proof/v1.json
 */

export const PROOF_SCHEMA_URL = "https://schema.questlens.io/proof/v1.json";

export type HardwareAttestationType =
  | "android-keystore"
  | "ios-secure-enclave"
  | "depin-tee-v1";

/** The signed payload portion of a Proof, used as input to the hardware signature. */
export interface UnsignedProofV1 {
  schemaVersion: "1.0";
  taskId: string;
  imageHash: `0x${string}`;
  capturedLatitude: number;
  capturedLongitude: number;
  capturedTimestamp: number;
  platformAttestation: string;
  hardwareAttestationType: HardwareAttestationType;
}

export interface ProofV1 extends UnsignedProofV1 {
  hardwareSignature: `0x${string}`;
  publicKey: `0x${string}`;
}

export const proofSchema = {
  $id: PROOF_SCHEMA_URL,
  title: "QuestLens Proof v1",
  description: "Open standard for the evidence bundle a Worker_Client submits to a Relayer Node.",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "taskId",
    "imageHash",
    "capturedLatitude",
    "capturedLongitude",
    "capturedTimestamp",
    "platformAttestation",
    "hardwareAttestationType",
    "hardwareSignature",
    "publicKey",
  ],
  properties: {
    schemaVersion: {const: "1.0"},
    taskId: {type: "string", pattern: "^[0-9]+$"},
    imageHash: {type: "string", pattern: "^0x[0-9a-f]{64}$"},
    capturedLatitude: {type: "number", minimum: -90, maximum: 90},
    capturedLongitude: {type: "number", minimum: -180, maximum: 180},
    capturedTimestamp: {type: "integer", minimum: 0},
    platformAttestation: {type: "string", minLength: 1},
    hardwareAttestationType: {
      type: "string",
      enum: ["android-keystore", "ios-secure-enclave", "depin-tee-v1"],
    },
    hardwareSignature: {type: "string", pattern: "^0x[0-9a-f]{128,}$"},
    publicKey: {type: "string", pattern: "^0x[0-9a-f]{128,}$"},
  },
} as const;
