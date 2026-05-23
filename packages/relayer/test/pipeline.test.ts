/**
 * Pipeline orchestration tests covering the L1 -> L2 -> L3 funnel and
 * the escalation rules from Requirement 11.6.
 */

import {strict as assert} from "node:assert";
import {test} from "node:test";

import type {DataRequirementV1, UnsignedProofV1} from "@questlens/schemas";

import {buildSignedProofForTest, runPipeline} from "../src/index.js";
import {runLayer2} from "../src/pipeline/layer2.js";
import {runLayer3} from "../src/pipeline/layer3.js";

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

const validUnsigned: UnsignedProofV1 = {
  schemaVersion: "1.0",
  taskId: "1",
  imageHash: ("0x" + "9".repeat(64)) as `0x${string}`,
  capturedLatitude: TASK_LAT,
  capturedLongitude: TASK_LON,
  capturedTimestamp: TASK_TS,
  platformAttestation: "DEMO_OK_DEVICE",
  hardwareAttestationType: "android-keystore",
};

test("happy path: L1 + L2 pass, settle without L3 (low-value bounty)", async () => {
  const {proof} = buildSignedProofForTest(validUnsigned);
  const result = await runPipeline(
    {proof, dataRequirement, now: TASK_TS, taskBudget: 1_000_000n}, // exactly 1.0 USDT, NOT > threshold
    {imageBytes: new Uint8Array([1, 2, 3])},
  );
  assert.deepEqual(result.layersRun, [1, 2]);
  assert.equal(result.verdict.ok, true);
});

test("high-value bounty (> 1 USDT) forces L3 to run even when L2 passes cleanly", async () => {
  const {proof} = buildSignedProofForTest(validUnsigned);
  const result = await runPipeline(
    {proof, dataRequirement, now: TASK_TS, taskBudget: 1_500_000n},
    {imageBytes: new Uint8Array([1, 2, 3])},
  );
  assert.deepEqual(result.layersRun, [1, 2, 3]);
  assert.equal(result.verdict.ok, true);
});

test("L1 rejection short-circuits and never invokes L2", async () => {
  const tampered = buildSignedProofForTest(validUnsigned);
  const badProof = {
    ...tampered.proof,
    hardwareSignature: ("0x" + "0".repeat(tampered.proof.hardwareSignature.length - 2)) as `0x${string}`,
  };
  const result = await runPipeline(
    {proof: badProof, dataRequirement, now: TASK_TS, taskBudget: 500_000n},
    {imageBytes: new Uint8Array([1, 2, 3])},
  );
  assert.deepEqual(result.layersRun, [1]);
  assert.equal(result.verdict.ok, false);
});

test("L2 borderline confidence escalates to L3", async () => {
  const out = await runLayer2({
    imageBytes: new Uint8Array([1]),
    targetCategory: "storefront",
    forceConfidence: 0.5,
  });
  assert.equal(out.escalate, true);
  assert.equal(out.verdict.ok, true);
});

test("L2 confidence < 0.3 rejects with slashable IRRELEVANT_CONTENT", async () => {
  const out = await runLayer2({
    imageBytes: new Uint8Array([1]),
    targetCategory: "storefront",
    forceConfidence: 0.1,
  });
  assert.equal(out.verdict.ok, false);
  if (!out.verdict.ok) {
    assert.equal(out.verdict.reason, "IRRELEVANT_CONTENT");
    assert.equal(out.verdict.slashable, true);
  }
});

test("L3 ELA fraud >= 0.85 rejects with slashable IMAGE_TAMPERED", async () => {
  const out = await runLayer3({imageBytes: new Uint8Array([1]), forceFailure: "ela", forceFraudConfidence: 0.9});
  assert.equal(out.verdict.ok, false);
  if (!out.verdict.ok) {
    assert.equal(out.verdict.reason, "IMAGE_TAMPERED");
    assert.equal(out.verdict.slashable, true);
  }
});

test("L3 moiré fraud rejects as SCREEN_REPHOTOGRAPHY", async () => {
  const out = await runLayer3({imageBytes: new Uint8Array([1]), forceFailure: "moire"});
  assert.equal(out.verdict.ok, false);
  if (!out.verdict.ok) {
    assert.equal(out.verdict.reason, "SCREEN_REPHOTOGRAPHY");
  }
});

test("L3 AIGC fraud rejects as AI_GENERATED", async () => {
  const out = await runLayer3({imageBytes: new Uint8Array([1]), forceFailure: "aigc"});
  assert.equal(out.verdict.ok, false);
  if (!out.verdict.ok) {
    assert.equal(out.verdict.reason, "AI_GENERATED");
  }
});

test("L3 cost is capped at 0.10 USDT (100_000 smallest units)", async () => {
  const out = await runLayer3({imageBytes: new Uint8Array([1])});
  assert.equal(out.costUnits, 100_000n);
});
