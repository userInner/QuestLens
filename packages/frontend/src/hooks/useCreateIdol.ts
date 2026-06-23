import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, IDOL_FACTORY_ABI, isContractDeployed } from '../services/contract'
import { useWalletStore } from '../store/useWalletStore'

interface DeployParams {
  name: string
  symbol: string
  roleType: string
  personality: string
}

interface CreateIdolState {
  isDeploying: boolean
  txHash: string | null
  deployedToken: string | null
  error: string | null
}

/**
 * Hook for deploying a new AI Idol via IdolFactory contract.
 * Pays 0.1 INJ creation fee.
 */
export function useCreateIdol() {
  const [state, setState] = useState<CreateIdolState>({
    isDeploying: false,
    txHash: null,
    deployedToken: null,
    error: null,
  })

  const { isConnected, ethereumAddress } = useWalletStore()
  const factoryAddress = CONTRACT_ADDRESSES.idolFactory
  const contractLive = isContractDeployed(factoryAddress)

  const deploy = useCallback(async (params: DeployParams) => {
    if (!isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return null
    }

    setState({ isDeploying: true, txHash: null, deployedToken: null, error: null })

    try {
      // Demo mode if contract not deployed
      if (!contractLive) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        const fakeToken = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        setState({ isDeploying: false, txHash: fakeHash, deployedToken: fakeToken, error: null })
        return { txHash: fakeHash, tokenAddress: fakeToken }
      }

      // Get signer from MetaMask
      const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
      if (!ethereum) throw new Error('No wallet provider found')

      const browserProvider = new ethers.BrowserProvider(ethereum)
      const signer = await browserProvider.getSigner()
      const signerAddress = await signer.getAddress()

      // Create contract instance
      const factory = new ethers.Contract(factoryAddress, IDOL_FACTORY_ABI, signer)

      // Use signer's address as both agent and treasury for demo
      // In production, these would be separate addresses
      const agentAddress = signerAddress
      const treasuryAddress = signerAddress

      // Creation fee: 0.1 INJ
      const creationFee = ethers.parseEther('0.1')

      // Call createIdol
      const tx = await factory.createIdol(
        params.name,
        params.symbol,
        agentAddress,
        treasuryAddress,
        params.roleType,
        params.personality,
        { value: creationFee, gasLimit: 5000000 }
      )

      const receipt = await tx.wait()

      // Parse IdolCreated event to get the token address
      let tokenAddress = ''
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed && parsed.name === 'IdolCreated') {
            tokenAddress = parsed.args.token || parsed.args[1]
            break
          }
        } catch {
          // Skip logs that don't match our ABI
        }
      }

      // If we couldn't parse the event, try to get it from the factory
      if (!tokenAddress) {
        try {
          const idolCount = await factory.getIdolCount()
          const idol = await factory.getIdol(idolCount)
          tokenAddress = idol.token
        } catch {
          tokenAddress = 'Check explorer for token address'
        }
      }

      setState({ isDeploying: false, txHash: receipt.hash, deployedToken: tokenAddress, error: null })
      return { txHash: receipt.hash, tokenAddress }
    } catch (err) {
      const message = extractErrorMessage(err)
      setState({ isDeploying: false, txHash: null, deployedToken: null, error: message })
      return null
    }
  }, [isConnected, ethereumAddress, factoryAddress, contractLive])

  const reset = useCallback(() => {
    setState({ isDeploying: false, txHash: null, deployedToken: null, error: null })
  }, [])

  return {
    ...state,
    deploy,
    reset,
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes('user rejected') || err.message.includes('ACTION_REJECTED')) {
      return 'Transaction was rejected'
    }
    if (err.message.includes('insufficient funds')) {
      return 'Insufficient INJ balance (need 0.1 INJ + gas)'
    }
    if (err.message.includes('Agent already has an idol')) {
      return 'This wallet already has an idol. Use a different agent address.'
    }
    if (err.message.includes('execution reverted')) {
      const match = err.message.match(/reason="([^"]+)"/)
      return match ? match[1] : 'Transaction reverted by contract'
    }
    return err.message.length > 100 ? err.message.slice(0, 100) + '...' : err.message
  }
  return 'An unknown error occurred'
}
