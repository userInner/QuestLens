/**
 * Relayer Node - Phase 1 demo entrypoint.
 *
 * Listens on POST /ingest for a multipart payload (Proof JSON + image bytes),
 * runs the verification pipeline, and calls submitProof or slashWorker on
 * the on-chain TaskEscrow.
 *
 * For the hackathon this runs WITHOUT SGX behind a `MOCK_ATTESTATION=true`
 * flag. Production deployment is task 7.3 [P1] (move into Azure Confidential
 * Computing, publish real SGX quotes).
 */

/* eslint-disable no-console */
import {readFileSync, writeFileSync, mkdirSync, existsSync} from "node:fs";
import {dirname, join} from "node:path";

import multipart from "@fastify/multipart";
import {Contract, JsonRpcProvider, Wallet} from "ethers";
import Fastify from "fastify";

import {validateProofV1, hashDataRequirement, type DataRequirementV1, type ProofV1} from "@questlens/schemas";

import {runPipeline} from "../pipeline/index.js";

interface RelayerEnv {
  rpcUrl: string;
  taskEscrowAddress: string;
  relayerPrivateKey: string;
  port: number;
  storageDir: string;
  mockAttestation: boolean;
}

interface IngestRequestBody {
  proof: ProofV1;
  dataRequirement: DataRequirementV1;
  imageBase64: string;
}

const TASK_ESCROW_ABI: readonly string[] = [
  "function submitProof(uint256 taskId, address worker, bytes32 imageHash, bytes32 verdictReason)",
  "function slashWorker(uint256 taskId, address worker, bytes32 reasonCode)",
  "function tasks(uint256 taskId) view returns (tuple(address requester, address worker, address stablecoin, uint128 budget, uint128 workerStake, bytes32 dataRequirement, uint64 createdAt, uint64 acceptedAt, uint64 challengeUntil, uint8 status))",
];

function loadEnv(): RelayerEnv {
  const env = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`Missing env var ${k}`);
    return v;
  };
  return {
    rpcUrl: env("INJECTIVE_TESTNET_RPC"),
    taskEscrowAddress: env("TASK_ESCROW_ADDRESS"),
    relayerPrivateKey: env("RELAYER_PRIVATE_KEY"),
    port: Number(process.env["PORT"] ?? 3000),
    storageDir: process.env["RELAYER_STORAGE_DIR"] ?? "./.relayer-storage",
    mockAttestation: process.env["MOCK_ATTESTATION"] === "true",
  };
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.mockAttestation) {
    console.warn(
      "[relayer] WARNING: MOCK_ATTESTATION is not set. Phase 1 production requires SGX (task 7.3). Aborting.",
    );
    process.exit(1);
  }
  if (!existsSync(env.storageDir)) {
    mkdirSync(env.storageDir, {recursive: true});
  }

  const provider = new JsonRpcProvider(env.rpcUrl);
  const wallet = new Wallet(env.relayerPrivateKey, provider);
  const taskEscrow = new Contract(
    env.taskEscrowAddress,
    TASK_ESCROW_ABI as readonly string[],
    wallet,
  );

  const app = Fastify({logger: {level: "info"}});
  await app.register(multipart, {limits: {fileSize: 10 * 1024 * 1024}});

  app.get("/health", async () => ({
    status: "ok",
    relayer: wallet.address,
    mockAttestation: env.mockAttestation,
  }));

  app.post<{Body: IngestRequestBody}>("/ingest", async (req, reply) => {
    const body = req.body;
    if (!body?.proof || !body?.dataRequirement || !body?.imageBase64) {
      return reply.code(400).send({error: "proof, dataRequirement, imageBase64 are required"});
    }

    // 1. Validate Proof shape and DataRequirement hash binding.
    try {
      validateProofV1(body.proof);
    } catch (err) {
      return reply.code(400).send({error: "Invalid Proof", detail: errMsg(err)});
    }
    let drHash: string;
    try {
      drHash = hashDataRequirement(body.dataRequirement).hash;
    } catch (err) {
      return reply.code(400).send({error: "Invalid DataRequirement", detail: errMsg(err)});
    }

    // 2. Confirm on-chain Task is in Accepted status and dataRequirement matches.
    const taskId = BigInt(body.proof.taskId);
    const task = await taskEscrow["tasks"]?.(taskId);
    if (!task) {
      return reply.code(500).send({error: "Failed to load task struct"});
    }
    const onchainDr = (task.dataRequirement ?? task[5]) as string;
    if (onchainDr.toLowerCase() !== drHash.toLowerCase()) {
      return reply.code(400).send({error: "DataRequirement hash mismatch", onchain: onchainDr, computed: drHash});
    }
    const status = Number(task.status ?? task[9]);
    if (status !== 2 /* Accepted */) {
      return reply.code(409).send({error: `Task ${taskId} is not in Accepted status`, status});
    }
    const onchainWorker = (task.worker ?? task[1]) as string;
    const taskBudget = BigInt(task.budget ?? task[3]);

    // 3. Persist Proof + image to durable storage (R12.5).
    const imageBytes = Buffer.from(body.imageBase64, "base64");
    const sha256Match = body.proof.imageHash.toLowerCase();
    const proofPath = join(env.storageDir, `${taskId}.proof.json`);
    const imagePath = join(env.storageDir, `${taskId}.image.bin`);
    writeFileSync(proofPath, JSON.stringify(body.proof, null, 2));
    writeFileSync(imagePath, imageBytes);

    // 4. Run the pipeline.
    const result = await runPipeline(
      {proof: body.proof, dataRequirement: body.dataRequirement, taskBudget},
      {imageBytes},
    );

    const txOpts: {imageHash: string; reason: string} = {
      imageHash: body.proof.imageHash,
      reason: result.verdict.ok ? "OK" : result.verdict.reason,
    };

    if (result.verdict.ok) {
      const tx = await (taskEscrow["submitProof"] as Function)(
        taskId,
        onchainWorker,
        body.proof.imageHash,
        toBytes32(txOpts.reason),
      );
      const receipt = await tx.wait();
      return reply.send({
        verdict: result.verdict,
        layersRun: result.layersRun,
        txHash: receipt?.hash,
        action: "submitProof",
      });
    }

    if ("slashable" in result.verdict && result.verdict.slashable) {
      const tx = await (taskEscrow["slashWorker"] as Function)(
        taskId,
        onchainWorker,
        toBytes32(result.verdict.reason),
      );
      const receipt = await tx.wait();
      return reply.send({
        verdict: result.verdict,
        layersRun: result.layersRun,
        txHash: receipt?.hash,
        action: "slashWorker",
      });
    }

    // L1 rejection: no on-chain action, return stake intact.
    return reply.send({
      verdict: result.verdict,
      layersRun: result.layersRun,
      action: "noop",
      message: "Layer 1 rejection - worker stake preserved, task remains Accepted",
    });
    // Note: keeping the task in Accepted means the requester can claimRefund
    // after the 1h submission deadline (R2.2). A future P1 enhancement is to
    // add a "release stake" path so the worker can retry without forfeiture.
  });

  await app.listen({port: env.port, host: "0.0.0.0"});
  console.log(
    `[relayer] listening on :${env.port}, taskEscrow=${env.taskEscrowAddress}, signer=${wallet.address}`,
  );
}

function toBytes32(s: string): string {
  const buf = Buffer.alloc(32);
  Buffer.from(s, "utf8").copy(buf);
  return "0x" + buf.toString("hex");
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

main().catch((err) => {
  console.error("[relayer] fatal", err);
  process.exit(1);
});

// Touch read once so unused imports flagged by tsc are kept. Will be removed
// when the queue persistence (P1) replaces the simple JSON file write.
void readFileSync;
