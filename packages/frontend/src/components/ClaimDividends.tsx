import { useState } from 'react'
import { Gift, Loader2, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, IDOL_TOKEN_ABI, isContractDeployed } from '../services/contract'
import { useWalletStore } from '../store/useWalletStore'
import { useIdolToken } from '../hooks/useIdolToken'

/**
 * Claim Dividends component — allows holders to claim accumulated profits
 */
const ClaimDividends = () => {
  const [isClaiming, setIsClaiming] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isConnected } = useWalletStore()
  const { userDividends, userBalance, symbol, refetch } = useIdolToken()

  const hasDividends = userDividends > 0
  const hasTokens = userBalance > 0

  const handleClaim = async () => {
    if (!isConnected || !hasDividends) return

    setIsClaiming(true)
    setError(null)
    setTxHash(null)

    try {
      const contractAddress = CONTRACT_ADDRESSES.idolToken
      if (!isContractDeployed(contractAddress)) {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 2000))
        setTxHash('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''))
        setIsClaiming(false)
        return
      }

      const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
      if (!ethereum) throw new Error('No wallet found')

      const provider = new ethers.BrowserProvider(ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, IDOL_TOKEN_ABI, signer)

      const tx = await contract.claimDividends({ gasLimit: 200000 })
      const receipt = await tx.wait()

      setTxHash(receipt.hash)
      refetch() // Refresh data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to claim'
      if (msg.includes('user rejected') || msg.includes('ACTION_REJECTED')) {
        setError('Transaction rejected')
      } else if (msg.includes('No dividends')) {
        setError('No dividends available to claim')
      } else {
        setError(msg.slice(0, 100))
      }
    } finally {
      setIsClaiming(false)
    }
  }

  // Don't show if user has no tokens
  if (!isConnected || !hasTokens) return null

  return (
    <div className="card border-emerald-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Dividends</h3>
        </div>
        {hasDividends && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
            Claimable
          </span>
        )}
      </div>

      {/* Unclaimed amount */}
      <div className="mb-4">
        <p className="text-xs text-white/30 mb-1">Unclaimed Rewards</p>
        <p className="text-2xl font-mono text-white">
          {userDividends.toFixed(6)} <span className="text-sm text-white/40">INJ</span>
        </p>
        <p className="text-xs text-white/30 mt-1">
          From holding {userBalance} {symbol} tokens
        </p>
      </div>

      {/* Success */}
      {txHash && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Claimed!</span>
          </div>
          <a
            href={`https://testnet.blockscout.injective.network/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400/60 hover:text-emerald-400 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={!hasDividends || isClaiming}
        className="w-full py-3 bg-emerald-500 text-black rounded-lg font-medium hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claiming...
          </>
        ) : hasDividends ? (
          <>
            <Gift className="w-4 h-4" />
            Claim {userDividends.toFixed(4)} INJ
          </>
        ) : (
          <>
            <Gift className="w-4 h-4" />
            No rewards yet
          </>
        )}
      </button>

      <p className="text-[10px] text-white/20 text-center mt-3">
        Dividends accumulate from AI agent trading profits (50% to holders)
      </p>
    </div>
  )
}

export default ClaimDividends
