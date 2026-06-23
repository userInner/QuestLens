import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  IDOL_FACTORY_ABI,
  IDOL_TOKEN_ABI,
  getReadProvider,
  isContractDeployed,
  formatInj,
} from '../services/contract'

export interface IdolListItem {
  id: number
  name: string
  symbol: string
  roleType: string
  personality: { traits?: string[]; trading_style?: string; description?: string }
  tokenAddress: string
  treasuryAddress: string
  agentAddress: string
  createdAt: number
  active: boolean
  // Live data
  currentPrice: number
  totalSupply: number
  treasuryValue: number
  holderCount: number
}

interface ExploreState {
  idols: IdolListItem[]
  isLoading: boolean
  error: string | null
}

// Hard-coded first idol (deployed via script) as fallback
const SEED_IDOL: IdolListItem = {
  id: 1,
  name: 'Vivian Token',
  symbol: 'VIVIAN',
  roleType: 'trader',
  personality: { traits: ['rebellious', 'sarcastic', 'crypto-native'], trading_style: 'aggressive' },
  tokenAddress: '0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827',
  treasuryAddress: '0xD418D85734e92B521119AAb41e15134AC13bce9b',
  agentAddress: '0xD418D85734e92B521119AAb41e15134AC13bce9b',
  createdAt: Date.now() / 1000,
  active: true,
  currentPrice: 0.001,
  totalSupply: 0,
  treasuryValue: 0,
  holderCount: 0,
}

/**
 * Hook that reads all idols from IdolFactory and fetches live token data for each.
 */
export function useExplore() {
  const [state, setState] = useState<ExploreState>({
    idols: [],
    isLoading: true,
    error: null,
  })

  const fetchIdols = useCallback(async () => {
    const factoryAddress = CONTRACT_ADDRESSES.idolFactory

    if (!isContractDeployed(factoryAddress)) {
      // Demo mode with seed data
      setState({ idols: [SEED_IDOL], isLoading: false, error: null })
      return
    }

    try {
      const provider = getReadProvider()
      const factory = new ethers.Contract(factoryAddress, IDOL_FACTORY_ABI, provider)

      // Get all active idols from factory
      const activeIdols = await factory.getActiveIdols()

      // Fetch live token data for each idol
      const idolsWithData: IdolListItem[] = await Promise.all(
        activeIdols.map(async (idol: { token: string; treasury: string; idolAgent: string; name: string; symbol: string; roleType: string; personality: string; createdAt: bigint; active: boolean }, index: number) => {
          let currentPrice = 0.001
          let totalSupply = 0
          let treasuryValue = 0
          let holderCount = 0

          // Try to read token contract data
          try {
            const token = new ethers.Contract(idol.token, IDOL_TOKEN_ABI, provider)
            const [priceWei, supplyRaw, stats] = await Promise.all([
              token.getCurrentPrice(),
              token.totalSupply(),
              token.getTreasuryStats(),
            ])
            currentPrice = Number(formatInj(priceWei))
            totalSupply = Number(supplyRaw)
            treasuryValue = Number(formatInj(stats.totalValue))
            holderCount = Number(stats.holders)
          } catch {
            // Token data fetch failed, use defaults
          }

          // Parse personality JSON
          let personality: IdolListItem['personality'] = {}
          try {
            personality = JSON.parse(idol.personality)
          } catch {
            personality = { description: idol.personality }
          }

          return {
            id: index + 1,
            name: idol.name,
            symbol: idol.symbol.replace(' Token', ''),
            roleType: idol.roleType,
            personality,
            tokenAddress: idol.token,
            treasuryAddress: idol.treasury,
            agentAddress: idol.idolAgent,
            createdAt: Number(idol.createdAt),
            active: idol.active,
            currentPrice,
            totalSupply,
            treasuryValue,
            holderCount,
          } satisfies IdolListItem
        })
      )

      setState({ idols: idolsWithData, isLoading: false, error: null })
    } catch (err) {
      console.error('Failed to fetch idols:', err)
      // Fallback to seed data on error
      setState({ idols: [SEED_IDOL], isLoading: false, error: null })
    }
  }, [])

  useEffect(() => {
    fetchIdols()
  }, [fetchIdols])

  return {
    ...state,
    refetch: fetchIdols,
  }
}
