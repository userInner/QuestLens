// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDT
/// @notice Test-only ERC20 with 6 decimals matching USDT semantics. Anyone can mint.
/// @dev Used for the hackathon demo on Injective testnet because native USDT may be unavailable.
contract MockUSDT is ERC20 {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USDT", "mUSDT") {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
