/**
 * Demo Day golden path orchestrator.
 *
 * Validates Requirement 18 (the hackathon golden path):
 *   1. Requester creates task on TaskEscrow (1 USDT lock)
 *   2. Worker stakes 0.1 USDT and accepts the task
 *   3. Worker captures a photo, builds a Proof, posts to the Relayer
 *   4. Relayer runs the verification pipeline + calls submitProof on-chain
 *   5. UI subscribes to the Settled event and displays the tx hash
 */

import {JsonRpcProvider, Wallet} from "ethers";

import type {DataRequirementV1} from "@questlens/schemas";
import {QuestLensClient} from "@questlens/sdk";

import type {DemoConfig} from "./config.js";
import {captureDemoImage} from "./captureImage.js";
import {buildBrowserProof} from "./browserProof.js";
import {submitToRelayer, type RelayerResponse} from "./relayerClient.js";

export type StepKey = "create" | "stake" | "capture" | "verify" | "settle";

export interface StepUpdate {
  step: StepKey;
  state: "active" | "done" | "failed";
  detail?: string;
}

export interface RunResult {
  taskId: bigint;
  createTxHash: string;
  stakeTxHash: string;
  relayer: RelayerResponse;
  totalMs: number;
}

export type ProgressFn = (update: StepUpdate) => void;

export interface RunOptions {
  config: DemoConfig;
  onProgress: ProgressFn;
  log: (line: string, level?: "info" | "warn" | "fail" | "ok") => void;
  /** Optional: force the worker to capture from a non-target location to demo
   *  the Layer 1 GPS rejection path during failure-injection rehearsal. */
  forceFailure?: "gps" | "emulator";
}

export async function runGoldenPath(opts: RunOptions): Promise<RunResult> {
  const {config, onProgress, log} = opts;
  const t0 = performance.now();

  const provider = new JsonRpcProvider(config.rpcUrl);
  const requester = new Wallet(config.requesterPrivateKey, provider);
  const worker = new Wallet(config.workerPrivateKey, provider);

  log(`Connected to ${config.rpcUrl}`);
  log(`Requester: ${requester.address}`);
  log(`Worker:    ${worker.address}`);

  const dataRequirement: DataRequirementV1 = {
    schemaVersion: "1.0",
    targetLatitude: config.targetLatitude,
    targetLongitude: config.targetLongitude,
    radiusMeters: 100,
    timeWindowStart: new Date(Date.now() - 60_000).toISOString(),
    timeWindowEnd: new Date(Date.now() + 24 * 3600_000).toISOString(),
    targetCategory: config.targetCategory as DataRequirementV1["targetCategory"],
  };

  // Step 1: Requester creates task.
  onProgress({step: "create", state: "active"});
  const requesterClient = new QuestLensClient({taskEscrow: config.taskEscrowAddress, signer: requester});
  let createResult;
  try {
    createResult = await requesterClient.createTask({
      budget: config.bountyAmount,
      stablecoin: config.mockUsdtAddress,
      dataRequirement,
    });
  } catch (err) {
    onProgress({step: "create", state: "failed", detail: errMsg(err)});
    log(`createTask failed: ${errMsg(err)}`, "fail");
    throw err;
  }
  const taskId = createResult.taskId;
  log(`TaskCreated id=${taskId} tx=${createResult.txHash}`, "ok");
  onProgress({step: "create", state: "done", detail: `task #${taskId} - tx ${shortHash(createResult.txHash)}`});

  // Step 2: Worker stakes.
  onProgress({step: "stake", state: "active"});
  const workerClient = new QuestLensClient({taskEscrow: config.taskEscrowAddress, signer: worker});
  let stakeResult;
  try {
    stakeResult = await workerClient.stakeForTask({
      taskId,
      stablecoin: config.mockUsdtAddress,
      stakeAmount: config.workerStakeAmount,
    });
  } catch (err) {
    onProgress({step: "stake", state: "failed", detail: errMsg(err)});
    log(`stakeForTask failed: ${errMsg(err)}`, "fail");
    throw err;
  }
  log(`Worker staked 0.1 mUSDT, tx=${stakeResult.txHash}`, "ok");
  onProgress({step: "stake", state: "done", detail: `tx ${shortHash(stakeResult.txHash)}`});

  // Step 3: Worker captures photo and builds Proof.
  onProgress({step: "capture", state: "active"});
  const imageBlob = await captureDemoImage();
  log(`Captured image: ${imageBlob.size} bytes (${imageBlob.type})`);
  const lat = opts.forceFailure === "gps" ? config.targetLatitude + 0.05 : config.targetLatitude;
  const lon = config.targetLongitude;
  const platformAttestation =
    opts.forceFailure === "emulator" ? "FAIL_EMULATOR_DEMO" : "DEMO_OK_DEVICE";
  const {proof, imageBytes} = await buildBrowserProof({
    taskId,
    imageBlob,
    capturedLatitude: lat,
    capturedLongitude: lon,
    platformAttestation,
  });
  log(`Built signed Proof (sig ${shortHash(proof.hardwareSignature)})`, "ok");
  onProgress({step: "capture", state: "done", detail: `imageHash ${shortHash(proof.imageHash)}`});

  // Step 4 + 5: Submit to Relayer (which runs the pipeline AND submits on-chain).
  onProgress({step: "verify", state: "active"});
  let relayerResult: RelayerResponse;
  try {
    relayerResult = await submitToRelayer(config.relayerUrl, proof, dataRequirement, imageBytes);
  } catch (err) {
    onProgress({step: "verify", state: "failed", detail: errMsg(err)});
    log(`Relayer call failed: ${errMsg(err)}`, "fail");
    throw err;
  }
  const v = relayerResult.verdict;
  log(`Pipeline trace: ${relayerResult.layersRun.join(" -> ")}; verdict ${v.ok ? "OK" : v.reason}`, v.ok ? "ok" : "warn");
  if (v.ok) {
    onProgress({step: "verify", state: "done", detail: `L${v.layer} OK (${relayerResult.layersRun.join("→")})`});
    onProgress({
      step: "settle",
      state: "done",
      detail: relayerResult.txHash ? `tx ${shortHash(relayerResult.txHash)}` : relayerResult.action,
    });
    log(`Settled tx=${relayerResult.txHash}`, "ok");
  } else {
    onProgress({
      step: "verify",
      state: "failed",
      detail: `L${v.layer} ${v.reason}${v.slashable ? " (slashed)" : " (no slash)"}`,
    });
    onProgress({
      step: "settle",
      state: "failed",
      detail: relayerResult.action === "slashWorker" ? `slashWorker ${shortHash(relayerResult.txHash ?? "")}` : "no settlement",
    });
    log(`Verification rejected at L${v.layer}: ${v.reason}`, "fail");
  }

  const totalMs = Math.round(performance.now() - t0);
  log(`Total elapsed: ${totalMs}ms`, "ok");
  return {
    taskId,
    createTxHash: createResult.txHash,
    stakeTxHash: stakeResult.txHash,
    relayer: relayerResult,
    totalMs,
  };
}

function shortHash(s: string): string {
  if (!s) return "-";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
