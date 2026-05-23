export {
  DATA_REQUIREMENT_SCHEMA_URL,
  dataRequirementSchema,
  type DataRequirementV1,
  type TargetCategory,
} from "./dataRequirement.js";

export {
  PROOF_SCHEMA_URL,
  proofSchema,
  type HardwareAttestationType,
  type ProofV1,
  type UnsignedProofV1,
} from "./proof.js";

export {
  SchemaValidationError,
  canonicalBytes,
  hashDataRequirement,
  hashUnsignedProof,
  validateProofV1,
} from "./canonicalize.js";

export {makeAjv} from "./validator.js";
