/**
 * Failure-injection smoke: a Worker submits a Proof from a location 5km away
 * from the task's target. Layer 1 must reject it with GPS_OUT_OF_RANGE,
 * the Relayer must NOT submit on-chain, and the worker stake stays locked.
 */

/* eslint-disable no-console */
import {JsonRpcProvider, Wallet} from "ethers";

import type {DataRequirementV1, ProofV1} from "@questlens/schemas";
import {QuestLensClient} from "@questlens/sdk";
import {buildSignedProofForTest} from "@questlens/relayer";

const RPC = process.env["RPC"] ?? "http://127.0.0.1:8545";
const TASK_ESCROW = process.env["TASK_ESCROW"] ?? "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const MOCK_USDT = process.env["MOCK_USDT"] ?? "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const RELAYER_URL = process.env["RELAYER_URL"] ?? "http://127.0.0.1:3000";

// Anvil deterministic accounts - publicly known test keys, NOT real secrets.
const REQUESTER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const WORKER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const TARGET_LAT = 31.230416;
const TARGET_LON = 121.473701;
const FAR_LAT = TARGET_LAT + 0.05; // ~5km north of target

async function main(): Promise<void> {
  const provider = new JsonRpcProvider(RPC);
  const requester = new Wallet(REQUESTER_KEY, provider);
  const worker = new Wallet(WORKER_KEY, provider);

  const dr: DataRequirementV1 = {
    schemaVersion: "1.0",
    targetLatitude: TARGET_LAT,
    targetLongitude: TARGET_LON,
    radiusMeters: 100,
    timeWindowStart: new Date(Date.now() - 60_000).toISOString(),
    timeWindowEnd: new Date(Date.now() + 24 * 3600_000).toISOString(),
    targetCategory: "storefront",
  };

  const requesterClient = new QuestLensClient({taskEscrow: TASK_ESCROW, signer: requester});
  const created = await requesterClient.createTask({budget: 1_000_000n, stablecoin: MOCK_USDT, dataRequirement: dr});
  console.log(`[fail] created task ${created.taskId}`);

  const workerClient = new QuestLensClient({taskEscrow: TASK_ESCROW, signer: worker});
  await workerClient.stakeForTask({taskId: created.taskId, stablecoin: MOCK_USDT, stakeAmount: 100_000n});
  console.log(`[fail] worker staked`);

  // Build a Proof claiming the worker is at the (far) location.
  const imageBytes = Buffer.from("fake-jpeg-bytes-far", "utf8");
  const {createHash} = await import("node:crypto");
  const imageHash = ("0x" + createHash("sha256").update(imageBytes).digest("hex")) as `0x${string}`;
  const {proof}: {proof: ProofV1} = buildSignedProofForTest({
    schemaVersion: "1.0",
    taskId: created.taskId.toString(),
    imageHash,
    capturedLatitude: FAR_LAT,
    capturedLongitude: TARGET_LON,
    capturedTimestamp: Date.now(),
    platformAttestation: "DEMO_OK_DEVICE",
    hardwareAttestationType: "android-keystore",
  });

  const res = await fetch(`${RELAYER_URL}/ingest`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({proof, dataRequirement: dr, imageBase64: imageBytes.toString("base64")}),
  });
  const body = await res.json();
  console.log("[fail] response:", JSON.stringify(body, null, 2));

  if (body.verdict?.ok) {
    console.error("[fail] FAIL: relayer let an out-of-range proof through");
    process.exit(1);
  }
  if (body.verdict?.reason !== "GPS_OUT_OF_RANGE") {
    console.error(`[fail] FAIL: expected GPS_OUT_OF_RANGE, got ${body.verdict?.reason}`);
    process.exit(1);
  }
  if (body.action !== "noop") {
    console.error(`[fail] FAIL: L1 rejection should be a noop on-chain (got ${body.action})`);
    process.exit(1);
  }
  console.log("[fail] OK - L1 correctly rejected the out-of-range proof, no slash, no settle");
}

main().catch((err) => {
  console.error("[fail] error:", err);
  process.exit(1);
});
