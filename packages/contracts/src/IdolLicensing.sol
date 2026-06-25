// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/access/Ownable.sol";

interface IToken {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/**
 * @title IdolLicensing
 * @notice Controls who can use an idol's likeness in AI content (short dramas, etc.)
 * @dev Usage rights are determined by token holding percentage:
 *
 *   - 10%+ of supply: BASIC license (can use likeness in community content)
 *   - 20%+ of supply: STANDARD license (can use in commercial AI short dramas)
 *   - 50%+ of supply: EXCLUSIVE license (exclusive rights for a time period)
 *
 * Revenue from licensed content flows back to the idol's Treasury,
 * which then distributes to ALL holders via dividends.
 */
contract IdolLicensing is Ownable {

    // ─── License Tiers ───────────────────────────────────────────────────
    enum LicenseTier {
        None,       // < 10% — no usage rights
        Basic,      // >= 10% — community content, fan creations
        Standard,   // >= 20% — commercial AI short dramas, variety shows
        Exclusive   // >= 50% — exclusive usage for a period
    }

    // ─── Thresholds (in basis points, 10000 = 100%) ──────────────────────
    uint256 public constant BASIC_THRESHOLD = 1000;     // 10%
    uint256 public constant STANDARD_THRESHOLD = 2000;  // 20%
    uint256 public constant EXCLUSIVE_THRESHOLD = 5000; // 50%

    // ─── License Records ─────────────────────────────────────────────────
    struct LicenseGrant {
        address licensee;
        address token;
        LicenseTier tier;
        uint256 grantedAt;
        uint256 expiresAt;
        string contentType;   // e.g., "short_drama", "variety_show", "advertisement"
        string contentId;     // External reference to the content
        bool active;
    }

    mapping(uint256 => LicenseGrant) public licenses;
    uint256 public nextLicenseId = 1;

    // ─── Events ──────────────────────────────────────────────────────────
    event LicenseGranted(
        uint256 indexed licenseId,
        address indexed licensee,
        address indexed token,
        LicenseTier tier,
        string contentType
    );
    event LicenseRevoked(uint256 indexed licenseId);
    event ContentRegistered(uint256 indexed licenseId, string contentId);

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Core Functions ──────────────────────────────────────────────────

    /**
     * @notice Check what license tier a holder qualifies for
     * @param token The idol token address
     * @param holder The address to check
     * @return tier The license tier they qualify for
     */
    function getLicenseTier(address token, address holder) public view returns (LicenseTier) {
        IToken t = IToken(token);
        uint256 balance = t.balanceOf(holder);
        uint256 supply = t.totalSupply();

        if (supply == 0) return LicenseTier.None;

        uint256 holdingBps = (balance * 10000) / supply;

        if (holdingBps >= EXCLUSIVE_THRESHOLD) return LicenseTier.Exclusive;
        if (holdingBps >= STANDARD_THRESHOLD) return LicenseTier.Standard;
        if (holdingBps >= BASIC_THRESHOLD) return LicenseTier.Basic;

        return LicenseTier.None;
    }

    /**
     * @notice Request a license to use an idol's likeness
     * @dev Caller must hold enough tokens to qualify for the requested tier
     * @param token The idol token
     * @param requestedTier The tier being requested
     * @param contentType Type of content (e.g., "short_drama")
     * @param durationDays How long the license is valid
     */
    function requestLicense(
        address token,
        LicenseTier requestedTier,
        string calldata contentType,
        uint256 durationDays
    ) external returns (uint256) {
        require(requestedTier != LicenseTier.None, "Invalid tier");
        require(durationDays > 0 && durationDays <= 365, "Invalid duration");

        LicenseTier qualifiedTier = getLicenseTier(token, msg.sender);
        require(uint256(qualifiedTier) >= uint256(requestedTier), "Insufficient holdings for this tier");

        uint256 licenseId = nextLicenseId++;

        licenses[licenseId] = LicenseGrant({
            licensee: msg.sender,
            token: token,
            tier: requestedTier,
            grantedAt: block.timestamp,
            expiresAt: block.timestamp + (durationDays * 1 days),
            contentType: contentType,
            contentId: "",
            active: true
        });

        emit LicenseGranted(licenseId, msg.sender, token, requestedTier, contentType);
        return licenseId;
    }

    /**
     * @notice Register content produced under a license
     */
    function registerContent(uint256 licenseId, string calldata contentId) external {
        LicenseGrant storage license = licenses[licenseId];
        require(license.licensee == msg.sender, "Not licensee");
        require(license.active, "License not active");
        require(block.timestamp <= license.expiresAt, "License expired");

        license.contentId = contentId;
        emit ContentRegistered(licenseId, contentId);
    }

    /**
     * @notice Check if a license is currently valid
     */
    function isLicenseValid(uint256 licenseId) external view returns (bool) {
        LicenseGrant storage license = licenses[licenseId];
        if (!license.active) return false;
        if (block.timestamp > license.expiresAt) return false;

        // Re-verify holdings (holder might have sold)
        LicenseTier currentTier = getLicenseTier(license.token, license.licensee);
        return uint256(currentTier) >= uint256(license.tier);
    }

    /**
     * @notice Revoke a license (by owner or if holder sells below threshold)
     */
    function revokeLicense(uint256 licenseId) external {
        LicenseGrant storage license = licenses[licenseId];
        require(
            msg.sender == owner() || msg.sender == license.licensee,
            "Not authorized"
        );
        license.active = false;
        emit LicenseRevoked(licenseId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getLicense(uint256 licenseId) external view returns (LicenseGrant memory) {
        return licenses[licenseId];
    }

    /**
     * @notice Get human-readable description of holding requirements
     */
    function getTierRequirements() external pure returns (string memory) {
        return "Basic: 10% of supply | Standard: 20% | Exclusive: 50%";
    }
}
