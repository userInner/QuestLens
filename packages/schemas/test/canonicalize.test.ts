import {strict as assert} from "node:assert";
import {test, describe} from "node:test";

import {
  hashDataRequirement,
  hashUnsignedProof,
  type DataRequirementV1,
  type UnsignedProofV1,
  SchemaValidationError,
  validateProofV1,
} from "../src/index.js";

const sampleDataRequirement = (overrides: Partial<DataRequirementV1> = {}): DataRequirementV1 => ({
  schemaVersion: "1.0",
  targetLatitude: 31.230416,
  targetLongitude: 121.473701,
  radiusMeters: 50,
  timeWindowStart: "2026-05-25T00:00:00Z",
  timeWindowEnd: "2026-05-26T00:00:00Z",
  targetCategory: "storefront",
  ...overrides,
});

describe("hashDataRequirement", () => {
  test("returns deterministic hash for same logical input regardless of key order", () => {
    const a = sampleDataRequirement();
    const b: DataRequirementV1 = {
      // intentionally reordered keys
      timeWindowEnd: "2026-05-26T00:00:00Z",
      targetCategory: "storefront",
      timeWindowStart: "2026-05-25T00:00:00Z",
      radiusMeters: 50,
      targetLongitude: 121.473701,
      targetLatitude: 31.230416,
      schemaVersion: "1.0",
    };
    assert.equal(hashDataRequirement(a).hash, hashDataRequirement(b).hash);
  });

  test("rejects schema-violating input", () => {
    assert.throws(
      () => hashDataRequirement({...sampleDataRequirement(), radiusMeters: 1000} as DataRequirementV1),
      (err: unknown) => err instanceof SchemaValidationError,
    );
  });

  test("rejects inverted time window", () => {
    assert.throws(
      () =>
        hashDataRequirement(
          sampleDataRequirement({
            timeWindowStart: "2026-05-26T00:00:00Z",
            timeWindowEnd: "2026-05-25T00:00:00Z",
          }),
        ),
      /timeWindowEnd must be strictly after/,
    );
  });

  test("hash is a 32-byte hex string with 0x prefix", () => {
    const {hash} = hashDataRequirement(sampleDataRequirement());
    assert.match(hash, /^0x[0-9a-f]{64}$/);
  });
});

describe("hashUnsignedProof", () => {
  const sampleUnsigned = (): UnsignedProofV1 => ({
    schemaVersion: "1.0",
    taskId: "42",
    imageHash: "0x9f2a000000000000000000000000000000000000000000000000000000000000c41b" as `0x${string}`,
    capturedLatitude: 31.230416,
    capturedLongitude: 121.473701,
    capturedTimestamp: 1748016000000,
    platformAttestation: "PLAY_INTEGRITY_TOKEN",
    hardwareAttestationType: "android-keystore",
  });

  test("returns deterministic hash", () => {
    const a = hashUnsignedProof(sampleUnsigned());
    const b = hashUnsignedProof(sampleUnsigned());
    assert.equal(a.hash, b.hash);
  });

  test("hash differs when any field changes", () => {
    const base = sampleUnsigned();
    const changed = {...base, capturedTimestamp: base.capturedTimestamp + 1};
    assert.notEqual(hashUnsignedProof(base).hash, hashUnsignedProof(changed).hash);
  });
});

describe("validateProofV1", () => {
  test("accepts a fully formed proof", () => {
    const sigHex = "0x" + "ab".repeat(72);
    const pubHex = "0x" + "cd".repeat(64);
    const proof = {
      schemaVersion: "1.0",
      taskId: "42",
      imageHash: ("0x" + "9".repeat(64)) as `0x${string}`,
      capturedLatitude: 31.23,
      capturedLongitude: 121.47,
      capturedTimestamp: 1748016000000,
      platformAttestation: "T",
      hardwareAttestationType: "android-keystore" as const,
      hardwareSignature: sigHex as `0x${string}`,
      publicKey: pubHex as `0x${string}`,
    };
    assert.doesNotThrow(() => validateProofV1(proof));
  });

  test("rejects proof with bad imageHash format", () => {
    const sigHex = "0x" + "ab".repeat(72);
    const pubHex = "0x" + "cd".repeat(64);
    const bad = {
      schemaVersion: "1.0",
      taskId: "42",
      imageHash: "not-a-hash",
      capturedLatitude: 31.23,
      capturedLongitude: 121.47,
      capturedTimestamp: 1748016000000,
      platformAttestation: "T",
      hardwareAttestationType: "android-keystore",
      hardwareSignature: sigHex,
      publicKey: pubHex,
    };
    assert.throws(() => validateProofV1(bad), (err: unknown) => err instanceof SchemaValidationError);
  });
});
