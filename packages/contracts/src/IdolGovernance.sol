// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";

interface IIdolToken {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/**
 * @title IdolGovernance
 * @notice Token-weighted voting for AI idol parameter changes
 * @dev Holders of IdolToken can propose and vote on:
 *   - Risk parameters (max leverage, trade size)
 *   - Strategy direction (aggressive/balanced/conservative)
 *   - Personality traits (adjust communication style)
 *   - Fee changes (protocol fee percent)
 *
 * Voting power = token balance at snapshot time
 * Quorum: 10% of total supply must vote
 * Threshold: >50% of votes must be FOR
 * Voting period: 3 days
 */
contract IdolGovernance is Ownable, ReentrancyGuard {

    // ─── Types ───────────────────────────────────────────────────────────
    enum ProposalState {
        Pending,    // Created, not yet active
        Active,     // Voting open
        Passed,     // Quorum met, majority FOR
        Failed,     // Quorum not met or majority AGAINST
        Executed,   // Passed and applied
        Cancelled   // Cancelled by proposer or owner
    }

    enum ProposalType {
        RiskParameter,    // Change max leverage, trade size, etc.
        StrategyChange,   // Aggressive/Balanced/Conservative
        PersonalityTweak, // Adjust personality traits
        FeeChange,        // Change fee percentages
        Custom            // Free-form proposal
    }

    struct Proposal {
        uint256 id;
        address proposer;
        address token;             // Which idol token this applies to
        ProposalType proposalType;
        string title;
        string description;        // JSON with proposed changes
        uint256 createdAt;
        uint256 votingEndsAt;
        uint256 snapshotSupply;    // Total supply at creation (for quorum calc)
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalState state;
        bool executed;
    }

    struct Vote {
        bool hasVoted;
        bool support;    // true = FOR, false = AGAINST
        uint256 weight;  // Voting power (token balance)
    }

    // ─── Constants ───────────────────────────────────────────────────────
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM_PERCENT = 10;       // 10% of supply must vote
    uint256 public constant PROPOSAL_THRESHOLD = 100;  // Must hold 100+ tokens to propose
    uint256 public constant MAX_ACTIVE_PROPOSALS = 5;  // Max concurrent proposals per token

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes; // proposalId => voter => vote
    mapping(address => uint256) public activeProposalCount;    // token => count

    uint256 public nextProposalId = 1;

    // ─── Events ──────────────────────────────────────────────────────────
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed token,
        ProposalType proposalType,
        string title
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Proposal Creation ───────────────────────────────────────────────

    /**
     * @notice Create a new governance proposal
     * @param token The idol token this proposal applies to
     * @param proposalType Category of the proposal
     * @param title Short title
     * @param description JSON-encoded proposed changes
     */
    function createProposal(
        address token,
        ProposalType proposalType,
        string calldata title,
        string calldata description
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");
        require(activeProposalCount[token] < MAX_ACTIVE_PROPOSALS, "Too many active proposals");

        // Check proposer holds enough tokens
        IIdolToken idolToken = IIdolToken(token);
        uint256 balance = idolToken.balanceOf(msg.sender);
        require(balance >= PROPOSAL_THRESHOLD, "Insufficient tokens to propose");

        uint256 totalSupply = idolToken.totalSupply();
        require(totalSupply > 0, "No supply");

        uint256 proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            token: token,
            proposalType: proposalType,
            title: title,
            description: description,
            createdAt: block.timestamp,
            votingEndsAt: block.timestamp + VOTING_PERIOD,
            snapshotSupply: totalSupply,
            votesFor: 0,
            votesAgainst: 0,
            state: ProposalState.Active,
            executed: false
        });

        activeProposalCount[token]++;

        emit ProposalCreated(proposalId, msg.sender, token, proposalType, title);
        return proposalId;
    }

    // ─── Voting ──────────────────────────────────────────────────────────

    /**
     * @notice Cast a vote on an active proposal
     * @param proposalId The proposal to vote on
     * @param support true = FOR, false = AGAINST
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id > 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp <= proposal.votingEndsAt, "Voting ended");

        Vote storage vote = votes[proposalId][msg.sender];
        require(!vote.hasVoted, "Already voted");

        // Get voting weight from token balance
        IIdolToken idolToken = IIdolToken(proposal.token);
        uint256 weight = idolToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        vote.hasVoted = true;
        vote.support = support;
        vote.weight = weight;

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    // ─── Finalization ────────────────────────────────────────────────────

    /**
     * @notice Finalize a proposal after voting period ends
     * @dev Can be called by anyone after voting period
     */
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id > 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp > proposal.votingEndsAt, "Voting not ended");

        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 quorumRequired = (proposal.snapshotSupply * QUORUM_PERCENT) / 100;

        if (totalVotes >= quorumRequired && proposal.votesFor > proposal.votesAgainst) {
            proposal.state = ProposalState.Passed;
        } else {
            proposal.state = ProposalState.Failed;
        }

        activeProposalCount[proposal.token]--;
    }

    /**
     * @notice Mark a passed proposal as executed (by owner/agent)
     * @dev The actual parameter change happens off-chain or in a separate tx
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Passed, "Not passed");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        proposal.state = ProposalState.Executed;

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel a proposal (by proposer or owner)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id > 0, "Proposal does not exist");
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(proposal.state == ProposalState.Active, "Not active");

        proposal.state = ProposalState.Cancelled;
        activeProposalCount[proposal.token]--;

        emit ProposalCancelled(proposalId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.state == ProposalState.Active && block.timestamp > proposal.votingEndsAt) {
            // Auto-calculate final state
            uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
            uint256 quorumRequired = (proposal.snapshotSupply * QUORUM_PERCENT) / 100;
            if (totalVotes >= quorumRequired && proposal.votesFor > proposal.votesAgainst) {
                return ProposalState.Passed;
            }
            return ProposalState.Failed;
        }
        return proposal.state;
    }

    /**
     * @notice Get all proposal IDs for a token (paginated)
     */
    function getProposalCount() external view returns (uint256) {
        return nextProposalId - 1;
    }
}
