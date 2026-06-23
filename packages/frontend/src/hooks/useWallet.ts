import { useCallback, useEffect, useRef } from 'react'
import { Wallet } from '@injectivelabs/wallet-base'
import { BaseWalletStrategy } from '@injectivelabs/wallet-core'
import { CosmosWalletStrategy } from '@injectivelabs/wallet-cosmos'
import { EvmWalletStrategy } from '@injectivelabs/wallet-evm'
import { ChainId } from '@injectivelabs/ts-types'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import {
  ChainGrpcBankApi,
  getInjectiveAddress,
  getEthereumAddress,
} from '@injectivelabs/sdk-ts'
import { useWalletStore, type WalletType } from '../store/useWalletStore'

// Network config — switch to Network.Mainnet for production
const NETWORK = Network.Testnet
const CHAIN_ID = ChainId.Testnet
const ENDPOINTS = getNetworkEndpoints(NETWORK)

// Singleton wallet strategy instance
let walletStrategy: BaseWalletStrategy | null = null

function getWalletStrategy(): BaseWalletStrategy {
  if (!walletStrategy) {
    walletStrategy = new BaseWalletStrategy({
      chainId: CHAIN_ID,
      strategies: {
        [Wallet.Keplr]: new CosmosWalletStrategy({
          chainId: CHAIN_ID,
          wallet: Wallet.Keplr,
        }),
        [Wallet.Leap]: new CosmosWalletStrategy({
          chainId: CHAIN_ID,
          wallet: Wallet.Leap,
        }),
        [Wallet.Metamask]: new EvmWalletStrategy({
          chainId: CHAIN_ID,
          wallet: Wallet.Metamask,
        }),
      },
    })
  }
  return walletStrategy
}

/**
 * Hook for managing wallet connection on Injective.
 * Supports Keplr, Leap (Cosmos wallets) and MetaMask (EVM wallet).
 */
export function useWallet() {
  const store = useWalletStore()
  const balanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch INJ balance for an address
  const fetchBalance = useCallback(async (injectiveAddress: string) => {
    try {
      const bankApi = new ChainGrpcBankApi(ENDPOINTS.grpc)
      const balance = await bankApi.fetchBalance({
        accountAddress: injectiveAddress,
        denom: 'inj',
      })
      // Balance is in wei (10^18), convert to INJ
      const balanceInInj = (
        Number(balance.amount) / 1e18
      ).toFixed(4)
      store.setBalance(balanceInInj)
    } catch (err) {
      console.warn('Failed to fetch balance:', err)
    }
  }, [store])

  // Connect to a specific wallet
  const connect = useCallback(async (walletType: WalletType) => {
    store.setConnecting(true)

    try {
      const strategy = getWalletStrategy()
      await strategy.setWallet(walletType)

      // Get addresses from the wallet
      const addresses = await strategy.enableAndGetAddresses()

      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses returned from wallet')
      }

      const address = addresses[0]

      // Derive both address formats
      let injectiveAddress: string
      let ethereumAddress: string

      if (walletType === Wallet.Metamask) {
        // MetaMask returns ethereum address
        ethereumAddress = address
        injectiveAddress = getInjectiveAddress(address)
      } else {
        // Cosmos wallets return injective address
        injectiveAddress = address
        ethereumAddress = getEthereumAddress(address)
      }

      store.setConnected({ injectiveAddress, ethereumAddress, walletType })

      // Fetch initial balance
      await fetchBalance(injectiveAddress)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      store.setError(message)
      console.error('Wallet connection error:', err)
    }
  }, [store, fetchBalance])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      const strategy = getWalletStrategy()
      await strategy.disconnect()
    } catch {
      // Ignore disconnect errors
    }
    store.disconnect()
  }, [store])

  // Auto-reconnect on mount if we have persisted connection info
  useEffect(() => {
    const { isConnected, walletType } = useWalletStore.getState()
    if (isConnected && walletType) {
      // Silently reconnect
      connect(walletType).catch(() => {
        // If reconnect fails, clear persisted state
        store.disconnect()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll balance every 30s when connected
  useEffect(() => {
    const { isConnected, injectiveAddress } = store

    if (isConnected && injectiveAddress) {
      balanceIntervalRef.current = setInterval(() => {
        fetchBalance(injectiveAddress)
      }, 30_000)
    }

    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current)
        balanceIntervalRef.current = null
      }
    }
  }, [store.isConnected, store.injectiveAddress, fetchBalance])

  return {
    // State
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    injectiveAddress: store.injectiveAddress,
    ethereumAddress: store.ethereumAddress,
    walletType: store.walletType,
    balance: store.balance,
    error: store.error,

    // Actions
    connect,
    disconnect,
    fetchBalance: () => store.injectiveAddress && fetchBalance(store.injectiveAddress),
  }
}

/**
 * Available wallet options for the UI
 */
export const WALLET_OPTIONS = [
  {
    id: Wallet.Keplr as WalletType,
    name: 'Keplr',
    icon: 'https://assets.leapwallet.io/keplr-logo.svg',
    description: 'Cosmos ecosystem wallet',
  },
  {
    id: Wallet.Leap as WalletType,
    name: 'Leap',
    icon: 'https://assets.leapwallet.io/leap-cosmos-logo.svg',
    description: 'Multi-chain Cosmos wallet',
  },
  {
    id: Wallet.Metamask as WalletType,
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'EVM wallet',
  },
] as const
