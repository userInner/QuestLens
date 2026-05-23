import {
  Contract,
  EventLog,
  Interface,
  NonceManager,
  type Signer,
  type Provider,
  type ContractRunner,
  ZeroAddress,
} from "ethers";

import {
  hashDataRequirement,
  type DataRequirementV1,
} from "@questlens/schemas";

import {ERC20_MIN_ABI, TASK_ESCROW_ABI} from "./abi.js";
import {
  ContractRevertError,
  InsufficientBalanceError,
  InvalidParameterError,
  NetworkError,
  TaskNotSettledError,
} from "./errors.js";
import {
  TASK_STATUS_BY_INDEX,
  type CreateTaskOptions,
  type CreateTaskResult,
  type SettledResult,
  type TaskInfo,
  type TaskStatus,
} from "./types.js";

export interface QuestLensClientConfig {
  /** Address of the deployed TaskEscrow contract. */
  taskEscrow: string;
  /**
   * A wallet/signer used for state-changing calls. Must be compatible with
   * ethers v6 ContractRunner (works with EOAs, AA wallets, and any EIP-1193
   * provider wrapped by an ethers BrowserProvider).
   */
  signer?: Signer;
  /** Optional read-only provider. If `signer` is given, its provider is used. */
  provider?: Provider;
}

/**
 * Reference SDK client for QuestLens. Provides typed wrappers over TaskEscrow.
 * Validates Requirements 14.1-14.7. The protocol guarantees an equivalent
 * direct-ABI path exists (Requirement 14.8); this client is convenience only.
 */
export class QuestLensClient {
  private readonly taskEscrowAddress: string;
  private readonly runner: ContractRunner;
  private readonly contract: Contract;
  private readonly iface: Interface;

  constructor(cfg: QuestLensClientConfig) {
    if (!cfg.taskEscrow || cfg.taskEscrow === ZeroAddress) {
      throw new InvalidParameterError("taskEscrow address is required");
    }
    // Wrap any provided signer in NonceManager. ethers v6 plain Wallet does
    // not lock the nonce across rapid consecutive sends; without this, an
    // approve+createTask back-to-back can race and the second tx is sent with
    // a stale nonce. NonceManager is the official ethers fix for this.
    const wrappedSigner = cfg.signer ? new NonceManager(cfg.signer) : undefined;
    const runner = wrappedSigner ?? cfg.provider;
    if (!runner) {
      throw new InvalidParameterError("Either signer or provider must be provided");
    }
    this.taskEscrowAddress = cfg.taskEscrow;
    this.runner = runner;
    this.iface = new Interface(TASK_ESCROW_ABI);
    this.contract = new Contract(cfg.taskEscrow, TASK_ESCROW_ABI, runner);
  }

  // ---------------- mutating ----------------

  /** Create a new task on TaskEscrow. Validates and hashes the DataRequirement first. */
  async createTask(opts: CreateTaskOptions): Promise<CreateTaskResult> {
    if (opts.budget <= 0n) {
      throw new InvalidParameterError("budget must be > 0");
    }
    if (!opts.stablecoin || opts.stablecoin === ZeroAddress) {
      throw new InvalidParameterError("stablecoin address is required");
    }

    let dataRequirementHash: `0x${string}`;
    try {
      dataRequirementHash = hashDataRequirement(opts.dataRequirement).hash;
    } catch (err) {
      throw new InvalidParameterError(
        "DataRequirement failed schema validation",
        err,
      );
    }

    const signer = this.requireSigner();

    if (opts.autoApprove !== false) {
      await this.ensureAllowance(opts.stablecoin, this.taskEscrowAddress, opts.budget, signer);
    }

    let tx;
    try {
      tx = await this.contract
        .connect(signer)
        // ethers narrows Contract methods only after a populateTransaction step;
        // calling through the proxy works at runtime but TS sees `unknown`.
        // Use a typed cast to keep the call site readable.
        .getFunction("createTask")(opts.stablecoin, opts.budget, dataRequirementHash);
    } catch (err) {
      throw this.wrapTxError(err, "createTask");
    }

    const receipt = await tx.wait();
    if (!receipt) throw new NetworkError("createTask: no receipt");

    // Decode the TaskCreated event to read the assigned taskId.
    const taskId = this.findTaskCreatedTaskId(receipt.logs);
    if (taskId === null) {
      throw new ContractRevertError("createTask: TaskCreated event not emitted");
    }

    return {taskId, txHash: receipt.hash, dataRequirementHash};
  }

  /**
   * Stake on a task to become the assigned Worker. The signer must hold enough
   * stablecoin to cover the protocol's worker stake (0.1 USDT by default).
   *
   * Validates Requirement 3.
   */
  async stakeForTask(opts: {
    taskId: bigint;
    stablecoin: string;
    stakeAmount: bigint;
    autoApprove?: boolean;
  }): Promise<{txHash: string}> {
    const signer = this.requireSigner();
    if (opts.autoApprove !== false) {
      await this.ensureAllowance(opts.stablecoin, this.taskEscrowAddress, opts.stakeAmount, signer);
    }
    let tx;
    try {
      tx = await this.contract
        .connect(signer)
        .getFunction("stakeForTask")(opts.taskId);
    } catch (err) {
      throw this.wrapTxError(err, "stakeForTask");
    }
    const receipt = await tx.wait();
    if (!receipt) throw new NetworkError("stakeForTask: no receipt");
    return {txHash: receipt.hash};
  }

  // ---------------- read-only ----------------

  /** Look up the current status of a task. */
  async getTaskStatus(taskId: bigint): Promise<TaskStatus> {
    const info = await this.getTaskInfo(taskId);
    return info.status;
  }

  /** Read the full Task struct from the contract. */
  async getTaskInfo(taskId: bigint): Promise<TaskInfo> {
    let raw;
    try {
      raw = await this.contract.getFunction("tasks")(taskId);
    } catch (err) {
      throw new NetworkError(`Failed to read task ${taskId}`, err);
    }

    const statusIndex = Number(raw.status ?? raw[9]);
    const status = TASK_STATUS_BY_INDEX[statusIndex];
    if (!status) {
      throw new ContractRevertError(`Unknown task status index ${statusIndex}`);
    }

    return {
      taskId,
      status,
      requester: raw.requester ?? raw[0],
      worker: raw.worker ?? raw[1],
      stablecoin: raw.stablecoin ?? raw[2],
      budget: BigInt(raw.budget ?? raw[3]),
      workerStake: BigInt(raw.workerStake ?? raw[4]),
      dataRequirement: (raw.dataRequirement ?? raw[5]) as `0x${string}`,
      createdAt: Number(raw.createdAt ?? raw[6]),
      acceptedAt: Number(raw.acceptedAt ?? raw[7]),
      challengeUntil: Number(raw.challengeUntil ?? raw[8]),
    };
  }

  /**
   * Retrieve the verified result of a settled task. Rejects with
   * TaskNotSettledError if the task is not yet in the settled state.
   */
  async getTaskResult(taskId: bigint): Promise<SettledResult> {
    const info = await this.getTaskInfo(taskId);
    if (info.status !== "settled") {
      throw new TaskNotSettledError(taskId.toString(), info.status);
    }
    const provider = this.contract.runner?.provider;
    if (!provider) throw new NetworkError("Provider unavailable for log query");

    // Query the Settled event for this taskId. Scan from genesis if no hint;
    // for production usage, applications should supply an indexer or fromBlock.
    const settledFilter = this.contract.filters["Settled"];
    if (!settledFilter) {
      throw new ContractRevertError("Settled event filter not present in ABI");
    }
    const filter = settledFilter(taskId);
    const logs = await this.contract.queryFilter(filter);
    const last = logs[logs.length - 1];
    if (!last || !("args" in last)) {
      throw new ContractRevertError(`No Settled event found for task ${taskId}`);
    }
    const eventLog = last as EventLog;
    return {
      taskId,
      worker: eventLog.args[1] as string,
      paidToWorker: BigInt(eventLog.args[2]),
      protocolFee: BigInt(eventLog.args[3]),
      txHash: eventLog.transactionHash,
    };
  }

  // ---------------- helpers ----------------

  private requireSigner(): Signer {
    const runner = this.runner as Signer;
    if (typeof runner.sendTransaction !== "function") {
      throw new InvalidParameterError(
        "This operation requires a signer; only a provider was supplied",
      );
    }
    return runner;
  }

  private async ensureAllowance(
    token: string,
    spender: string,
    needed: bigint,
    signer: Signer,
  ): Promise<void> {
    const erc20 = new Contract(token, ERC20_MIN_ABI, signer);
    const owner = await signer.getAddress();
    let balance: bigint;
    let allowance: bigint;
    try {
      balance = BigInt(await erc20.getFunction("balanceOf")(owner));
      allowance = BigInt(await erc20.getFunction("allowance")(owner, spender));
    } catch (err) {
      throw new NetworkError("Failed to query stablecoin balance/allowance", err);
    }
    if (balance < needed) {
      throw new InsufficientBalanceError(
        `Stablecoin balance ${balance} < required ${needed}`,
      );
    }
    if (allowance < needed) {
      try {
        const approveTx = await erc20.getFunction("approve")(spender, needed);
        if (approveTx?.wait) {
          await approveTx.wait();
        }
      } catch (err) {
        throw this.wrapTxError(err, "approve");
      }
    }
  }

  private findTaskCreatedTaskId(logs: readonly {topics: readonly string[]; data: string}[]): bigint | null {
    for (const log of logs) {
      try {
        const parsed = this.iface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (parsed?.name === "TaskCreated") {
          return BigInt(parsed.args[0]);
        }
      } catch {
        // unrelated log
      }
    }
    return null;
  }

  private wrapTxError(err: unknown, op: string): Error {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("insufficient funds")) {
      return new InsufficientBalanceError(`${op}: ${message}`, err);
    }
    if (message.toLowerCase().includes("revert")) {
      return new ContractRevertError(`${op}: ${message}`, err);
    }
    return new NetworkError(`${op}: ${message}`, err);
  }
}
