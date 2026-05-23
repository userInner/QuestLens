/**
 * End-to-end smoke test for the Demo Day golden path.
 *
 * Assumes:
 *   - anvil is running on :8545
 *   - contracts are deployed (Deploy.s.sol broadcast)
 *   - relayer service is running on :3000
 *
 * Exits 0 on a clean settlement, non-zero otherwise.
 */

/* eslint-disable no-console */
import {JsonRpcProvider, Wallet} from "ethers";

import {hashUnsignedProof, type DataRequirementV1, type ProofV1} from "@questlens/schemas";
import {QuestLensClient} from "@questlens/sdk";
import {buildSignedProofForTest} from "@questlens/relayer";

const RPC = process.env["RPC"] ?? "http://127.0.0.1:8545";
const TASK_ESCROW = process.env["TASK_ESCROW"] ?? "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const MOCK_USDT = process.env["MOCK_USDT"] ?? "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const RELAYER_URL = process.env["RELAYER_URL"] ?? "http://127.0.0.1:3000";

// Anvil deterministic accounts
const REQUESTER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const WORKER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const TARGET_LAT = 31.230416;
const TARGET_LON = 121.473701;

void hashUnsignedProof; // imported for type-side reference

async function main(): Promise<void> {
  const t0 = Date.now();
  const provider = new JsonRpcProvider(RPC);
  const requester = new Wallet(REQUESTER_KEY, provider);
  const worker = new Wallet(WORKER_KEY, provider);
  console.log(`[smoke] requester=${requester.address} worker=${worker.address}`);

  // 1) createTask (SDK auto-approves the bounty allowance)
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
  const created = await requesterClient.createTask({
    budget: 1_000_000n,
    stablecoin: MOCK_USDT,
    dataRequirement: dr,
  });
  console.log(`[smoke] created task ${created.taskId} tx=${created.txHash}`);

  // 2) stakeForTask
  const workerClient = new QuestLensClient({taskEscrow: TASK_ESCROW, signer: worker});
  const staked = await workerClient.stakeForTask({
    taskId: created.taskId,
    stablecoin: MOCK_USDT,
    stakeAmount: 100_000n,
  });
  console.log(`[smoke] worker staked tx=${staked.txHash}`);

  // 3) Build a signed Proof (using Node-side helper for determinism).
  const imageBytes = Buffer.from("fake-jpeg-bytes-for-smoke", "utf8");
  const imageHash = ("0x" + (await sha256Hex(imageBytes))) as `0x${string}`;
  const {proof}: {proof: ProofV1} = buildSignedProofForTest({
    schemaVersion: "1.0",
    taskId: created.taskId.toString(),
    imageHash,
    capturedLatitude: TARGET_LAT,
    capturedLongitude: TARGET_LON,
    capturedTimestamp: Date.now(),
    platformAttestation: "DEMO_OK_DEVICE",
    hardwareAttestationType: "android-keystore",
  });
  console.log(`[smoke] signed proof: sig ${proof.hardwareSignature.slice(0, 16)}...`);

  // 4) POST to Relayer
  const res = await fetch(`${RELAYER_URL}/ingest`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      proof,
      dataRequirement: dr,
      imageBase64: imageBytes.toString("base64"),
    }),
  });
  const body = await res.json();
  console.log("[smoke] relayer response:", JSON.stringify(body, null, 2));
  if (!res.ok || !body.verdict?.ok) {
    console.error("[smoke] FAIL: relayer did not settle the task");
    process.exit(1);
  }

  console.log(`[smoke] OK total ${Date.now() - t0}ms`);
}

async function sha256Hex(buf: Buffer): Promise<string> {
  const {createHash} = await import("node:crypto");
  return createHash("sha256").update(buf).digest("hex");
}

main().catch((err) => {
  console.error("[smoke] error:", err);
  process.exit(1);
});
