/**
 * Test fixture: spawn anvil, deploy MockUSDT + ReputationRegistry + TaskEscrow,
 * and return ready-to-use ethers wallets pointed at the running chain.
 *
 * Used by SDK integration tests to verify the full createTask -> stake ->
 * submit flow against a real EVM, not a stub.
 */

import {spawn, type ChildProcess} from "node:child_process";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import {
  Contract,
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  type Interface,
} from "ethers";

const CONTRACTS_DIR = join(import.meta.dirname, "../../contracts");

// Anvil pre-funded accounts (deterministic).
const DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const REQUESTER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const WORKER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const RELAYER_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";

const TASK_ESCROW_PARAMETERS = {
  minBounty: 500_000n,
  maxBounty: 2_000_000n,
  workerStakeAmount: 100_000n,
  protocolFeeBps: 500,
  slashRewardPoolBps: 5000,
  slashTreasuryBps: 5000,
  taskTimeout: 72n * 3600n,
  submissionDeadline: 3600n,
  challengePeriod: 24n * 3600n,
  layer3CostCap: 100_000n,
};

interface Artifact {
  abi: Interface | readonly unknown[];
  bytecode: {object: string};
}

function readArtifact(file: string, contract: string): Artifact {
  const path = join(CONTRACTS_DIR, "out", file, `${contract}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Artifact;
}

export interface DeployedFixture {
  provider: JsonRpcProvider;
  taskEscrow: string;
  reputationRegistry: string;
  mockUsdt: string;
  deployer: Wallet;
  requester: Wallet;
  worker: Wallet;
  relayer: Wallet;
  stop: () => Promise<void>;
}

export async function startAnvilFixture(port = 8545): Promise<DeployedFixture> {
  const proc = spawn("anvil", ["--silent", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exited = false;
  proc.on("exit", () => {
    exited = true;
  });

  const stop = async () => {
    if (exited) return;
    proc.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 2000);
      proc.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  };

  try {
    await waitForAnvil(port, proc);
  } catch (err) {
    proc.kill("SIGKILL");
    throw err;
  }

  const provider = new JsonRpcProvider(`http://127.0.0.1:${port}`);
  const deployer = new Wallet(DEPLOYER_KEY, provider);
  const requester = new Wallet(REQUESTER_KEY, provider);
  const worker = new Wallet(WORKER_KEY, provider);
  const relayer = new Wallet(RELAYER_KEY, provider);

  // Deploy MockUSDT.
  const usdtArtifact = readArtifact("MockUSDT.sol", "MockUSDT");
  const usdtFactory = new ContractFactory(
    usdtArtifact.abi as readonly unknown[] as Interface,
    usdtArtifact.bytecode.object,
    deployer,
  );
  const usdt = await usdtFactory.deploy();
  await usdt.waitForDeployment();

  // Deploy ReputationRegistry(governance=deployer, minRelayerCollateral=0).
  const regArtifact = readArtifact("ReputationRegistry.sol", "ReputationRegistry");
  const regFactory = new ContractFactory(
    regArtifact.abi as readonly unknown[] as Interface,
    regArtifact.bytecode.object,
    deployer,
  );
  const registry = await regFactory.deploy(deployer.address, 0n);
  await registry.waitForDeployment();

  // Deploy TaskEscrow(registry, governance, treasury, rewardPool, params).
  const escrowArtifact = readArtifact("TaskEscrow.sol", "TaskEscrow");
  const escrowFactory = new ContractFactory(
    escrowArtifact.abi as readonly unknown[] as Interface,
    escrowArtifact.bytecode.object,
    deployer,
  );
  const params = [
    TASK_ESCROW_PARAMETERS.minBounty,
    TASK_ESCROW_PARAMETERS.maxBounty,
    TASK_ESCROW_PARAMETERS.workerStakeAmount,
    TASK_ESCROW_PARAMETERS.protocolFeeBps,
    TASK_ESCROW_PARAMETERS.slashRewardPoolBps,
    TASK_ESCROW_PARAMETERS.slashTreasuryBps,
    TASK_ESCROW_PARAMETERS.taskTimeout,
    TASK_ESCROW_PARAMETERS.submissionDeadline,
    TASK_ESCROW_PARAMETERS.challengePeriod,
    TASK_ESCROW_PARAMETERS.layer3CostCap,
  ];
  const escrow = await escrowFactory.deploy(
    await registry.getAddress(),
    deployer.address,
    deployer.address,
    deployer.address,
    params,
  );
  await escrow.waitForDeployment();

  // Wire registry -> escrow, bootstrap relayer, whitelist mUSDT.
  const registryWithSigner = new Contract(
    await registry.getAddress(),
    regArtifact.abi as readonly unknown[] as Interface,
    deployer,
  );
  await (await registryWithSigner.getFunction("setTaskEscrow")(await escrow.getAddress())).wait();
  await (
    await registryWithSigner.getFunction("bootstrapRelayer")(
      relayer.address,
      "https://relayer.questlens.io/attestation/latest.json",
    )
  ).wait();

  const escrowWithSigner = new Contract(
    await escrow.getAddress(),
    escrowArtifact.abi as readonly unknown[] as Interface,
    deployer,
  );
  await (await escrowWithSigner.getFunction("setStablecoinAllowed")(await usdt.getAddress(), true)).wait();

  // Mint mUSDT to requester and worker.
  const usdtWithSigner = new Contract(
    await usdt.getAddress(),
    usdtArtifact.abi as readonly unknown[] as Interface,
    deployer,
  );
  await (await usdtWithSigner.getFunction("mint")(requester.address, 10_000_000n)).wait();
  await (await usdtWithSigner.getFunction("mint")(worker.address, 10_000_000n)).wait();

  return {
    provider,
    taskEscrow: await escrow.getAddress(),
    reputationRegistry: await registry.getAddress(),
    mockUsdt: await usdt.getAddress(),
    deployer,
    requester,
    worker,
    relayer,
    stop,
  };
}

async function waitForAnvil(port: number, proc: ChildProcess): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const provider = new JsonRpcProvider(`http://127.0.0.1:${port}`);
      await provider.getBlockNumber();
      provider.destroy();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  proc.kill("SIGTERM");
  throw new Error("anvil did not become ready within 5 seconds");
}
