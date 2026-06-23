// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";

/**
 * @title IdolLifecycle
 * @notice Manages the lifecycle states of AI idols
 * @dev States: Newborn → Growth → Star → Retired
 *
 * State transitions are triggered by:
 * - Treasury value thresholds
 * - Holder count thresholds
 * - Time-based conditions
 * - Manual intervention (emergency)
 *
 * Each state affects what the idol can do:
 * - Newborn: Limited purchases (max per person), high volatility
 * - Growth: Normal operation, trading enabled
 * - Star: Unlocked advanced features (cross-chain, derivatives)
 * - Retired: Trading stopped, redemption allowed
 */
contract IdolLifecycle is Ownable, ReentrancyGuard {

    // ─── State Definitions ───────────────────────────────────────────────
    enum LifecycleState {
        Newborn,   // 0-7 days, limited purchases
        Growth,    // Treasury 10-100 INJ, normal ops
        Star,      // Treasury > 100 INJ OR holders > 50, advanced features
        Retired    // Treasury < 1 INJ OR 3 months consecutive loss, wind down
    }

    struct IdolStatus {
        LifecycleState state;
        uint256 stateChangedAt;        // Timestamp of last state change
        uint256 createdAt;             // Idol creation time
        uint256 consecutiveLossMonths; // Track for retirement trigger
        uint256 peakTreasury;          // All-time high treasury value
        bool manualRetired;            // Owner emergency retirement
    }

    // ─── State Thresholds ────────────────────────────────────────────────
    uint256 public constant NEWBORN_DURATION = 7 days;
    uint256 public constant GROWTH_TREASURY_MIN = 10 ether;     // 10 INJ
    uint256 public constant STAR_TREASURY_MIN = 100 ether;      // 100 INJ
    uint256 public constant STAR_HOLDERS_MIN = 50;
    uint256 public constant RETIRED_TREASURY_MAX = 1 ether;     // < 1 INJ triggers retirement
    uint256 public constant RETIREMENT_LOSS_MONTHS = 3;
    uint256 public constant NEWBORN_MAX_PER_PERSON = 1000 ether; // Max 1000 INJ buy in newborn

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(address => IdolStatus) public idolStatuses; // token address => status
    mapping(address => mapping(address => uint256)) public newbornPurchases; // token => user => amount

    // ─── Events ──────────────────────────────────────────────────────────
    event StateTransition(
        address indexed token,
        LifecycleState fromState,
        LifecycleState toState,
        string reason
    );
    event IdolRegistered(address indexed token, uint256 createdAt);
    event EmergencyRetirement(address indexed token, string reason);

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── External Functions ──────────────────────────────────────────────

    /**
     * @notice Register a new idol for lifecycle tracking
     */
    function registerIdol(address token) external onlyOwner {
        require(idolStatuses[token].createdAt == 0, "Already registered");
        idolStatuses[token] = IdolStatus({
            state: LifecycleState.Newborn,
            stateChangedAt: block.timestamp,
            createdAt: block.timestamp,
            consecutiveLossMonths: 0,
            peakTreasury: 0,
            manualRetired: false
        });
        emit IdolRegistered(token, block.timestamp);
        emit StateTransition(token, LifecycleState.Newborn, LifecycleState.Newborn, "registered");
    }

    /**
     * @notice Evaluate and potentially transition the idol's state
     * @dev Can be called by anyone (permissionless state updates)
     */
    function evaluateState(
        address token,
        uint256 treasuryValue,
        uint256 holderCount
    ) external returns (LifecycleState) {
        IdolStatus storage status = idolStatuses[token];
        require(status.createdAt > 0, "Idol not registered");

        if (status.manualRetired) return LifecycleState.Retired;

        LifecycleState oldState = status.state;
        LifecycleState newState = _calculateState(status, treasuryValue, holderCount);

        if (newState != oldState) {
            status.state = newState;
            status.stateChangedAt = block.timestamp;
            emit StateTransition(token, oldState, newState, _transitionReason(oldState, newState, treasuryValue, holderCount));
        }

        // Update peak treasury
        if (treasuryValue > status.peakTreasury) {
            status.peakTreasury = treasuryValue;
        }

        return newState;
    }

    /**
     * @notice Record a monthly loss (called by agent/keeper)
     */
    function recordMonthlyLoss(address token) external onlyOwner {
        IdolStatus storage status = idolStatuses[token];
        require(status.createdAt > 0, "Idol not registered");
        status.consecutiveLossMonths++;
    }

    /**
     * @notice Reset loss counter on profitable month
     */
    function recordMonthlyProfit(address token) external onlyOwner {
        IdolStatus storage status = idolStatuses[token];
        require(status.createdAt > 0, "Idol not registered");
        status.consecutiveLossMonths = 0;
    }

    /**
     * @notice Emergency retire an idol
     */
    function emergencyRetire(address token, string calldata reason) external onlyOwner {
        IdolStatus storage status = idolStatuses[token];
        require(status.createdAt > 0, "Idol not registered");
        
        LifecycleState oldState = status.state;
        status.state = LifecycleState.Retired;
        status.manualRetired = true;
        status.stateChangedAt = block.timestamp;

        emit EmergencyRetirement(token, reason);
        emit StateTransition(token, oldState, LifecycleState.Retired, reason);
    }

    /**
     * @notice Check if a purchase is allowed in newborn state
     */
    function checkNewbornPurchaseAllowed(
        address token,
        address buyer,
        uint256 amount
    ) external view returns (bool) {
        IdolStatus storage status = idolStatuses[token];
        if (status.state != LifecycleState.Newborn) return true; // No restriction outside newborn
        return newbornPurchases[token][buyer] + amount <= NEWBORN_MAX_PER_PERSON;
    }

    /**
     * @notice Record a newborn purchase
     */
    function recordNewbornPurchase(address token, address buyer, uint256 amount) external {
        newbornPurchases[token][buyer] += amount;
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getState(address token) external view returns (LifecycleState) {
        return idolStatuses[token].state;
    }

    function getStatus(address token) external view returns (IdolStatus memory) {
        return idolStatuses[token];
    }

    function isActive(address token) external view returns (bool) {
        LifecycleState state = idolStatuses[token].state;
        return state != LifecycleState.Retired;
    }

    function canTrade(address token) external view returns (bool) {
        LifecycleState state = idolStatuses[token].state;
        return state == LifecycleState.Growth || state == LifecycleState.Star;
    }

    function hasAdvancedFeatures(address token) external view returns (bool) {
        return idolStatuses[token].state == LifecycleState.Star;
    }

    // ─── Internal Functions ──────────────────────────────────────────────

    function _calculateState(
        IdolStatus storage status,
        uint256 treasuryValue,
        uint256 holderCount
    ) internal view returns (LifecycleState) {
        // Check retirement conditions first (can happen from any state)
        if (status.consecutiveLossMonths >= RETIREMENT_LOSS_MONTHS) {
            return LifecycleState.Retired;
        }
        if (status.state != LifecycleState.Newborn && treasuryValue < RETIRED_TREASURY_MAX && treasuryValue > 0) {
            return LifecycleState.Retired;
        }

        // Newborn: time-based transition
        if (block.timestamp < status.createdAt + NEWBORN_DURATION) {
            return LifecycleState.Newborn;
        }

        // Star: treasury or holders threshold
        if (treasuryValue >= STAR_TREASURY_MIN || holderCount >= STAR_HOLDERS_MIN) {
            return LifecycleState.Star;
        }

        // Growth: default after newborn
        return LifecycleState.Growth;
    }

    function _transitionReason(
        LifecycleState from,
        LifecycleState to,
        uint256 treasuryValue,
        uint256 holderCount
    ) internal pure returns (string memory) {
        if (to == LifecycleState.Growth && from == LifecycleState.Newborn) return "newborn period ended";
        if (to == LifecycleState.Star) return "treasury/holders threshold reached";
        if (to == LifecycleState.Retired) return "retirement conditions met";
        return "state evaluated";
    }
}
