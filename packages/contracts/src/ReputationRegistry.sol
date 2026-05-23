// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

/// @title ReputationRegistry
/// @notice Tracks Worker reputation and registers Relayer Nodes.
/// @dev Validates Requirements 6, 7, 8 and Properties 5, 8.
contract ReputationRegistry is IReputationRegistry {
    // ---------------- constants ----------------

    /// @notice Reputation score assigned on first Worker registration.
    uint16 public constant INITIAL_REPUTATION = 50;
    uint16 public constant MAX_REPUTATION = 100;
    /// @notice Reputation reduction applied per slash event.
    uint16 public constant SLASH_REPUTATION_PENALTY = 10;
    /// @notice Cheating count threshold that triggers a permanent ban.
    uint16 public constant BAN_THRESHOLD = 3;
    /// @notice Time window during which two Worker addresses are considered "co-registered" for Sybil checks.
    uint64 public constant SYBIL_REGISTRATION_WINDOW = 48 hours;

    // ---------------- storage ----------------

    /// @notice Authorized TaskEscrow contract; only it can record completions and slashes.
    /// @dev Set once by governance via `setTaskEscrow`. Cannot be changed afterwards.
    address public taskEscrow;

    /// @notice Governance address authorized to update parameters and approve Phase 1 relayers.
    address public governance;

    /// @notice Minimum collateral required to register as a Relayer (0 in Phase 1, 100 USDT in Phase 2).
    uint128 public minRelayerCollateral;

    mapping(address => WorkerReputation) private _workers;
    mapping(address => RelayerInfo) private _relayers;

    // ---------------- errors ----------------

    error UnauthorizedTaskEscrow(address caller);
    error UnauthorizedGovernance(address caller);
    error InsufficientCollateral(uint128 required, uint256 provided);
    error RelayerAlreadyRegistered(address relayer);
    error RelayerNotActive(address relayer);
    error TaskEscrowAlreadySet();
    error TaskEscrowNotSet();

    modifier onlyTaskEscrow() {
        if (taskEscrow == address(0)) revert TaskEscrowNotSet();
        if (msg.sender != taskEscrow) revert UnauthorizedTaskEscrow(msg.sender);
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert UnauthorizedGovernance(msg.sender);
        _;
    }

    constructor(address governance_, uint128 minRelayerCollateral_) {
        require(governance_ != address(0), "Governance zero");
        governance = governance_;
        minRelayerCollateral = minRelayerCollateral_;
    }

    /// @notice One-time wiring of the TaskEscrow address. Required because of the constructor circular dependency.
    function setTaskEscrow(address taskEscrow_) external onlyGovernance {
        if (taskEscrow != address(0)) revert TaskEscrowAlreadySet();
        require(taskEscrow_ != address(0), "TaskEscrow zero");
        taskEscrow = taskEscrow_;
    }

    // ---------------- worker registration ----------------

    /// @inheritdoc IReputationRegistry
    function registerWorker(address worker, bytes32 deviceFingerprint, bytes16 ipSubnet) external {
        require(worker != address(0), "Worker zero");
        WorkerReputation storage rep = _workers[worker];
        if (rep.firstRegisteredAt == 0) {
            rep.reputationScore = INITIAL_REPUTATION;
            rep.firstRegisteredAt = uint64(block.timestamp);
            rep.deviceFingerprint = deviceFingerprint;
            rep.ipSubnet = ipSubnet;
            emit WorkerRegistered(worker, deviceFingerprint, ipSubnet);
        } else {
            // Idempotent on re-registration: refresh last-seen subnet/fingerprint without resetting state.
            rep.deviceFingerprint = deviceFingerprint;
            rep.ipSubnet = ipSubnet;
        }
    }

    /// @inheritdoc IReputationRegistry
    function recordCompletion(address worker) external onlyTaskEscrow {
        WorkerReputation storage rep = _workers[worker];
        if (rep.firstRegisteredAt == 0) {
            // Lazy init for workers who somehow bypass registerWorker (defensive).
            rep.reputationScore = INITIAL_REPUTATION;
            rep.firstRegisteredAt = uint64(block.timestamp);
        }
        unchecked {
            rep.completedTasks += 1;
        }
        if (rep.reputationScore < MAX_REPUTATION) {
            rep.reputationScore += 1;
            emit ReputationIncreased(worker, rep.reputationScore);
        }
    }

    /// @inheritdoc IReputationRegistry
    function recordSlash(address worker) external onlyTaskEscrow {
        WorkerReputation storage rep = _workers[worker];
        if (rep.firstRegisteredAt == 0) {
            rep.reputationScore = INITIAL_REPUTATION;
            rep.firstRegisteredAt = uint64(block.timestamp);
        }
        unchecked {
            rep.cheatingCount += 1;
        }
        if (rep.reputationScore <= SLASH_REPUTATION_PENALTY) {
            rep.reputationScore = 0;
        } else {
            rep.reputationScore -= SLASH_REPUTATION_PENALTY;
        }
        emit ReputationDecreased(worker, rep.reputationScore, rep.cheatingCount);

        if (rep.cheatingCount >= BAN_THRESHOLD && !rep.banned) {
            rep.banned = true;
            emit WorkerBanned(worker);
        }
    }

    // ---------------- relayer registration ----------------

    /// @inheritdoc IReputationRegistry
    function registerRelayer(string calldata attestationUrl) external payable {
        if (msg.value < minRelayerCollateral) {
            revert InsufficientCollateral(minRelayerCollateral, msg.value);
        }
        RelayerInfo storage info = _relayers[msg.sender];
        if (info.status == RelayerStatus.Active) revert RelayerAlreadyRegistered(msg.sender);

        info.collateral = uint128(msg.value);
        info.registeredAt = uint64(block.timestamp);
        info.attestationUrl = attestationUrl;
        info.status = RelayerStatus.Active;
        emit RelayerRegistered(msg.sender, info.collateral, attestationUrl);
    }

    /// @inheritdoc IReputationRegistry
    function withdrawRelayer() external {
        RelayerInfo storage info = _relayers[msg.sender];
        if (info.status != RelayerStatus.Active) revert RelayerNotActive(msg.sender);

        uint128 amount = info.collateral;
        info.collateral = 0;
        info.status = RelayerStatus.Withdrawn;
        emit RelayerWithdrawn(msg.sender);

        if (amount > 0) {
            (bool ok,) = msg.sender.call{value: amount}("");
            require(ok, "Withdraw failed");
        }
    }

    /// @notice Phase 1 governance bootstrap: register a relayer with zero collateral.
    /// @dev Used to onboard the protocol team's SGX node before Phase 2 collateral requirements are enforced.
    function bootstrapRelayer(address relayer, string calldata attestationUrl) external onlyGovernance {
        RelayerInfo storage info = _relayers[relayer];
        if (info.status == RelayerStatus.Active) revert RelayerAlreadyRegistered(relayer);
        info.collateral = 0;
        info.registeredAt = uint64(block.timestamp);
        info.attestationUrl = attestationUrl;
        info.status = RelayerStatus.Active;
        emit RelayerRegistered(relayer, 0, attestationUrl);
    }

    /// @notice Governance can update the minimum collateral when transitioning Phase 1 -> Phase 2.
    function setMinRelayerCollateral(uint128 newMin) external onlyGovernance {
        minRelayerCollateral = newMin;
    }

    function setGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Zero governance");
        governance = newGovernance;
    }

    // ---------------- views ----------------

    /// @inheritdoc IReputationRegistry
    function getReputation(address worker)
        external
        view
        returns (uint16 score, uint16 cheatingCount, bool banned)
    {
        WorkerReputation storage rep = _workers[worker];
        return (rep.reputationScore, rep.cheatingCount, rep.banned);
    }

    /// @inheritdoc IReputationRegistry
    function getRelayer(address relayer)
        external
        view
        returns (uint128 collateral, uint64 registeredAt, string memory attestationUrl, RelayerStatus status)
    {
        RelayerInfo storage info = _relayers[relayer];
        return (info.collateral, info.registeredAt, info.attestationUrl, info.status);
    }

    /// @inheritdoc IReputationRegistry
    function isActiveRelayer(address relayer) external view returns (bool) {
        return _relayers[relayer].status == RelayerStatus.Active;
    }

    /// @notice Convenience view that returns the full WorkerReputation struct.
    function workerInfo(address worker) external view returns (WorkerReputation memory) {
        return _workers[worker];
    }
}
