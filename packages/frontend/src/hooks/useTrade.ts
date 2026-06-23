import { useState, useCallback } from 'react'
import {
  getIdolTokenContractWithSigner,
  parseInj,
  parseTokens,
  isContractDeployed,
  CONTRACT_ADDRESSES,
  BondingCurve,
} from '../services/contract'
import { useWalletStore } from '../store/useWalletStore'

export interface TradeState {
  isLoading: boolean
  txHash: string | null
  error: string | null
  success: boolean
}

export interface TradeResult {
  txHash: string
  tokensReceived?: string
  injReceived?: string
}

/**
 * Hook for executing buy/sell transactions on the IdolToken bonding curve.
 * Falls back to a simulated demo mode if the contract isn't deployed.
 */
export function useTrade(tokenAddress?: string) {
  const [state, setState] = useState<TradeState>({
    isLoading: false,
    txHash: null,
    error: null,
    success: false,
  })

  const { isConnected } = useWalletStore()
  const contractAddress = tokenAddress || CONTRACT_ADDRESSES.idolToken
  const contractLive = isContractDeployed(contractAddress)

  /**
   * Buy tokens by sending INJ to the bonding curve
   * @param injAmount Amount of INJ to spend (e.g. "1.5")
   * @param slippagePercent Slippage tolerance in percent (default 1%)
   */
  const buyTokens = useCallback(async (
    injAmount: string,
    slippagePercent = 1,
  ): Promise<TradeResult | null> => {
    if (!isConnected) {
      setState({ isLoading: false, txHash: null, error: 'Wallet not connected', success: false })
      return null
    }

    setState({ isLoading: true, txHash: null, error: null, success: false })

    try {
      // Demo mode — simulate a transaction
      if (!contractLive) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        const estimated = BondingCurve.estimateTokensForInj(parseFloat(injAmount), 500000)
        setState({ isLoading: false, txHash: fakeHash, error: null, success: true })
        return { txHash: fakeHash, tokensReceived: estimated.toFixed(2) }
      }

      // Real contract interaction
      const contract = await getIdolTokenContractWithSigner(contractAddress)
      if (!contract) {
        throw new Error('Failed to get contract signer. Make sure MetaMask is connected.')
      }

      const value = parseInj(injAmount)

      // Calculate minimum tokens with slippage protection
      // For simplicity we use 0 as minTokensOut during MVP (slippage is handled UI-side)
      // In production, calculate minTokensOut from getBuyCost()
      const minTokensOut = BigInt(0)

      const tx = await contract.buyTokens(minTokensOut, { value, gasLimit: 500000 })
      const receipt = await tx.wait()

      setState({ isLoading: false, txHash: receipt.hash, error: null, success: true })
      return { txHash: receipt.hash }
    } catch (err) {
      const message = extractErrorMessage(err)
      setState({ isLoading: false, txHash: null, error: message, success: false })
      return null
    }
  }, [isConnected, contractLive, contractAddress])

  /**
   * Sell tokens back to the bonding curve
   * @param tokenAmount Amount of tokens to sell (e.g. "1000")
   * @param slippagePercent Slippage tolerance in percent (default 1%)
   */
  const sellTokens = useCallback(async (
    tokenAmount: string,
    slippagePercent = 1,
  ): Promise<TradeResult | null> => {
    if (!isConnected) {
      setState({ isLoading: false, txHash: null, error: 'Wallet not connected', success: false })
      return null
    }

    setState({ isLoading: true, txHash: null, error: null, success: false })

    try {
      // Demo mode
      if (!contractLive) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        const estimated = BondingCurve.estimateInjForTokens(parseFloat(tokenAmount), 500000)
        setState({ isLoading: false, txHash: fakeHash, error: null, success: true })
        return { txHash: fakeHash, injReceived: estimated.toFixed(4) }
      }

      // Real contract interaction
      const contract = await getIdolTokenContractWithSigner(contractAddress)
      if (!contract) {
        throw new Error('Failed to get contract signer. Make sure MetaMask is connected.')
      }

      const amount = BigInt(Math.floor(parseFloat(tokenAmount)))

      // minRefund = 0 for MVP (simplified slippage)
      const minRefund = BigInt(0)

      const tx = await contract.sellTokens(amount, minRefund, { gasLimit: 500000 })
      const receipt = await tx.wait()

      setState({ isLoading: false, txHash: receipt.hash, error: null, success: true })
      return { txHash: receipt.hash }
    } catch (err) {
      const message = extractErrorMessage(err)
      setState({ isLoading: false, txHash: null, error: message, success: false })
      return null
    }
  }, [isConnected, contractLive, contractAddress])

  /**
   * Claim accumulated dividends
   */
  const claimDividends = useCallback(async (): Promise<TradeResult | null> => {
    if (!isConnected) {
      setState({ isLoading: false, txHash: null, error: 'Wallet not connected', success: false })
      return null
    }

    setState({ isLoading: true, txHash: null, error: null, success: false })

    try {
      if (!contractLive) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setState({ isLoading: false, txHash: fakeHash, error: null, success: true })
        return { txHash: fakeHash }
      }

      const contract = await getIdolTokenContractWithSigner(contractAddress)
      if (!contract) {
        throw new Error('Failed to get contract signer.')
      }

      const tx = await contract.claimDividends()
      const receipt = await tx.wait()

      setState({ isLoading: false, txHash: receipt.hash, error: null, success: true })
      return { txHash: receipt.hash }
    } catch (err) {
      const message = extractErrorMessage(err)
      setState({ isLoading: false, txHash: null, error: message, success: false })
      return null
    }
  }, [isConnected, contractLive, contractAddress])

  /**
   * Reset trade state (e.g. after dismissing success/error)
   */
  const reset = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null, success: false })
  }, [])

  return {
    ...state,
    buyTokens,
    sellTokens,
    claimDividends,
    reset,
    isContractLive: contractLive,
  }
}

/**
 * Extract a user-friendly error message from various error types
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // MetaMask user rejection
    if (err.message.includes('user rejected') || err.message.includes('ACTION_REJECTED')) {
      return 'Transaction was rejected by user'
    }
    // Insufficient funds
    if (err.message.includes('insufficient funds')) {
      return 'Insufficient INJ balance'
    }
    // Contract revert
    if (err.message.includes('execution reverted')) {
      const match = err.message.match(/reason="([^"]+)"/)
      return match ? match[1] : 'Transaction reverted by contract'
    }
    return err.message
  }
  return 'An unknown error occurred'
}
