// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IReputationRegistry
/// @notice Interface for the QuestLens reputation and relayer registry.
/// @dev Validates Requirements 6, 7, 8 from the spec.
interface IReputationRegistry {
    enum RelayerStatus {
        None,
        Active,
        Slashed,
        Withdrawn
    }

    struct WorkerReputation {
        uint16 reputationScore; // 0-100, initialized to 50 on first registration
        uint32 completedTasks;
        uint16 cheatingCount;
        uint64 firstRegisteredAt;
        bytes32 deviceFingerprint; // commitment hash, never PII
        bytes16 ipSubnet; // /24 IPv4 prefix or equivalent commitment
        bool banned;
    }

    struct RelayerInfo {
        uint128 collateral;
        uint64 registeredAt;
        string attestationUrl;
        RelayerStatus status;
    }

    // ---------------- events ----------------

    event WorkerRegistered(address indexed worker, bytes32 deviceFingerprint, bytes16 ipSubnet);
    event ReputationIncreased(address indexed worker, uint16 newScore);
    event ReputationDecreased(address indexed worker, uint16 newScore, uint16 cheatingCount);
    event WorkerBanned(address indexed worker);
    event RelayerRegistered(address indexed relayer, uint128 collateral, string attestationUrl);
    event RelayerWithdrawn(address indexed relayer);
    event RelayerSlashed(address indexed relayer, uint128 amount);

    // ---------------- mutating ----------------

    /// @notice Idempotent first-time registration of a Worker.
    /// @dev Sets reputationScore to 50 on first call. Subsequent calls update fingerprint/subnet only.
    function registerWorker(address worker, bytes32 deviceFingerprint, bytes16 ipSubnet) external;

    /// @notice Called by TaskEscrow on successful settlement.
    function recordCompletion(address worker) external;

    /// @notice Called by TaskEscrow on slashing.
    /// @dev Increments cheatingCount, decreases reputation by 10, sets banned=true at count >= 3.
    function recordSlash(address worker) external;

    /// @notice Self-registration of a Relayer Node.
    /// @dev In Phase 1 the minimum collateral is 0 (governance bootstrap). In Phase 2 it is 100 USDT.
    function registerRelayer(string calldata attestationUrl) external payable;

    /// @notice Allow an active Relayer to withdraw and reclaim collateral.
    function withdrawRelayer() external;

    // ---------------- views ----------------

    function getReputation(address worker)
        external
        view
        returns (uint16 score, uint16 cheatingCount, bool banned);

    function getRelayer(address relayer)
        external
        view
        returns (uint128 collateral, uint64 registeredAt, string memory attestationUrl, RelayerStatus status);

    function isActiveRelayer(address relayer) external view returns (bool);
}
