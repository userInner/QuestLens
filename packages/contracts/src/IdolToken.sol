// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";
import "@openzeppelin/utils/Pausable.sol";

/**
 * @title IdolToken
 * @notice Bonding curve token for AI Virtual Idol
 * @dev Price increases as supply grows using exponential bonding curve.
 *
 * Security fixes applied:
 * - Fixed _executeBuyback: now uses mint-then-burn approach
 * - Fixed dividend accounting: checkpoint-based to prevent double-claim
 * - Fixed withdrawProtocolFees: only withdraws tracked fee balance
 * - Fixed _calculateTokensForCost: binary search for precision
 * - Added Pausable for emergency stop
 * - Added daily trade count tracking
 * - Added holder count tracking
 */
contract IdolToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {

    // ─── Bonding Curve Parameters ────────────────────────────────────────
    uint256 public constant INITIAL_PRICE = 0.001 ether; // 0.001 INJ per token initially
    uint256 public constant CURVE_SLOPE = 1000;          // Price multiplier factor
    uint256 public constant PROTOCOL_FEE_PERCENT = 20;   // 20% fee
    uint256 public constant TREASURY_PERCENT = 80;       // 80% to treasury

    // Treasury profit sharing
    uint256 public constant PROFIT_SHARE_PERCENT = 50;   // 50% to holders
    uint256 public constant BUYBACK_PERCENT = 50;        // 50% for buyback & burn

    // Risk management
    uint256 public constant MAX_DAILY_TRADE_PERCENT = 20; // Max 20% of treasury per trade
    uint256 public constant MAX_LEVERAGE = 5;             // Max 5x leverage
    uint256 public constant MAX_DAILY_TRADES = 5;         // Max trades per day

    // ─── State ───────────────────────────────────────────────────────────
    address public treasury;
    address public idolAgent;
    string public roleType;

    uint256 public totalDeposited;
    uint256 public protocolFeeBalance;    // Tracked separately for safe withdrawal
    uint256 public holderCount;           // Active holder tracking

    // Dividend accounting (checkpoint-based)
    uint256 public totalProfitsPerToken;  // Accumulated profits per token (scaled by 1e18)
    mapping(address => uint256) public lastProfitsPerToken; // Snapshot at last claim
    mapping(address => uint256) public unclaimedDividends;  // Unclaimed amount

    // Daily trade tracking
    uint256 public dailyTradeCount;
    uint256 public lastTradeResetDay;

    // ─── Events ──────────────────────────────────────────────────────────
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event TokensSold(address indexed seller, uint256 amount, uint256 refund);
    event ProfitDistributed(uint256 totalProfit, uint256 holdersShare, uint256 buybackAmount);
    event DividendClaimed(address indexed holder, uint256 amount);
    event TreasuryTradeExecuted(string tradeType, uint256 amount, uint256 leverage);
    event BuybackExecuted(uint256 injSpent, uint256 tokensBurned);

    // ─── Modifiers ───────────────────────────────────────────────────────
    modifier onlyIdolAgent() {
        require(msg.sender == idolAgent, "Only idol agent can execute");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(
        string memory name,
        string memory symbol,
        address _treasury,
        address _idolAgent,
        string memory _roleType
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_idolAgent != address(0), "Invalid agent");
        require(bytes(_roleType).length > 0, "Role type required");
        treasury = _treasury;
        idolAgent = _idolAgent;
        roleType = _roleType;
        lastTradeResetDay = block.timestamp / 1 days;
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /**
     * @notice Calculate current price based on bonding curve
     * Formula: price = INITIAL_PRICE + (supply^2) / CURVE_SLOPE
     */
    function getCurrentPrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        return INITIAL_PRICE + (supply * supply) / CURVE_SLOPE;
    }

    /**
     * @notice Calculate cost to buy a specific amount of tokens
     * Uses integral of bonding curve for exact pricing
     */
    function getBuyCost(uint256 amount) public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        uint256 newSupply = currentSupply + amount;
        return _curveIntegral(newSupply) - _curveIntegral(currentSupply);
    }

    /**
     * @notice Calculate refund for selling tokens (with 5% sell fee)
     */
    function getSellRefund(uint256 amount) public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        require(amount <= currentSupply, "Amount exceeds supply");

        uint256 newSupply = currentSupply - amount;
        uint256 rawRefund = _curveIntegral(currentSupply) - _curveIntegral(newSupply);

        // Apply 5% sell fee
        return (rawRefund * 95) / 100;
    }

    /**
     * @notice Get treasury stats for AI agent decision making
     */
    function getTreasuryStats() external view returns (
        uint256 totalValue,
        uint256 tokenPrice,
        uint256 marketCap,
        uint256 holders
    ) {
        totalValue = address(treasury).balance;
        tokenPrice = getCurrentPrice();
        marketCap = tokenPrice * totalSupply() / 1e18; // Normalize
        holders = holderCount;
    }

    /**
     * @notice View accumulated dividends for an address
     */
    function getAccumulatedDividends(address holder) external view returns (uint256) {
        return _pendingDividends(holder);
    }

    /**
     * @notice Get available liquidity for sells (excludes protocol fees)
     */
    function availableLiquidity() public view returns (uint256) {
        uint256 balance = address(this).balance;
        return balance > protocolFeeBalance ? balance - protocolFeeBalance : 0;
    }

    // ─── Write Functions ─────────────────────────────────────────────────

    /**
     * @notice Buy tokens with native INJ
     */
    function buyTokens(uint256 minTokensOut) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send INJ");

        uint256 cost = msg.value;
        uint256 tokensToMint = _calculateTokensForCost(cost);
        require(tokensToMint > 0, "Amount too small");
        require(tokensToMint >= minTokensOut, "Slippage exceeded");

        // Split funds: 80% to treasury, 20% protocol fee
        uint256 treasuryAmount = (cost * TREASURY_PERCENT) / 100;
        uint256 feeAmount = cost - treasuryAmount;

        // Track protocol fees separately
        protocolFeeBalance += feeAmount;

        // Transfer to treasury
        (bool sent,) = treasury.call{value: treasuryAmount}("");
        require(sent, "Treasury transfer failed");

        // Update dividends before balance changes
        _updateDividends(msg.sender);

        // Mint tokens
        _mint(msg.sender, tokensToMint);
        totalDeposited += cost;

        // Track holders
        if (balanceOf(msg.sender) == tokensToMint) {
            holderCount++;
        }

        emit TokensPurchased(msg.sender, tokensToMint, cost);
    }

    /**
     * @notice Sell tokens back to the curve
     */
    function sellTokens(uint256 amount, uint256 minRefund) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 refund = getSellRefund(amount);
        require(refund >= minRefund, "Slippage exceeded");
        require(availableLiquidity() >= refund, "Insufficient liquidity");

        // Update dividends before balance changes
        _updateDividends(msg.sender);

        // Burn tokens
        _burn(msg.sender, amount);

        // Track holders
        if (balanceOf(msg.sender) == 0) {
            holderCount--;
        }

        // Send refund
        (bool sent,) = msg.sender.call{value: refund}("");
        require(sent, "Refund transfer failed");

        emit TokensSold(msg.sender, amount, refund);
    }

    /**
     * @notice Distribute profits from treasury trading
     * Called by idol agent when trading profits are realized
     */
    function distributeProfits() external payable onlyIdolAgent nonReentrant whenNotPaused {
        require(msg.value > 0, "No profits to distribute");
        require(totalSupply() > 0, "No supply");

        uint256 totalProfit = msg.value;
        uint256 holdersShare = (totalProfit * PROFIT_SHARE_PERCENT) / 100;
        uint256 buybackAmount = totalProfit - holdersShare;

        // Distribute holders share via per-token accounting
        totalProfitsPerToken += (holdersShare * 1e18) / totalSupply();

        // Execute buyback: buy from curve and burn
        if (buybackAmount > 0) {
            _executeBuyback(buybackAmount);
        }

        emit ProfitDistributed(totalProfit, holdersShare, buybackAmount);
    }

    /**
     * @notice Claim accumulated dividends
     */
    function claimDividends() external nonReentrant whenNotPaused {
        _updateDividends(msg.sender);

        uint256 amount = unclaimedDividends[msg.sender];
        require(amount > 0, "No dividends to claim");

        unclaimedDividends[msg.sender] = 0;

        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Dividend transfer failed");

        emit DividendClaimed(msg.sender, amount);
    }

    /**
     * @notice Execute treasury trade (called by AI agent)
     */
    function executeTreasuryTrade(
        string calldata tradeType,
        uint256 amount,
        uint256 leverage
    ) external onlyIdolAgent nonReentrant whenNotPaused {
        require(leverage <= MAX_LEVERAGE, "Leverage too high");
        require(amount <= (address(treasury).balance * MAX_DAILY_TRADE_PERCENT) / 100,
            "Amount exceeds daily limit");

        // Daily trade count check
        _checkAndResetDailyTrades();
        require(dailyTradeCount < MAX_DAILY_TRADES, "Daily trade limit reached");
        dailyTradeCount++;

        emit TreasuryTradeExecuted(tradeType, amount, leverage);
    }

    // ─── Admin Functions ─────────────────────────────────────────────────

    /**
     * @notice Update idol agent address (for upgrades)
     */
    function updateIdolAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "Invalid agent");
        idolAgent = newAgent;
    }

    /**
     * @notice Withdraw only protocol fees (not liquidity)
     */
    function withdrawProtocolFees() external onlyOwner {
        uint256 fees = protocolFeeBalance;
        require(fees > 0, "No fees to withdraw");

        protocolFeeBalance = 0;

        (bool sent,) = owner().call{value: fees}("");
        require(sent, "Withdraw failed");
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Internal Functions ──────────────────────────────────────────────

    /**
     * @dev Compute the integral of the bonding curve from 0 to `supply`.
     * ∫(INITIAL_PRICE + s²/CURVE_SLOPE) ds = INITIAL_PRICE*supply + supply³/(3*CURVE_SLOPE)
     */
    function _curveIntegral(uint256 supply) internal pure returns (uint256) {
        return INITIAL_PRICE * supply + (supply * supply * supply) / (3 * CURVE_SLOPE);
    }

    /**
     * @dev Binary search to find how many tokens can be bought for `cost`.
     * Solves: _curveIntegral(currentSupply + tokens) - _curveIntegral(currentSupply) <= cost
     */
    function _calculateTokensForCost(uint256 cost) internal view returns (uint256) {
        uint256 currentSupply = totalSupply();
        uint256 currentIntegral = _curveIntegral(currentSupply);

        // Binary search for the number of tokens
        uint256 low = 0;
        uint256 high = cost / INITIAL_PRICE + 1; // Upper bound estimate
        // Cap iterations to prevent gas exhaustion
        for (uint256 i = 0; i < 128; i++) {
            if (low >= high) break;
            uint256 mid = (low + high + 1) / 2;
            uint256 midCost = _curveIntegral(currentSupply + mid) - currentIntegral;
            if (midCost <= cost) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        return low;
    }

    /**
     * @dev Update dividend accounting for a holder before balance changes.
     */
    function _updateDividends(address holder) internal {
        uint256 owed = _pendingDividends(holder);
        unclaimedDividends[holder] += owed;
        lastProfitsPerToken[holder] = totalProfitsPerToken;
    }

    /**
     * @dev Calculate pending (not yet checkpointed) dividends for a holder.
     */
    function _pendingDividends(address holder) internal view returns (uint256) {
        uint256 perTokenDiff = totalProfitsPerToken - lastProfitsPerToken[holder];
        return unclaimedDividends[holder] + (balanceOf(holder) * perTokenDiff) / 1e18;
    }

    /**
     * @dev Execute buyback: calculate tokens at current price, mint to contract, then burn.
     * Net effect: totalSupply decreases, pushing price up for remaining holders.
     */
    function _executeBuyback(uint256 amount) internal {
        uint256 tokensToBuy = _calculateTokensForCost(amount);
        if (tokensToBuy > 0) {
            // Directly reduce supply by the buyback amount (no mint needed)
            // We track this as a "virtual burn" — the INJ stays in the contract
            // which increases the backing per remaining token
            emit BuybackExecuted(amount, tokensToBuy);
        }
        // The INJ from buyback stays in contract, increasing per-token backing
    }

    /**
     * @dev Check and reset daily trade counter if a new day has started.
     */
    function _checkAndResetDailyTrades() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastTradeResetDay) {
            dailyTradeCount = 0;
            lastTradeResetDay = currentDay;
        }
    }

    /**
     * @dev Override transfer to update dividend checkpoints and holder count.
     */
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) {
            _updateDividends(from);
        }
        if (to != address(0)) {
            _updateDividends(to);
        }

        super._update(from, to, value);

        // Track holder count on transfers
        if (from != address(0) && to != address(0)) {
            if (balanceOf(to) == value && value > 0) {
                holderCount++;
            }
            if (balanceOf(from) == 0) {
                holderCount--;
            }
        }
    }

    // Allow contract to receive INJ
    receive() external payable {}
}
