// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ITaskEscrow} from "./interfaces/ITaskEscrow.sol";
import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

/// @title TaskEscrow
/// @notice Custodian of bounties and stakes for QuestLens tasks.
/// @dev Validates Requirements 1-5 and 15. Conforms to Properties 1-7 and 11.
contract TaskEscrow is ITaskEscrow, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------- constants ----------------

    uint16 public constant BPS_DENOMINATOR = 10_000;
    bytes32 public constant REASON_TIMEOUT = "TIMEOUT";

    // ---------------- storage ----------------

    IReputationRegistry public immutable reputationRegistry;
    address public immutable treasury;
    address public immutable rewardPool;
    address public governance;

    Parameters private _params;

    /// @notice Whitelisted stablecoins (USDT and USDC by default).
    mapping(address => bool) public allowedStablecoins;

    mapping(uint256 => Task) private _tasks;
    uint256 private _nextTaskId;

    // ---------------- modifiers ----------------

    modifier onlyActiveRelayer() {
        if (!reputationRegistry.isActiveRelayer(msg.sender)) revert UnauthorizedRelayer(msg.sender);
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert UnauthorizedGovernance(msg.sender);
        _;
    }

    // ---------------- constructor ----------------

    constructor(
        IReputationRegistry reputationRegistry_,
        address governance_,
        address treasury_,
        address rewardPool_,
        Parameters memory initialParams
    ) {
        if (
            address(reputationRegistry_) == address(0) || governance_ == address(0) || treasury_ == address(0)
                || rewardPool_ == address(0)
        ) {
            revert ZeroAddress();
        }
        require(
            initialParams.slashRewardPoolBps + initialParams.slashTreasuryBps == BPS_DENOMINATOR,
            "Slash bps != 100%"
        );
        require(initialParams.protocolFeeBps < BPS_DENOMINATOR, "Fee >= 100%");

        reputationRegistry = reputationRegistry_;
        governance = governance_;
        treasury = treasury_;
        rewardPool = rewardPool_;
        _params = initialParams;
        _nextTaskId = 1;
    }

    // ---------------- task lifecycle ----------------

    /// @inheritdoc ITaskEscrow
    function createTask(address stablecoin, uint128 budget, bytes32 dataRequirement)
        external
        nonReentrant
        returns (uint256 taskId)
    {
        if (!allowedStablecoins[stablecoin]) revert AllowedStablecoinOnly(stablecoin);
        Parameters memory p = _params;
        if (budget < p.minBounty || budget > p.maxBounty) {
            revert BountyOutOfRange(p.minBounty, p.maxBounty, budget);
        }

        taskId = _nextTaskId++;
        _tasks[taskId] = Task({
            requester: msg.sender,
            worker: address(0),
            stablecoin: stablecoin,
            budget: budget,
            workerStake: 0,
            dataRequirement: dataRequirement,
            createdAt: uint64(block.timestamp),
            acceptedAt: 0,
            challengeUntil: 0,
            status: TaskStatus.Created
        });

        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), budget);

        emit TaskCreated(taskId, msg.sender, stablecoin, budget, dataRequirement);
    }

    /// @inheritdoc ITaskEscrow
    function stakeForTask(uint256 taskId) external nonReentrant {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Created) revert InvalidTaskStatus(TaskStatus.Created, t.status);

        (,, bool banned) = reputationRegistry.getReputation(msg.sender);
        if (banned) revert WorkerBanned(msg.sender);

        Parameters memory p = _params;
        uint128 stake = p.workerStakeAmount;

        t.worker = msg.sender;
        t.workerStake = stake;
        t.acceptedAt = uint64(block.timestamp);
        t.status = TaskStatus.Accepted;

        IERC20(t.stablecoin).safeTransferFrom(msg.sender, address(this), stake);

        uint64 deadline = uint64(block.timestamp) + p.submissionDeadline;
        emit TaskAccepted(taskId, msg.sender, deadline);
    }

    /// @inheritdoc ITaskEscrow
    function submitProof(uint256 taskId, address worker, bytes32, /* imageHash */ bytes32 /* verdictReason */ )
        external
        onlyActiveRelayer
        nonReentrant
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Accepted) revert InvalidTaskStatus(TaskStatus.Accepted, t.status);
        require(t.worker == worker, "Worker mismatch");

        Parameters memory p = _params;
        uint128 fee = uint128((uint256(t.budget) * p.protocolFeeBps) / BPS_DENOMINATOR);
        uint128 paidToWorker = t.budget - fee;
        uint128 stake = t.workerStake;
        address stablecoin = t.stablecoin;

        t.status = TaskStatus.Settled;
        t.workerStake = 0;

        IERC20(stablecoin).safeTransfer(worker, paidToWorker + stake);
        if (fee > 0) IERC20(stablecoin).safeTransfer(treasury, fee);

        reputationRegistry.recordCompletion(worker);

        emit Settled(taskId, worker, paidToWorker, fee);
    }

    /// @inheritdoc ITaskEscrow
    function slashWorker(uint256 taskId, address worker, bytes32 reasonCode)
        external
        onlyActiveRelayer
        nonReentrant
    {
        Task storage t = _tasks[taskId];
        if (t.status != TaskStatus.Accepted) revert InvalidTaskStatus(TaskStatus.Accepted, t.status);
        require(t.worker == worker, "Worker mismatch");

        _executeSlash(t, taskId, worker, reasonCode);
    }

    /// @inheritdoc ITaskEscrow
    function claimRefund(uint256 taskId) external nonReentrant {
        Task storage t = _tasks[taskId];
        if (msg.sender != t.requester) revert UnauthorizedRequester(msg.sender, t.requester);
        Parameters memory p = _params;

        if (t.status == TaskStatus.Created) {
            uint64 elapsed = uint64(block.timestamp) - t.createdAt;
            if (elapsed < p.taskTimeout) revert TimeoutNotElapsed(p.taskTimeout - elapsed);
            _refundRequester(t, taskId);
        } else if (t.status == TaskStatus.Accepted) {
            uint64 elapsed = uint64(block.timestamp) - t.acceptedAt;
            if (elapsed < p.submissionDeadline) revert TimeoutNotElapsed(p.submissionDeadline - elapsed);
            // Forfeit worker stake first (slash), then refund the bounty back to the Requester.
            _executeSlash(t, taskId, t.worker, REASON_TIMEOUT);
            // _executeSlash resets status to Created; flip to Refunded and pay back the budget.
            _refundRequester(t, taskId);
        } else {
            revert InvalidTaskStatus(TaskStatus.Created, t.status);
        }
    }

    // ---------------- internal helpers ----------------

    function _executeSlash(Task storage t, uint256 taskId, address worker, bytes32 reasonCode) internal {
        Parameters memory p = _params;
        uint128 stake = t.workerStake;
        require(stake > 0, "No stake");

        uint128 toRewardPool = uint128((uint256(stake) * p.slashRewardPoolBps) / BPS_DENOMINATOR);
        uint128 toTreasury = stake - toRewardPool;
        address stablecoin = t.stablecoin;

        // Reset task back to Created so another Worker may accept it within the original 72h lifetime (R5.5).
        t.worker = address(0);
        t.workerStake = 0;
        t.acceptedAt = 0;
        t.status = TaskStatus.Created;

        if (toRewardPool > 0) IERC20(stablecoin).safeTransfer(rewardPool, toRewardPool);
        if (toTreasury > 0) IERC20(stablecoin).safeTransfer(treasury, toTreasury);

        reputationRegistry.recordSlash(worker);

        emit Slashed(taskId, worker, stake, toRewardPool, toTreasury, reasonCode);
    }

    function _refundRequester(Task storage t, uint256 taskId) internal {
        uint128 amount = t.budget;
        address stablecoin = t.stablecoin;
        address requester = t.requester;
        t.status = TaskStatus.Refunded;
        t.budget = 0;

        IERC20(stablecoin).safeTransfer(requester, amount);
        emit Refunded(taskId, requester, amount);
    }

    // ---------------- governance ----------------

    /// @inheritdoc ITaskEscrow
    function setParameters(Parameters calldata newParams) external onlyGovernance {
        require(
            newParams.slashRewardPoolBps + newParams.slashTreasuryBps == BPS_DENOMINATOR,
            "Slash bps != 100%"
        );
        require(newParams.protocolFeeBps < BPS_DENOMINATOR, "Fee >= 100%");
        _params = newParams;
        emit ParametersUpdated();
    }

    /// @inheritdoc ITaskEscrow
    function setStablecoinAllowed(address token, bool allowed) external onlyGovernance {
        if (token == address(0)) revert ZeroAddress();
        allowedStablecoins[token] = allowed;
    }

    function setGovernance(address newGovernance) external onlyGovernance {
        if (newGovernance == address(0)) revert ZeroAddress();
        governance = newGovernance;
    }

    // ---------------- views ----------------

    /// @inheritdoc ITaskEscrow
    function tasks(uint256 taskId) external view returns (Task memory) {
        return _tasks[taskId];
    }

    /// @inheritdoc ITaskEscrow
    function params() external view returns (Parameters memory) {
        return _params;
    }

    /// @inheritdoc ITaskEscrow
    function nextTaskId() external view returns (uint256) {
        return _nextTaskId;
    }
}
