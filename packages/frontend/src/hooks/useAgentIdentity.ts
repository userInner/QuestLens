import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, ERC8004_AGENT_ABI, getReadProvider, isContractDeployed } from '../services/contract'

export interface AgentIdentityData {
  agentId: number
  name: string
  description: string
  modelProvider: string
  modelId: string
  personality: string
  operator: string
  capabilities: string[]
  createdAt: number
  active: boolean
  isLoading: boolean
  error: string | null
}

const CAP_TRADING = 1
const CAP_CONTENT = 2
const CAP_SOCIAL = 4
const CAP_GOVERNANCE = 8

function parseCapabilities(capBytes: bigint): string[] {
  const caps: string[] = []
  const num = Number(capBytes)
  if (num & CAP_TRADING) caps.push('Trading')
  if (num & CAP_CONTENT) caps.push('Content')
  if (num & CAP_SOCIAL) caps.push('Social')
  if (num & CAP_GOVERNANCE) caps.push('Governance')
  return caps
}

/**
 * Hook to read ERC-8004 Agent Identity from chain.
 * Looks up by operator address (the agent/idol creator).
 */
export function useAgentIdentity(operatorAddress?: string): AgentIdentityData {
  const [data, setData] = useState<AgentIdentityData>({
    agentId: 0,
    name: '',
    description: '',
    modelProvider: '',
    modelId: '',
    personality: '',
    operator: '',
    capabilities: [],
    createdAt: 0,
    active: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    async function fetch() {
      const registryAddress = CONTRACT_ADDRESSES.erc8004Agent
      if (!isContractDeployed(registryAddress) || !operatorAddress) {
        // Fallback data when contract not available
        setData({
          agentId: 1,
          name: 'Vivian',
          description: 'A rebellious AI trader with a taste for chaos and profits',
          modelProvider: 'deepseek',
          modelId: 'v4-flash',
          personality: '{"traits":["rebellious","sarcastic","crypto-native"],"trading_style":"aggressive"}',
          operator: operatorAddress || '0x0',
          capabilities: ['Trading', 'Content', 'Social'],
          createdAt: Date.now() / 1000,
          active: true,
          isLoading: false,
          error: null,
        })
        return
      }

      try {
        const provider = getReadProvider()
        const contract = new ethers.Contract(registryAddress, ERC8004_AGENT_ABI, provider)

        // Get agent ID by operator
        const agentId = await contract.agentIdByOperator(operatorAddress)
        if (Number(agentId) === 0) {
          setData(prev => ({ ...prev, isLoading: false, error: 'No agent registered for this operator' }))
          return
        }

        // Get full agent data
        const agent = await contract.getAgent(agentId)

        setData({
          agentId: Number(agentId),
          name: agent.name,
          description: agent.description,
          modelProvider: agent.modelProvider,
          modelId: agent.modelId,
          personality: agent.personality,
          operator: agent.operator,
          capabilities: parseCapabilities(BigInt(agent.capabilities)),
          createdAt: Number(agent.createdAt),
          active: agent.active,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        console.warn('Failed to fetch agent identity:', err)
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to read ERC-8004',
        }))
      }
    }

    fetch()
  }, [operatorAddress])

  return data
}
