// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/token/ERC721/ERC721.sol";
import "@openzeppelin/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/access/Ownable.sol";

/**
 * @title ERC8004Agent
 * @notice ERC-8004 Standard Agent Identity NFT
 * @dev This is the Injective Agents SDK standard for AI agent identity.
 *
 * Security fixes applied:
 * - Token IDs start from 1 to fix agentIdByOperator 0-sentinel issue
 * - Updated to OZ v5 compatible overrides (_update instead of _beforeTokenTransfer)
 * - Added input validation for updateAgent fields
 * - Added operator transfer event
 */
contract ERC8004Agent is ERC721, ERC721Enumerable, Ownable {

    struct AgentIdentity {
        string name;
        string description;
        string modelProvider; // e.g., "azure-openai"
        string modelId;       // e.g., "gpt-4"
        string personality;   // JSON of personality config
        address operator;     // Address authorized to operate this agent
        bytes32 capabilities; // Bitmask of agent capabilities
        uint256 createdAt;
        bool active;
    }

    // ─── State ───────────────────────────────────────────────────────────
    mapping(uint256 => AgentIdentity) public agents;
    mapping(address => uint256) public agentIdByOperator;

    uint256 private _nextTokenId = 1; // Start from 1 to avoid 0-sentinel issue

    // ─── Capability Bits ─────────────────────────────────────────────────
    uint256 public constant CAP_TRADING = 1 << 0;
    uint256 public constant CAP_CONTENT = 1 << 1;
    uint256 public constant CAP_SOCIAL = 1 << 2;
    uint256 public constant CAP_GOVERNANCE = 1 << 3;

    // ─── Events ──────────────────────────────────────────────────────────
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed operator,
        string name,
        string modelProvider
    );

    event AgentUpdated(uint256 indexed agentId, string field, string value);
    event AgentActivated(uint256 indexed agentId);
    event AgentDeactivated(uint256 indexed agentId);
    event OperatorUpdated(uint256 indexed agentId, address indexed oldOperator, address indexed newOperator);

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor()
        ERC721("Injective AI Agent", "iAGENT")
        Ownable(msg.sender)
    {}

    // ─── Write Functions ─────────────────────────────────────────────────

    /**
     * @notice Register a new AI agent identity
     * @param name Agent name
     * @param description Agent description
     * @param modelProvider AI model provider (e.g., "azure-openai")
     * @param modelId Model identifier (e.g., "gpt-4")
     * @param personality JSON personality configuration
     * @param capabilities Capability bitmask
     * @return agentId The registered agent ID
     */
    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata modelProvider,
        string calldata modelId,
        string calldata personality,
        bytes32 capabilities
    ) external returns (uint256 agentId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(modelProvider).length > 0, "Model provider required");
        require(agentIdByOperator[msg.sender] == 0, "Operator already has agent");

        agentId = _nextTokenId++;

        agents[agentId] = AgentIdentity({
            name: name,
            description: description,
            modelProvider: modelProvider,
            modelId: modelId,
            personality: personality,
            operator: msg.sender,
            capabilities: capabilities,
            createdAt: block.timestamp,
            active: true
        });

        agentIdByOperator[msg.sender] = agentId;

        _mint(msg.sender, agentId);

        emit AgentRegistered(agentId, msg.sender, name, modelProvider);

        return agentId;
    }

    /**
     * @notice Update agent configuration
     * @param agentId The agent ID to update
     * @param field Field name to update ("name", "description", "personality", "modelId")
     * @param value New value for the field
     */
    function updateAgent(
        uint256 agentId,
        string calldata field,
        string calldata value
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(bytes(value).length > 0, "Value cannot be empty");

        AgentIdentity storage agent = agents[agentId];
        bytes32 fieldHash = keccak256(bytes(field));

        if (fieldHash == keccak256(bytes("name"))) {
            agent.name = value;
        } else if (fieldHash == keccak256(bytes("description"))) {
            agent.description = value;
        } else if (fieldHash == keccak256(bytes("personality"))) {
            agent.personality = value;
        } else if (fieldHash == keccak256(bytes("modelId"))) {
            agent.modelId = value;
        } else {
            revert("Invalid field");
        }

        emit AgentUpdated(agentId, field, value);
    }

    /**
     * @notice Update operator address
     */
    function updateOperator(uint256 agentId, address newOperator) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(newOperator != address(0), "Invalid operator");
        require(agentIdByOperator[newOperator] == 0, "New operator already has agent");

        AgentIdentity storage agent = agents[agentId];
        address oldOperator = agent.operator;

        // Remove old mapping
        delete agentIdByOperator[oldOperator];

        // Set new operator
        agent.operator = newOperator;
        agentIdByOperator[newOperator] = agentId;

        emit OperatorUpdated(agentId, oldOperator, newOperator);
    }

    /**
     * @notice Add capabilities to agent
     */
    function addCapabilities(uint256 agentId, bytes32 newCaps) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        agents[agentId].capabilities = agents[agentId].capabilities | newCaps;
    }

    /**
     * @notice Remove capabilities from agent
     */
    function removeCapabilities(uint256 agentId, bytes32 capsToRemove) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        agents[agentId].capabilities = agents[agentId].capabilities & ~capsToRemove;
    }

    /**
     * @notice Deactivate agent
     */
    function deactivateAgent(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender || owner() == msg.sender, "Not authorized");
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Reactivate agent
     */
    function activateAgent(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender || owner() == msg.sender, "Not authorized");
        agents[agentId].active = true;
        emit AgentActivated(agentId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /**
     * @notice Check if agent has specific capability
     */
    function hasCapability(uint256 agentId, uint256 cap) external view returns (bool) {
        return uint256(agents[agentId].capabilities) & cap != 0;
    }

    /**
     * @notice Get agent info
     */
    function getAgent(uint256 agentId) external view returns (AgentIdentity memory) {
        require(agentId > 0 && agentId < _nextTokenId, "Invalid agent ID");
        return agents[agentId];
    }

    /**
     * @notice Get agent by operator address
     */
    function getAgentByOperator(address operator) external view returns (AgentIdentity memory) {
        uint256 agentId = agentIdByOperator[operator];
        require(agentId != 0, "No agent for operator");
        return agents[agentId];
    }

    /**
     * @notice Get total registered agents count
     */
    function getAgentCount() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─── Required Overrides (OZ v5 compatible) ───────────────────────────

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
