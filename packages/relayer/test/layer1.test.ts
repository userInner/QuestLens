/**
 * Layer 1 verification tests.
 *
 * Covers Requirement 11.2, 11.3 with positive and adversarial fixtures:
 *   - valid signature, correct GPS, fresh timestamp -> pass
 *   - tampered signature -> INVALID_SIG
 *   - >120s timestamp drift -> TIMESTAMP_DRIFT
 *   - GPS > 200m off -> GPS_OUT_OF_RANGE
 *   - emulator / rooted / mock-GPS attestation -> PLATFORM_ATTEST_FAIL / MOCK_LOCATION
 *   - unknown attestation type -> DEVICE_UNSUPPORTED
 *
 * All Layer 1 rejections must be non-slashable per Requirement 11.3.
 */

import {strict as assert} from "node:assert";
import {test} from "node:test";

import type {DataRequirementV1, UnsignedProofV1} from "@questlens/schemas";

import {runLayer1, buildSignedProofForTest} from "../src/index.js";

const TASK_LAT = 31.230416;
const TASK_LON = 121.473701;
const TASK_TS = Date.parse("2026-05-25T12:00:00Z");

const dataRequirement: DataRequirementV1 = {
  schemaVersion: "1.0",
  targetLatitude: TASK_LAT,
  targetLongitude: TASK_LON,
  radiusMeters: 100,
  timeWindowStart: "2026-05-25T00:00:00Z",
  timeWindowEnd: "2026-05-26T00:00:00Z",
  targetCategory: "storefront",
};

function unsignedProof(overrides: Partial<UnsignedProofV1> = {}): UnsignedProofV1 {
  return {
    schemaVersion: "1.0",
    taskId: "1",
    imageHash: ("0x" + "9".repeat(64)) as `0x${string}`,
    capturedLatitude: TASK_LAT,
    capturedLongitude: TASK_LON,
    capturedTimestamp: TASK_TS,
    platformAttestation: "DEMO_OK_DEVICE",
    hardwareAttestationType: "android-keystore",
    ...overrides,
  };
}

test("happy path: valid signature, GPS on target, fresh timestamp", () => {
  const {proof} = buildSignedProofForTest(unsignedProof());
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, true);
  assert.equal(verdict.layer, 1);
  assert.equal(verdict.reason, "OK");
});

test("rejects INVALID_SIG when signature is tampered", () => {
  const {proof} = buildSignedProofForTest(unsignedProof());
  const tampered = {
    ...proof,
    hardwareSignature: ("0x" + "0".repeat(proof.hardwareSignature.length - 2)) as `0x${string}`,
  };
  const verdict = runLayer1({proof: tampered, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "INVALID_SIG");
    assert.equal(verdict.slashable, false, "L1 rejections must never slash");
  }
});

test("rejects INVALID_SIG when payload is mutated post-signing", () => {
  // Sign one payload, then submit a different one with the same signature.
  const {proof} = buildSignedProofForTest(unsignedProof());
  const mutated = {...proof, capturedTimestamp: proof.capturedTimestamp + 1};
  const verdict = runLayer1({proof: mutated, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "INVALID_SIG");
  }
});

test("rejects TIMESTAMP_DRIFT when capturedTimestamp is >120s off relayer clock", () => {
  const driftedTs = TASK_TS;
  const {proof} = buildSignedProofForTest(unsignedProof({capturedTimestamp: driftedTs}));
  // Relayer clock is 5 minutes ahead of the device.
  const verdict = runLayer1({proof, dataRequirement, now: driftedTs + 5 * 60 * 1000});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "TIMESTAMP_DRIFT");
    assert.equal(verdict.slashable, false);
  }
});

test("rejects GPS_OUT_OF_RANGE when worker is >200m from target", () => {
  // ~1km north of the target.
  const farLat = TASK_LAT + 0.01;
  const {proof} = buildSignedProofForTest(unsignedProof({capturedLatitude: farLat}));
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "GPS_OUT_OF_RANGE");
  }
});

test("rejects PLATFORM_ATTEST_FAIL on emulator-flagged attestation", () => {
  const {proof} = buildSignedProofForTest(unsignedProof({platformAttestation: "FAIL_EMULATOR_SAMPLE"}));
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "PLATFORM_ATTEST_FAIL");
    assert.deepEqual(verdict.details?.kind, "emulator");
  }
});

test("rejects PLATFORM_ATTEST_FAIL on rooted-device attestation", () => {
  const {proof} = buildSignedProofForTest(unsignedProof({platformAttestation: "FAIL_ROOT_SAMPLE"}));
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "PLATFORM_ATTEST_FAIL");
    assert.deepEqual(verdict.details?.kind, "rooted");
  }
});

test("rejects MOCK_LOCATION when Fake-GPS is detected", () => {
  const {proof} = buildSignedProofForTest(unsignedProof({platformAttestation: "FAIL_MOCK_GPS_SAMPLE"}));
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "MOCK_LOCATION");
    assert.equal(verdict.slashable, false);
  }
});

test("rejects DEVICE_UNSUPPORTED when attestation token has unknown shape", () => {
  const {proof} = buildSignedProofForTest(unsignedProof({platformAttestation: "RANDOM_GIBBERISH"}));
  const verdict = runLayer1({proof, dataRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "DEVICE_UNSUPPORTED");
  }
});

test("respects DataRequirement.radiusMeters when smaller than 200m", () => {
  const tightRequirement: DataRequirementV1 = {...dataRequirement, radiusMeters: 50};
  // 80m off-target — within the 200m default but outside the 50m custom radius.
  const {proof} = buildSignedProofForTest(
    unsignedProof({capturedLatitude: TASK_LAT + 0.00072 /* ~80m */}),
  );
  const verdict = runLayer1({proof, dataRequirement: tightRequirement, now: TASK_TS});
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.reason, "GPS_OUT_OF_RANGE");
  }
});
