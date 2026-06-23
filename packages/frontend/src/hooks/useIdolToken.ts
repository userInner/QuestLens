import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getIdolTokenContract,
  formatInj,
  formatTokens,
  isContractDeployed,
  CONTRACT_ADDRESSES,
  BondingCurve,
} from '../services/contract'
import { useWalletStore } from '../store/useWalletStore'

export interface IdolTokenData {
  // Token info
  name: string
  symbol: string
  
  // Bonding curve state
  currentPrice: number       // INJ per token
  totalSupply: number        // Total token supply (in token units)
  
  // Treasury info
  treasuryValue: number      // Treasury balance in INJ
  marketCap: number          // currentPrice * totalSupply
  holderCount: number
  totalDeposited: number     // Total INJ deposited via bonding curve
  totalProfits: number       // Total profits distributed
  
  // User-specific (if wallet connected)
  userBalance: number        // User's token balance
  userDividends: number      // Unclaimed dividends
  
  // Chart data
  curvePoints: Array<{ supply: number; price: number }>
  
  // State
  isLoading: boolean
  isContractLive: boolean    // Whether contract is deployed
  error: string | null
}

const INITIAL_STATE: IdolTokenData = {
  name: 'Vivian Token',
  symbol: 'VIVIAN',
  currentPrice: BondingCurve.INITIAL_PRICE,
  totalSupply: 0,
  treasuryValue: 0,
  marketCap: 0,
  holderCount: 0,
  totalDeposited: 0,
  totalProfits: 0,
  userBalance: 0,
  userDividends: 0,
  curvePoints: BondingCurve.generateCurvePoints(0),
  isLoading: true,
  isContractLive: false,
  error: null,
}

// Simulated demo data when contract is not deployed
const DEMO_STATE: IdolTokenData = {
  name: 'Vivian Token',
  symbol: 'VIVIAN',
  currentPrice: 0.001,
  totalSupply: 500000,
  treasuryValue: 10.5,
  marketCap: 1050,
  holderCount: 42,
  totalDeposited: 12.8,
  totalProfits: 2.3,
  userBalance: 0,
  userDividends: 0,
  curvePoints: BondingCurve.generateCurvePoints(500000),
  isLoading: false,
  isContractLive: false,
  error: null,
}

/**
 * Hook for reading IdolToken on-chain state.
 * Falls back to demo data if the contract is not deployed yet.
 * Polls every `pollInterval` ms when active.
 */
export function useIdolToken(tokenAddress?: string, pollInterval = 15_000) {
  const [data, setData] = useState<IdolTokenData>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { injectiveAddress, ethereumAddress, isConnected } = useWalletStore()

  const contractAddress = tokenAddress || CONTRACT_ADDRESSES.idolToken
  const contractLive = isContractDeployed(contractAddress)

  const fetchData = useCallback(async () => {
    // If contract not deployed, use demo data
    if (!contractLive) {
      setData(prev => ({
        ...DEMO_STATE,
        // Simulate small price fluctuation for demo
        currentPrice: DEMO_STATE.currentPrice + (Math.random() - 0.5) * 0.00005,
        curvePoints: prev.curvePoints, // Keep stable
      }))
      return
    }

    try {
      const contract = getIdolTokenContract(contractAddress)

      // Batch read contract state
      const [
        name,
        symbol,
        currentPriceWei,
        totalSupplyWei,
        treasuryStats,
        totalDeposited,
        totalProfitsPerToken,
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.getCurrentPrice(),
        contract.totalSupply(),
        contract.getTreasuryStats(),
        contract.totalDeposited(),
        contract.totalProfitsPerToken(),
      ])

      // User-specific queries (only if connected)
      let userBalance = BigInt(0)
      let userDividends = BigInt(0)

      if (isConnected && ethereumAddress) {
        const [balance, dividends] = await Promise.all([
          contract.balanceOf(ethereumAddress),
          contract.getAccumulatedDividends(ethereumAddress),
        ])
        userBalance = balance
        userDividends = dividends
      } else if (isConnected) {
        // Fallback: try to get address from window.ethereum directly
        try {
          const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
          if (ethereum) {
            const accounts = await ethereum.request({ method: 'eth_accounts' })
            if (accounts && accounts.length > 0) {
              const [balance, dividends] = await Promise.all([
                contract.balanceOf(accounts[0]),
                contract.getAccumulatedDividends(accounts[0]),
              ])
              userBalance = balance
              userDividends = dividends
            }
          }
        } catch {
          // ignore
        }
      }

      const supply = Number(totalSupplyWei)
      const price = Number(formatInj(currentPriceWei))

      setData({
        name,
        symbol,
        currentPrice: price,
        totalSupply: supply,
        treasuryValue: Number(formatInj(treasuryStats.totalValue)),
        marketCap: Number(formatInj(treasuryStats.marketCap)),
        holderCount: Number(treasuryStats.holderCount),
        totalDeposited: Number(formatInj(totalDeposited)),
        totalProfits: Number(formatInj(totalProfitsPerToken)),
        userBalance: Number(userBalance),
        userDividends: Number(formatInj(userDividends)),
        curvePoints: BondingCurve.generateCurvePoints(supply),
        isLoading: false,
        isContractLive: true,
        error: null,
      })
    } catch (err) {
      console.error('Failed to fetch IdolToken data:', err)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to read contract',
      }))
    }
  }, [contractAddress, contractLive, isConnected, ethereumAddress])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(fetchData, pollInterval)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchData, pollInterval])

  return {
    ...data,
    refetch: fetchData,
  }
}
