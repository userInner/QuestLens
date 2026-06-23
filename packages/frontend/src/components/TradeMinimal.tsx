import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Wallet, Settings, ChevronDown, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { useTrade } from '../hooks/useTrade'
import { useWallet } from '../hooks/useWallet'
import { BondingCurve } from '../services/contract'

interface TradeMinimalProps {
  currentPrice: number
  totalSupply: number
  userBalance: number
  symbol?: string
  onTradeSuccess?: () => void
}

const TradeMinimal = ({
  currentPrice,
  totalSupply,
  userBalance,
  symbol = 'VIVIAN',
  onTradeSuccess,
}: TradeMinimalProps) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [slippage, setSlippage] = useState(1)

  const { isConnected, balance: walletBalance } = useWallet()
  const { isLoading, txHash, error, success, buyTokens, sellTokens, reset } = useTrade()

  const quickAmounts = mode === 'buy'
    ? [0.1, 0.5, 1, 5]
    : [Math.floor(userBalance * 0.25) || 1, Math.floor(userBalance * 0.5) || 5, Math.floor(userBalance * 0.75) || 10, userBalance || 50]

  // Estimated output
  const estimatedOutput = amount
    ? mode === 'buy'
      ? BondingCurve.estimateTokensForInj(parseFloat(amount), totalSupply).toFixed(2)
      : BondingCurve.estimateInjForTokens(parseFloat(amount), totalSupply).toFixed(4)
    : '0.00'

  // Handle trade submission
  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    let result
    if (mode === 'buy') {
      result = await buyTokens(amount, slippage)
    } else {
      result = await sellTokens(amount, slippage)
    }

    if (result) {
      onTradeSuccess?.()
    }
  }

  // Clear amount after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setAmount('')
        reset()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, reset])

  // Validation
  const insufficientBalance = mode === 'buy'
    ? parseFloat(amount || '0') > parseFloat(walletBalance || '0')
    : parseFloat(amount || '0') > userBalance

  const canSubmit = amount && parseFloat(amount) > 0 && !isLoading && !insufficientBalance && isConnected

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-medium text-white">Trade</h3>
        <button
          className="p-2 text-white/30 hover:text-white/60 transition-colors"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Buy/Sell toggle */}
      <div className="flex bg-white/5 rounded-lg p-1 mb-6">
        <button
          onClick={() => { setMode('buy'); setAmount(''); reset() }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
            mode === 'buy'
              ? 'bg-white text-black'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={() => { setMode('sell'); setAmount(''); reset() }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
            mode === 'sell'
              ? 'bg-white text-black'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Sell
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40 uppercase tracking-wider">
            {mode === 'buy' ? 'You Pay' : 'You Sell'}
          </label>
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            {mode === 'buy'
              ? `${parseFloat(walletBalance || '0').toFixed(4)} INJ`
              : `${userBalance.toFixed(2)} ${symbol}`
            }
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); reset() }}
            placeholder="0.00"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-2xl font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-medium">
            {mode === 'buy' ? 'INJ' : symbol}
          </span>
        </div>
        {insufficientBalance && amount && (
          <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Insufficient balance
          </p>
        )}
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 mb-6">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => { setAmount(amt.toString()); reset() }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
              amount === amt.toString()
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'
            }`}
          >
            {amt} {mode === 'buy' ? 'INJ' : ''}
          </button>
        ))}
      </div>

      {/* Estimate */}
      <div className="flex items-center justify-between py-4 border-t border-b border-white/5 mb-6">
        <span className="text-sm text-white/40">You will receive</span>
        <span className="text-lg font-mono text-white">
          {estimatedOutput} <span className="text-white/40 text-sm">{mode === 'buy' ? symbol : 'INJ'}</span>
        </span>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-white/5 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Slippage Tolerance</span>
            <div className="flex gap-1">
              {[0.5, 1, 2, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    slippage === val
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Price per token</span>
            <span className="text-sm font-mono text-white/60">{currentPrice.toFixed(6)} INJ</span>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && txHash && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Transaction confirmed</span>
          </div>
          <a
            href={`https://testnet.explorer.injective.network/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400/60 hover:text-emerald-400 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={isConnected ? handleTrade : () => window.dispatchEvent(new CustomEvent('open-wallet-modal'))}
        disabled={isConnected ? !canSubmit : false}
        className="w-full py-4 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : !isConnected ? (
          <>
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </>
        ) : (
          <>
            {mode === 'buy' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {mode === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
          </>
        )}
      </button>
    </div>
  )
}

export default TradeMinimal
