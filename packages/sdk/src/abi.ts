/**
 * Minimal ABI fragments needed by the SDK. Hand-written to keep the dependency
 * surface light and to provide a clear audit trail of what the SDK signs.
 *
 * If contract method signatures change, regenerate or update these fragments.
 */

export const TASK_ESCROW_ABI = [
  // --- mutating ---
  "function createTask(address stablecoin, uint128 budget, bytes32 dataRequirement) external returns (uint256 taskId)",
  "function stakeForTask(uint256 taskId) external",
  "function submitProof(uint256 taskId, address worker, bytes32 imageHash, bytes32 verdictReason) external",
  "function slashWorker(uint256 taskId, address worker, bytes32 reasonCode) external",
  "function claimRefund(uint256 taskId) external",

  // --- views ---
  "function tasks(uint256 taskId) external view returns (tuple(address requester, address worker, address stablecoin, uint128 budget, uint128 workerStake, bytes32 dataRequirement, uint64 createdAt, uint64 acceptedAt, uint64 challengeUntil, uint8 status))",
  "function nextTaskId() external view returns (uint256)",

  // --- events ---
  "event TaskCreated(uint256 indexed taskId, address indexed requester, address stablecoin, uint128 budget, bytes32 dataRequirement)",
  "event TaskAccepted(uint256 indexed taskId, address indexed worker, uint64 deadline)",
  "event Settled(uint256 indexed taskId, address indexed worker, uint128 paidToWorker, uint128 protocolFee)",
  "event Slashed(uint256 indexed taskId, address indexed worker, uint128 amount, uint128 toRewardPool, uint128 toTreasury, bytes32 reasonCode)",
  "event Refunded(uint256 indexed taskId, address indexed requester, uint128 amount)",
] as const;

export const ERC20_MIN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
] as const;
