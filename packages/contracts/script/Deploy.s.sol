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

        // 4) Wire registry -> escrow, register deployer as Relayer (Phase 1 demo), and whitelist mUSDT.
        registry.setTaskEscrow(address(escrow));
        registry.bootstrapRelayer(vm.addr(deployerKey), "https://relayer.questlens.io/attestation/latest.json");
        escrow.setStablecoinAllowed(mockUsdt, true);

        // 5) Mint demo balances so the frontend works out-of-the-box on a fresh chain.
        //    Anvil-deterministic accounts: #1 = requester, #2 = worker.
        address requester = vm.envOr("REQUESTER_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));
        address worker = vm.envOr("WORKER_ADDRESS", address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC));
        MockUSDT(mockUsdt).mint(requester, 10_000_000); // 10 mUSDT
        MockUSDT(mockUsdt).mint(worker, 10_000_000);    // 10 mUSDT

        vm.stopBroadcast();

        console2.log("MockUSDT:           ", mockUsdt);
        console2.log("ReputationRegistry: ", address(registry));
        console2.log("TaskEscrow:         ", address(escrow));
        console2.log("Governance:         ", governance);
        console2.log("Treasury:           ", treasury);
        console2.log("RewardPool:         ", rewardPool);
    }
}
