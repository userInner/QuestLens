/**
 * Structured error classes for the SDK.
 * Validates Requirement 14.6 (rejects with structured errors) and 14.7
 * (TaskNotSettled rejection on premature getTaskResult).
 */

export type SdkErrorCategory =
  | "NETWORK"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_PARAMETER"
  | "TASK_NOT_SETTLED"
  | "RELAYER_UNAUTHORIZED"
  | "CONTRACT_REVERT"
  | "UNKNOWN";

export class SdkError extends Error {
  readonly category: SdkErrorCategory;
  override readonly cause: unknown;

  constructor(category: SdkErrorCategory, message: string, cause?: unknown) {
    super(message);
    this.name = "SdkError";
    this.category = category;
    this.cause = cause;
  }
}

export class NetworkError extends SdkError {
  constructor(message: string, cause?: unknown) {
    super("NETWORK", message, cause);
    this.name = "NetworkError";
  }
}

export class InsufficientBalanceError extends SdkError {
  constructor(message: string, cause?: unknown) {
    super("INSUFFICIENT_BALANCE", message, cause);
    this.name = "InsufficientBalanceError";
  }
}

export class InvalidParameterError extends SdkError {
  constructor(message: string, cause?: unknown) {
    super("INVALID_PARAMETER", message, cause);
    this.name = "InvalidParameterError";
  }
}

export class TaskNotSettledError extends SdkError {
  constructor(taskId: string, currentStatus: string) {
    super(
      "TASK_NOT_SETTLED",
      `Task ${taskId} is not yet settled (current status: ${currentStatus})`,
    );
    this.name = "TaskNotSettledError";
  }
}

export class ContractRevertError extends SdkError {
  constructor(message: string, cause?: unknown) {
    super("CONTRACT_REVERT", message, cause);
    this.name = "ContractRevertError";
  }
}
