import type {DataRequirementV1} from "@questlens/schemas";

/** TaskStatus enum mirroring TaskEscrow.sol::ITaskEscrow.TaskStatus. */
export type TaskStatus =
  | "none"
  | "created"
  | "accepted"
  | "pending-finalization"
  | "settled"
  | "refunded"
  | "slashed";

export const TASK_STATUS_BY_INDEX: readonly TaskStatus[] = [
  "none",
  "created",
  "accepted",
  "pending-finalization",
  "settled",
  "refunded",
  "slashed",
];

export interface CreateTaskOptions {
  /** Bounty amount denominated in the stablecoin's smallest unit (e.g. 1_000_000 = 1 USDT). */
  budget: bigint;
  /** ERC20 stablecoin address used for the bounty (must be whitelisted on TaskEscrow). */
  stablecoin: string;
  /** DataRequirement object - validated, canonicalized, hashed, then committed on-chain. */
  dataRequirement: DataRequirementV1;
  /**
   * If true, the SDK will set ERC20 allowance for the bounty automatically.
   * Defaults to true. Set false when the caller has already approved.
   */
  autoApprove?: boolean;
}

export interface CreateTaskResult {
  taskId: bigint;
  txHash: string;
  /** keccak256 of the canonicalized DataRequirement, also stored on-chain. */
  dataRequirementHash: `0x${string}`;
}

export interface TaskInfo {
  taskId: bigint;
  status: TaskStatus;
  requester: string;
  worker: string;
  stablecoin: string;
  budget: bigint;
  workerStake: bigint;
  dataRequirement: `0x${string}`;
  createdAt: number;
  acceptedAt: number;
  challengeUntil: number;
}

export interface SettledResult {
  taskId: bigint;
  worker: string;
  paidToWorker: bigint;
  protocolFee: bigint;
  imageHash?: `0x${string}`;
  txHash?: string;
}
