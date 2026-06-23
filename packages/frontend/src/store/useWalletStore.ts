import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Wallet } from '@injectivelabs/wallet-base'

export type WalletType = typeof Wallet.Keplr | typeof Wallet.Leap | typeof Wallet.Metamask

export interface WalletState {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  
  // Account info
  injectiveAddress: string
  ethereumAddress: string
  walletType: WalletType | null
  
  // Balance (in INJ)
  balance: string
  
  // Error handling
  error: string | null

  // Actions
  setConnected: (payload: {
    injectiveAddress: string
    ethereumAddress: string
    walletType: WalletType
  }) => void
  setConnecting: (isConnecting: boolean) => void
  setBalance: (balance: string) => void
  setError: (error: string | null) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      injectiveAddress: '',
      ethereumAddress: '',
      walletType: null,
      balance: '0',
      error: null,

      // Actions
      setConnected: ({ injectiveAddress, ethereumAddress, walletType }) =>
        set({
          isConnected: true,
          isConnecting: false,
          injectiveAddress,
          ethereumAddress,
          walletType,
          error: null,
        }),

      setConnecting: (isConnecting) =>
        set({ isConnecting, error: null }),

      setBalance: (balance) =>
        set({ balance }),

      setError: (error) =>
        set({ error, isConnecting: false }),

      disconnect: () =>
        set({
          isConnected: false,
          isConnecting: false,
          injectiveAddress: '',
          ethereumAddress: '',
          walletType: null,
          balance: '0',
          error: null,
        }),
    }),
    {
      name: 'novaidol-wallet',
      partialize: (state) => ({
        // Only persist minimal reconnect info
        walletType: state.walletType,
        injectiveAddress: state.injectiveAddress,
        ethereumAddress: state.ethereumAddress,
        isConnected: state.isConnected,
      }),
    }
  )
)
