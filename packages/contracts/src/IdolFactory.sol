// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdolToken.sol";
import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";

/**
 * @title IdolFactory
 * @notice Factory for creating new AI Virtual Idol tokens
 * @dev Each idol gets their own IdolToken and Treasury
 *
 * Security fixes applied:
 * - ID starts from 1 (sentinel pattern) to fix mapping ambiguity
 * - Added creation fee to align with PRD revenue model
 * - Added ReentrancyGuard
 * - Separated treasury from agent address
 */
contract IdolFactory is Ownable, ReentrancyGuard {

    struct IdolInfo {
        address token;
        address treasury;
        address idolAgent;
        string name;
        string symbol;
        string roleType;
        string personality;
        uint256 createdAt;
        bool active;
    }

    // ─── State ───────────────────────────────────────────────────────────
    mapping(uint256 => IdolInfo) public idols;
    mapping(address => uint256) public idolIdByToken;
    mapping(address => uint256) public idolIdByAgent;

    uint256 public nextIdolId = 1; // Start from 1 to avoid 0-sentinel issue
    uint256 public creationFee = 0.1 ether; // 0.1 INJ creation fee (configurable)

    // ─── Events ──────────────────────────────────────────────────────────
    event IdolCreated(
        uint256 indexed idolId,
        address indexed token,
        address indexed treasury,
        address idolAgent,
        string name,
        string symbol,
        string roleType
    );

    event IdolActivated(uint256 indexed idolId);
    event IdolDeactivated(uint256 indexed idolId);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Write Functions ─────────────────────────────────────────────────

    /**
     * @notice Create a new AI Virtual Idol with bonding curve token
     * @param name Token name (e.g., "Vivian Token")
     * @param symbol Token symbol (e.g., "VIVIAN")
     * @param idolAgent Address of the AI agent that will control trading
     * @param treasuryAddress Address for the treasury (separate from agent)
     * @param roleType Role type of the idol (e.g., "trader", "artist")
     * @param personality JSON string describing AI personality traits
     * @return idolId The ID of the created idol
     */
    function createIdol(
        string calldata name,
        string calldata symbol,
        address idolAgent,
        address treasuryAddress,
        string calldata roleType,
        string calldata personality
    ) external payable nonReentrant returns (uint256 idolId) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(idolAgent != address(0), "Invalid agent address");
        require(treasuryAddress != address(0), "Invalid treasury address");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(bytes(roleType).length > 0, "Role type required");

        // Create token with separate treasury
        IdolToken token = new IdolToken(
            name,
            symbol,
            treasuryAddress,
            idolAgent,
            roleType
        );

        // Register idol (ID starts from 1)
        idolId = nextIdolId++;

        idols[idolId] = IdolInfo({
            token: address(token),
            treasury: treasuryAddress,
            idolAgent: idolAgent,
            name: name,
            symbol: symbol,
            roleType: roleType,
            personality: personality,
            createdAt: block.timestamp,
            active: true
        });

        idolIdByToken[address(token)] = idolId;
        idolIdByAgent[idolAgent] = idolId;

        // Refund excess payment
        if (msg.value > creationFee) {
            (bool refunded,) = msg.sender.call{value: msg.value - creationFee}("");
            require(refunded, "Refund failed");
        }

        emit IdolCreated(
            idolId,
            address(token),
            treasuryAddress,
            idolAgent,
            name,
            symbol,
            roleType
        );

        return idolId;
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /**
     * @notice Get idol info by ID
     */
    function getIdol(uint256 idolId) external view returns (IdolInfo memory) {
        require(idolId > 0 && idolId < nextIdolId, "Invalid idol ID");
        return idols[idolId];
    }

    /**
     * @notice Get total number of idols created
     */
    function getIdolCount() external view returns (uint256) {
        return nextIdolId - 1;
    }

    /**
     * @notice Get all active idols
     */
    function getActiveIdols() external view returns (IdolInfo[] memory) {
        // Count active
        uint256 activeCount = 0;
        for (uint256 i = 1; i < nextIdolId; i++) {
            if (idols[i].active) activeCount++;
        }

        // Collect active
        IdolInfo[] memory active = new IdolInfo[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i < nextIdolId; i++) {
            if (idols[i].active) {
                active[index] = idols[i];
                index++;
            }
        }
        return active;
    }

    /**
     * @notice Check if an agent already has an idol
     */
    function hasIdol(address agent) external view returns (bool) {
        return idolIdByAgent[agent] != 0;
    }

    // ─── Admin Functions ─────────────────────────────────────────────────

    /**
     * @notice Deactivate an idol (emergency stop)
     */
    function deactivateIdol(uint256 idolId) external onlyOwner {
        require(idolId > 0 && idolId < nextIdolId, "Invalid idol ID");
        idols[idolId].active = false;
        emit IdolDeactivated(idolId);
    }

    /**
     * @notice Reactivate an idol
     */
    function activateIdol(uint256 idolId) external onlyOwner {
        require(idolId > 0 && idolId < nextIdolId, "Invalid idol ID");
        idols[idolId].active = true;
        emit IdolActivated(idolId);
    }

    /**
     * @notice Update creation fee
     */
    function setCreationFee(uint256 newFee) external onlyOwner {
        emit CreationFeeUpdated(creationFee, newFee);
        creationFee = newFee;
    }

    /**
     * @notice Withdraw accumulated creation fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool sent,) = owner().call{value: balance}("");
        require(sent, "Withdraw failed");
    }

    // Allow contract to receive INJ (for creation fees)
    receive() external payable {}
}
