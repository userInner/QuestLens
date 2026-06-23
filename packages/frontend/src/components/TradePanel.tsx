import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Loader2, Info, Settings2 } from 'lucide-react'

interface TradePanelProps {
  onBuy: (amount: string) => Promise<void>
  onSell: (amount: string) => Promise<void>
  currentPrice: number
  isLoading: boolean
}

const TradePanel = ({ onBuy, onSell, currentPrice, isLoading }: TradePanelProps) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    if (activeTab === 'buy') {
      await onBuy(amount)
    } else {
      await onSell(amount)
    }
    setAmount('')
  }

  const estimatedTokens = amount ? (parseFloat(amount) / currentPrice).toFixed(2) : '0'
  const estimatedInj = amount ? (parseFloat(amount) * currentPrice * 0.95).toFixed(4) : '0'

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[var(--text-default)]">Trade</h3>
          <span className="badge badge-accent">
            <span className="status-dot-pulse" style={{ color: 'var(--success)' }} />
            Active
          </span>
        </div>
        <button 
          className="btn-ghost p-2"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-group mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          className={`tab ${activeTab === 'buy' ? 'active' : ''}`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`tab ${activeTab === 'sell' ? 'active' : ''}`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Sell
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="stat-label">
            {activeTab === 'buy' ? 'Pay' : 'Sell'}
          </label>
          <span className="text-xs text-[var(--text-faint)]">
            Balance: 12.5 {activeTab === 'buy' ? 'INJ' : 'VIVIAN'}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input text-xl py-4"
            min="0"
            step="0.001"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-faint)] font-mono text-sm">
            {activeTab === 'buy' ? 'INJ' : 'VIVIAN'}
          </span>
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2 mb-6">
        {['25%', '50%', '75%', 'Max'].map((val) => (
          <button
            key={val}
            onClick={() => {
              const baseAmount = activeTab === 'buy' ? '12.5' : '1000'
              const multiplier = val === 'Max' ? 1 : parseInt(val) / 100
              setAmount((parseFloat(baseAmount) * multiplier).toFixed(2))
            }}
            className="flex-1 py-2 rounded-lg bg-[var(--surface-hover)] text-[var(--text-faint)] hover:bg-[var(--surface-active)] hover:text-[var(--text-muted)] transition-all text-xs font-medium"
          >
            {val}
          </button>
        ))}
      </div>

      {/* Estimation */}
      <div className="card-elevated mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-muted)]">Rate</span>
          <span className="font-mono text-sm text-[var(--text-default)]">
            1 VIVIAN = {currentPrice.toFixed(6)} INJ
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-muted)]">You receive</span>
          <span className="font-mono font-semibold text-[var(--primary-400)]">
            {activeTab === 'buy' ? estimatedTokens : estimatedInj} {activeTab === 'buy' ? 'VIVIAN' : 'INJ'}
          </span>
        </div>
        
        {showSettings && (
          <>
            <div className="divider" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Slippage tolerance</span>
              <div className="flex gap-1">
                {[0.5, 1, 2].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      slippage === val
                        ? 'bg-[var(--primary-500)] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-default)]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !amount}
        className="btn-primary w-full py-4 text-base disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <span>{activeTab === 'buy' ? 'Buy VIVIAN' : 'Sell VIVIAN'}</span>
        )}
      </button>

      {/* Info */}
      <div className="mt-4 flex items-center justify-center gap-1 text-[var(--text-faint)] text-xs">
        <Info className="w-3 h-3" />
        <span>80% to AI Treasury • 20% Protocol fee</span>
      </div>
    </div>
  )
}

export default TradePanel
