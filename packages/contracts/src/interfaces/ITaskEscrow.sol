// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ITaskEscrow
/// @notice Interface for the QuestLens task escrow contract.
/// @dev Validates Requirements 1-5 and 15 from the spec.
interface ITaskEscrow {
    enum TaskStatus {
        None,
        Created,
        Accepted,
        PendingFinalization, // Phase 2 only
        Settled,
        Refunded,
        Slashed
    }

    struct Task {
        address requester;
        address worker; // zero until accepted
        address stablecoin;
        uint128 budget;
        uint128 workerStake;
        bytes32 dataRequirement;
        uint64 createdAt;
        uint64 acceptedAt;
        uint64 challengeUntil;
        TaskStatus status;
    }

    /// @dev Governance-controlled parameters per Requirement 15.
    struct Parameters {
        uint128 minBounty;
        uint128 maxBounty;
        uint128 workerStakeAmount;
        uint16 protocolFeeBps;
        uint16 slashRewardPoolBps;
        uint16 slashTreasuryBps;
        uint64 taskTimeout;
        uint64 submissionDeadline;
        uint64 challengePeriod;
        uint128 layer3CostCap; // informational; enforced off-chain by Relayer
    }

    // ---------------- events ----------------

    event TaskCreated(
        uint256 indexed taskId,
        address indexed requester,
        address stablecoin,
        uint128 budget,
        bytes32 dataRequirement
    );
    event TaskAccepted(uint256 indexed taskId, address indexed worker, uint64 deadline);
    event Settled(uint256 indexed taskId, address indexed worker, uint128 paidToWorker, uint128 protocolFee);
    event Slashed(
        uint256 indexed taskId,
        address indexed worker,
        uint128 amount,
        uint128 toRewardPool,
        uint128 toTreasury,
        bytes32 reasonCode
    );
    event Refunded(uint256 indexed taskId, address indexed requester, uint128 amount);
    event ParametersUpdated();

    // ---------------- errors ----------------

    error BountyOutOfRange(uint128 min, uint128 max, uint128 provided);
    error InvalidTaskStatus(TaskStatus expected, TaskStatus actual);
    error UnauthorizedRelayer(address caller);
    error UnauthorizedRequester(address caller, address requester);
    error UnauthorizedGovernance(address caller);
    error WorkerBanned(address worker);
    error TimeoutNotElapsed(uint64 secondsRemaining);
    error AllowedStablecoinOnly(address token);
    error ZeroAddress();

    // ---------------- mutating ----------------

    function createTask(address stablecoin, uint128 budget, bytes32 dataRequirement)
        external
        returns (uint256 taskId);

    function stakeForTask(uint256 taskId) external;

    function submitProof(uint256 taskId, address worker, bytes32 imageHash, bytes32 verdictReason) external;

    function slashWorker(uint256 taskId, address worker, bytes32 reasonCode) external;

    function claimRefund(uint256 taskId) external;

    function setParameters(Parameters calldata newParams) external;

    function setStablecoinAllowed(address token, bool allowed) external;

    // ---------------- views ----------------

    function tasks(uint256 taskId) external view returns (Task memory);

    function params() external view returns (Parameters memory);

    function nextTaskId() external view returns (uint256);
}
