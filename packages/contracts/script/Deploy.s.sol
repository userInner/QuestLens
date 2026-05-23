// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {ITaskEscrow} from "../src/interfaces/ITaskEscrow.sol";
import {IReputationRegistry} from "../src/interfaces/IReputationRegistry.sol";
import {MockUSDT} from "../src/test/MockUSDT.sol";

/// @title Deploy
/// @notice Deploys the QuestLens protocol to a target network with hackathon-friendly defaults.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address governance = vm.envOr("GOVERNANCE_ADDRESS", vm.addr(deployerKey));
        address treasury = vm.envOr("PROTOCOL_TREASURY", vm.addr(deployerKey));
        address rewardPool = vm.envOr("COMMUNITY_REWARD_POOL", vm.addr(deployerKey));

        vm.startBroadcast(deployerKey);

        // 1) Deploy mock USDT for testnet (skip on mainnet by passing MOCK_USDT_ADDRESS).
        address mockUsdt = vm.envOr("MOCK_USDT_ADDRESS", address(0));
        if (mockUsdt == address(0)) {
            mockUsdt = address(new MockUSDT());
        }

        // 2) Deploy ReputationRegistry first (governance only; TaskEscrow address wired in step 4).
        ReputationRegistry registry = new ReputationRegistry(governance, 0);

        // 3) Deploy TaskEscrow with Phase 1 parameters.
        ITaskEscrow.Parameters memory params = ITaskEscrow.Parameters({
            minBounty: 0.5e6, // 0.5 USDT (6 decimals)
            maxBounty: 2.0e6, // 2.0 USDT
            workerStakeAmount: 0.1e6, // 0.1 USDT
            protocolFeeBps: 500, // 5%
            slashRewardPoolBps: 5000, // 50%
            slashTreasuryBps: 5000, // 50%
            taskTimeout: 72 hours,
            submissionDeadline: 1 hours,
            challengePeriod: 24 hours,
            layer3CostCap: 0.1e6
        });

        TaskEscrow escrow = new TaskEscrow(
            IReputationRegistry(address(registry)), governance, treasury, rewardPool, params
        );

        // 4) Wire registry -> escrow and whitelist mUSDT.
        registry.setTaskEscrow(address(escrow));
        escrow.setStablecoinAllowed(mockUsdt, true);

        vm.stopBroadcast();

        console2.log("MockUSDT:           ", mockUsdt);
        console2.log("ReputationRegistry: ", address(registry));
        console2.log("TaskEscrow:         ", address(escrow));
        console2.log("Governance:         ", governance);
        console2.log("Treasury:           ", treasury);
        console2.log("RewardPool:         ", rewardPool);
    }
}
