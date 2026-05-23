/**
 * RFC 8785 (JSON Canonicalization Scheme) plus keccak256 utilities for QuestLens.
 *
 * Used to derive the on-chain commitment hash for both DataRequirement and the
 * unsigned portion of a Proof, ensuring any conforming implementation reaches
 * the same hash for the same logical input.
 */

import canonicalizeModule from "canonicalize";
import {keccak256, toUtf8Bytes} from "ethers";

import {dataRequirementSchema, type DataRequirementV1} from "./dataRequirement.js";
import {proofSchema, type ProofV1, type UnsignedProofV1} from "./proof.js";
import {makeAjv} from "./validator.js";

// canonicalize ships as a CommonJS module; the function is the default export.
const canonicalize = canonicalizeModule as unknown as (value: unknown) => string | undefined;

const ajv = makeAjv();
const validateDataRequirement = ajv.compile<DataRequirementV1>(dataRequirementSchema);
const validateProof = ajv.compile<ProofV1>(proofSchema);

export class SchemaValidationError extends Error {
  constructor(
    public readonly schema: string,
    public readonly errors: unknown,
  ) {
    super(`Schema validation failed for ${schema}`);
    this.name = "SchemaValidationError";
  }
}

/**
 * Canonicalize a JSON-serializable value per RFC 8785 and return the UTF-8 bytes.
 * Throws if the input contains values JCS cannot represent (e.g. NaN, BigInt).
 */
export function canonicalBytes(value: unknown): Uint8Array {
  const canonical = canonicalize(value);
  if (canonical === undefined) {
    throw new Error("Value cannot be canonicalized (likely contains undefined or non-JSON values)");
  }
  return toUtf8Bytes(canonical);
}

/**
 * Validate a DataRequirement, then return its keccak256 hash and canonical form.
 * The hash is what callers pass to TaskEscrow.createTask.
 */
export function hashDataRequirement(
  dr: DataRequirementV1,
): {hash: `0x${string}`; canonical: string} {
  if (!validateDataRequirement(dr)) {
    throw new SchemaValidationError("DataRequirement v1", validateDataRequirement.errors);
  }
  // Window ordering and category coherence are enforced as semantic checks.
  if (Date.parse(dr.timeWindowEnd) <= Date.parse(dr.timeWindowStart)) {
    throw new Error("timeWindowEnd must be strictly after timeWindowStart");
  }
  const canonical = canonicalize(dr);
  if (canonical === undefined) throw new Error("Failed to canonicalize DataRequirement");
  return {hash: keccak256(toUtf8Bytes(canonical)) as `0x${string}`, canonical};
}

/**
 * Hash the unsigned portion of a Proof - this is the digest the device's
 * hardware secure element signs.
 */
export function hashUnsignedProof(unsigned: UnsignedProofV1): {
  hash: `0x${string}`;
  canonical: string;
} {
  const canonical = canonicalize(unsigned);
  if (canonical === undefined) throw new Error("Failed to canonicalize unsigned Proof");
  return {hash: keccak256(toUtf8Bytes(canonical)) as `0x${string}`, canonical};
}

/** Validate a fully assembled Proof against the v1 schema. */
export function validateProofV1(proof: unknown): asserts proof is ProofV1 {
  if (!validateProof(proof)) {
    throw new SchemaValidationError("Proof v1", validateProof.errors);
  }
}
