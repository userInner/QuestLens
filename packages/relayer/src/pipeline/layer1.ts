/**
 * Layer 1 - Device-Side Verification.
 *
 * Validates Requirement 11.2, 11.3 and Property 9 (determinism).
 *
 * - Verifies the Proof's hardware ECDSA-P256 signature over the canonicalized
 *   unsigned payload.
 * - Bounds capturedTimestamp drift to <= 120s vs the Relayer clock.
 * - Bounds GPS distance to <= min(200m, DataRequirement.radiusMeters).
 * - Stubs platform attestation parsing for the demo (real Play Integrity /
 *   DeviceCheck validation is a P1 task; the stub honors a documented
 *   "fail" marker so we can exercise the negative path in tests).
 *
 * Layer 1 failures are NEVER slashable per Requirement 11.3: the Worker's
 * stake is returned and the task reopens. Slashing is reserved for L2/L3.
 */

import {createPublicKey, createVerify, type KeyObject} from "node:crypto";

import {hashUnsignedProof, type ProofV1, type DataRequirementV1} from "@questlens/schemas";

import {haversineMeters} from "./geo.js";
import type {LayerVerdict, ReasonCode} from "./types.js";

const MAX_TIMESTAMP_DRIFT_MS = 120_000;
const MAX_GPS_DISTANCE_METERS = 200;

export interface Layer1Input {
  proof: ProofV1;
  dataRequirement: DataRequirementV1;
  /** Override Date.now() for deterministic tests. */
  now?: number;
}

export function runLayer1(input: Layer1Input): LayerVerdict {
  const {proof, dataRequirement} = input;
  const now = input.now ?? Date.now();

  // 1. Reject obviously unsupported attestation formats. We accept the three
  //    enums declared in the Proof schema; anything else is considered
  //    DEVICE_UNSUPPORTED so future hardware classes opt in via governance.
  if (
    proof.hardwareAttestationType !== "android-keystore" &&
    proof.hardwareAttestationType !== "ios-secure-enclave" &&
    proof.hardwareAttestationType !== "depin-tee-v1"
  ) {
    return reject("DEVICE_UNSUPPORTED", {hardwareAttestationType: proof.hardwareAttestationType});
  }

  // 2. Platform attestation token. Real Play Integrity / DeviceCheck verification
  //    is a P1 task. For the hackathon we honor two documented sentinel prefixes
  //    so unit tests and demo flows can exercise both paths deterministically.
  const platformVerdict = checkPlatformAttestationStub(proof.platformAttestation);
  if (!platformVerdict.ok) return platformVerdict;

  // 3. Hardware signature.
  const sigVerdict = verifyHardwareSignature(proof);
  if (!sigVerdict.ok) return sigVerdict;

  // 4. Timestamp drift.
  const drift = Math.abs(now - proof.capturedTimestamp);
  if (drift > MAX_TIMESTAMP_DRIFT_MS) {
    return reject("TIMESTAMP_DRIFT", {driftMs: drift, maxAllowedMs: MAX_TIMESTAMP_DRIFT_MS});
  }

  // 5. GPS distance.
  const distanceM = haversineMeters(
    proof.capturedLatitude,
    proof.capturedLongitude,
    dataRequirement.targetLatitude,
    dataRequirement.targetLongitude,
  );
  const allowed = Math.min(MAX_GPS_DISTANCE_METERS, dataRequirement.radiusMeters);
  if (distanceM > allowed) {
    return reject("GPS_OUT_OF_RANGE", {
      distanceM: Math.round(distanceM),
      allowedM: allowed,
    });
  }

  // 6. Time window from DataRequirement.
  const start = Date.parse(dataRequirement.timeWindowStart);
  const end = Date.parse(dataRequirement.timeWindowEnd);
  if (proof.capturedTimestamp < start || proof.capturedTimestamp > end) {
    return reject("TIMESTAMP_DRIFT", {
      capturedTimestamp: proof.capturedTimestamp,
      windowStart: start,
      windowEnd: end,
    });
  }

  return {ok: true, layer: 1, reason: "OK"};
}

function reject(reason: ReasonCode, details?: Record<string, unknown>): LayerVerdict {
  return details === undefined
    ? {ok: false, layer: 1, reason, slashable: false}
    : {ok: false, layer: 1, reason, slashable: false, details};
}

/**
 * Stub for platform attestation. Real implementation is a P1 task.
 *
 * Demo conventions for the hackathon:
 *   - Token starting with "FAIL_EMULATOR"     -> PLATFORM_ATTEST_FAIL (emulator)
 *   - Token starting with "FAIL_ROOT"         -> PLATFORM_ATTEST_FAIL (rooted)
 *   - Token starting with "FAIL_MOCK_GPS"     -> MOCK_LOCATION
 *   - Token starting with "DEMO_OK_"          -> pass (used in tests / demo)
 *
 * Anything else is rejected as DEVICE_UNSUPPORTED to fail closed by default.
 */
function checkPlatformAttestationStub(token: string): LayerVerdict {
  if (token.startsWith("FAIL_EMULATOR")) {
    return {ok: false, layer: 1, reason: "PLATFORM_ATTEST_FAIL", slashable: false, details: {kind: "emulator"}};
  }
  if (token.startsWith("FAIL_ROOT")) {
    return {ok: false, layer: 1, reason: "PLATFORM_ATTEST_FAIL", slashable: false, details: {kind: "rooted"}};
  }
  if (token.startsWith("FAIL_MOCK_GPS")) {
    return {ok: false, layer: 1, reason: "MOCK_LOCATION", slashable: false};
  }
  if (token.startsWith("DEMO_OK_")) {
    return {ok: true, layer: 1, reason: "OK"};
  }
  return {ok: false, layer: 1, reason: "DEVICE_UNSUPPORTED", slashable: false, details: {tokenPrefix: token.slice(0, 16)}};
}

/**
 * Verify ECDSA over secp256r1 (P-256) signature on the canonicalized unsigned proof.
 *
 * Accepts the publicKey as a 0x-prefixed uncompressed SEC1 point (0x04 || X || Y),
 * which is the format we document in the Proof Standard for Android Keystore /
 * iOS Secure Enclave keys.
 */
function verifyHardwareSignature(proof: ProofV1): LayerVerdict {
  const {hardwareSignature, publicKey} = proof;
  const unsigned = {
    schemaVersion: proof.schemaVersion,
    taskId: proof.taskId,
    imageHash: proof.imageHash,
    capturedLatitude: proof.capturedLatitude,
    capturedLongitude: proof.capturedLongitude,
    capturedTimestamp: proof.capturedTimestamp,
    platformAttestation: proof.platformAttestation,
    hardwareAttestationType: proof.hardwareAttestationType,
  };
  const {canonical} = hashUnsignedProof(unsigned);

  let key: KeyObject;
  try {
    key = importP256PublicKey(publicKey);
  } catch (err) {
    return {
      ok: false,
      layer: 1,
      reason: "INVALID_SIG",
      slashable: false,
      details: {phase: "publicKeyImport", message: errMsg(err)},
    };
  }

  let signatureBytes: Buffer;
  try {
    signatureBytes = hexToBuffer(hardwareSignature);
  } catch (err) {
    return {
      ok: false,
      layer: 1,
      reason: "INVALID_SIG",
      slashable: false,
      details: {phase: "signatureDecode", message: errMsg(err)},
    };
  }

  const verifier = createVerify("sha256");
  verifier.update(Buffer.from(canonical, "utf8"));
  verifier.end();

  // The signature is DER-encoded ECDSA. Node.js Verify.verify accepts DER by default.
  const valid = verifier.verify(key, signatureBytes);
  if (!valid) {
    return {ok: false, layer: 1, reason: "INVALID_SIG", slashable: false, details: {phase: "verify"}};
  }
  return {ok: true, layer: 1, reason: "OK"};
}

function importP256PublicKey(hex: string): KeyObject {
  const raw = hexToBuffer(hex);
  // SEC1 uncompressed point: 0x04 || X (32) || Y (32) = 65 bytes.
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error(`Expected SEC1 uncompressed P-256 point (65 bytes, 0x04 prefix), got ${raw.length} bytes`);
  }
  const x = raw.subarray(1, 33);
  const y = raw.subarray(33, 65);
  return createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: x.toString("base64url"),
      y: y.toString("base64url"),
    },
    format: "jwk",
  });
}

function hexToBuffer(hex: string): Buffer {
  if (!hex.startsWith("0x") || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: ${hex.slice(0, 16)}...`);
  }
  return Buffer.from(hex.slice(2), "hex");
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
