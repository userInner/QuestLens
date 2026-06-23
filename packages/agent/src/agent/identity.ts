/**
 * ERC-8004 Identity Verification
 * 
 * Ensures the agent is registered on-chain before operating.
 * Validates capabilities (TRADING, CONTENT, SOCIAL) at startup.
 */

import { ethers } from 'ethers';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const ERC8004_ABI = [
  'function getAgentByOperator(address operator) view returns (tuple(string name, string description, string modelProvider, string modelId, string personality, address operator, bytes32 capabilities, uint256 createdAt, bool active))',
  'function agentIdByOperator(address operator) view returns (uint256)',
  'function hasCapability(uint256 agentId, uint256 cap) view returns (bool)',
];

// Capability bits (must match contract)
export const CAP_TRADING = 1;
export const CAP_CONTENT = 2;
export const CAP_SOCIAL = 4;
export const CAP_GOVERNANCE = 8;

export interface AgentIdentity {
  agentId: number;
  name: string;
  description: string;
  modelProvider: string;
  modelId: string;
  personality: string;
  operator: string;
  capabilities: number;
  createdAt: number;
  active: boolean;
  // Parsed capabilities
  canTrade: boolean;
  canContent: boolean;
  canSocial: boolean;
  canGovernance: boolean;
}

/**
 * Verify the agent's ERC-8004 identity on-chain.
 * Returns the identity or throws if not registered / inactive.
 */
export async function verifyAgentIdentity(config: Config): Promise<AgentIdentity> {
  const erc8004Address = config.ERC8004_AGENT_ADDRESS;
  if (!erc8004Address) {
    throw new Error('ERC8004_AGENT_ADDRESS not configured');
  }

  const provider = new ethers.JsonRpcProvider(config.INJECTIVE_RPC);
  const wallet = new ethers.Wallet(config.AGENT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(erc8004Address, ERC8004_ABI, provider);

  logger.info('🔐 Verifying ERC-8004 identity...');
  logger.info(`   Operator: ${wallet.address}`);
  logger.info(`   Registry: ${erc8004Address}`);

  // Check if this operator has a registered agent
  const agentId = await contract.agentIdByOperator(wallet.address);
  if (Number(agentId) === 0) {
    throw new Error(`Agent not registered in ERC-8004. Operator ${wallet.address} has no agent NFT.`);
  }

  // Fetch agent identity
  const raw = await contract.getAgentByOperator(wallet.address);

  const capabilities = Number(BigInt(raw.capabilities));
  const identity: AgentIdentity = {
    agentId: Number(agentId),
    name: raw.name,
    description: raw.description,
    modelProvider: raw.modelProvider,
    modelId: raw.modelId,
    personality: raw.personality,
    operator: raw.operator,
    capabilities,
    createdAt: Number(raw.createdAt),
    active: raw.active,
    canTrade: (capabilities & CAP_TRADING) !== 0,
    canContent: (capabilities & CAP_CONTENT) !== 0,
    canSocial: (capabilities & CAP_SOCIAL) !== 0,
    canGovernance: (capabilities & CAP_GOVERNANCE) !== 0,
  };

  // Validate
  if (!identity.active) {
    throw new Error(`Agent #${identity.agentId} "${identity.name}" is DEACTIVATED. Cannot operate.`);
  }

  if (!identity.canTrade) {
    throw new Error(`Agent #${identity.agentId} "${identity.name}" does NOT have TRADING capability.`);
  }

  logger.info(`   ✅ Identity verified: ${identity.name} (#${identity.agentId})`);
  logger.info(`   Model: ${identity.modelProvider}/${identity.modelId}`);
  logger.info(`   Capabilities: ${formatCapabilities(identity)}`);
  logger.info(`   Active: ${identity.active}`);

  return identity;
}

function formatCapabilities(identity: AgentIdentity): string {
  const caps = [];
  if (identity.canTrade) caps.push('TRADING');
  if (identity.canContent) caps.push('CONTENT');
  if (identity.canSocial) caps.push('SOCIAL');
  if (identity.canGovernance) caps.push('GOVERNANCE');
  return caps.join(' | ') || 'NONE';
}
