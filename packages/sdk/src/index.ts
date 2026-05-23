export {QuestLensClient, type QuestLensClientConfig} from "./client.js";
export {
  TASK_STATUS_BY_INDEX,
  type CreateTaskOptions,
  type CreateTaskResult,
  type SettledResult,
  type TaskInfo,
  type TaskStatus,
} from "./types.js";
export {
  ContractRevertError,
  InsufficientBalanceError,
  InvalidParameterError,
  NetworkError,
  SdkError,
  type SdkErrorCategory,
  TaskNotSettledError,
} from "./errors.js";
export {ERC20_MIN_ABI, TASK_ESCROW_ABI} from "./abi.js";

// Re-export schema types for SDK consumers' convenience.
export type {DataRequirementV1, ProofV1, UnsignedProofV1} from "@questlens/schemas";
