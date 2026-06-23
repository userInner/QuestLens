// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/IdolToken.sol";
import "../src/IdolFactory.sol";
import "../src/ERC8004Agent.sol";

/**
 * @title Deploy
 * @notice Deployment script for NovaIdol contracts
 *
 * Usage:
 *   # Set environment variables
 *   export PRIVATE_KEY=0x...
 *   export IDOL_AGENT_ADDRESS=0x...
 *   export TREASURY_ADDRESS=0x...       # Optional, defaults to IDOL_AGENT_ADDRESS
 *   export IDOL_ROLE_TYPE=trader         # Optional, defaults to "trader"
 *
 *   # Deploy to Injective EVM Testnet
 *   forge script script/Deploy.s.sol \
 *     --rpc-url https://k8s.testnet.json-rpc.injective.network/ \
 *     --broadcast --verify
 */
contract Deploy is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address idolAgent = vm.envAddress("IDOL_AGENT_ADDRESS");
        address treasuryAddress = vm.envOr("TREASURY_ADDRESS", idolAgent);
        string memory roleType = vm.envOr("IDOL_ROLE_TYPE", string("trader"));

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 Agent Registry
        ERC8004Agent agentRegistry = new ERC8004Agent();
        console.log("ERC8004Agent deployed at:", address(agentRegistry));

        // 2. Deploy Idol Factory
        IdolFactory factory = new IdolFactory();
        console.log("IdolFactory deployed at:", address(factory));

        // 3. Create a sample idol for testing
        string memory personality = '{"traits":["rebellious","sarcastic","crypto-native"],"trading_style":"aggressive","communication":"twitter-native"}';

        uint256 creationFee = factory.creationFee();
        console.log("Creation fee:", creationFee);

        uint256 idolId = factory.createIdol{value: creationFee}(
            "Vivian Token",
            "VIVIAN",
            idolAgent,
            treasuryAddress,
            roleType,
            personality
        );

        IdolFactory.IdolInfo memory idol = factory.getIdol(idolId);
        console.log("");
        console.log("=== Sample Idol Created ===");
        console.log("  ID:", idolId);
        console.log("  Token:", idol.token);
        console.log("  Treasury:", idol.treasury);
        console.log("  Agent:", idol.idolAgent);
        console.log("  Role:", idol.roleType);
        console.log("");

        // 4. Register agent identity in ERC-8004
        bytes32 capabilities = bytes32(uint256(1 | 2 | 4)); // TRADING + CONTENT + SOCIAL
        uint256 agentNftId = agentRegistry.registerAgent(
            "Vivian",
            "A rebellious AI trader with a taste for chaos and profits",
            "azure-openai",
            "gpt-4",
            personality,
            capabilities
        );
        console.log("=== Agent Identity Registered ===");
        console.log("  NFT ID:", agentNftId);
        console.log("  Registry:", address(agentRegistry));

        vm.stopBroadcast();

        // Print summary for frontend .env
        console.log("");
        console.log("=== Add to frontend .env ===");
        console.log("VITE_IDOL_TOKEN_ADDRESS=", idol.token);
        console.log("VITE_IDOL_FACTORY_ADDRESS=", address(factory));
        console.log("VITE_ERC8004_AGENT_ADDRESS=", address(agentRegistry));
        console.log("VITE_EVM_RPC_URL=https://k8s.testnet.json-rpc.injective.network/");
    }
}
