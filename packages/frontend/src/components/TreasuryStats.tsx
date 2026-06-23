import { TrendingUp, TrendingDown, Activity, BarChart3, Wallet } from 'lucide-react'
import { TreasuryInfo } from '../types'

interface TreasuryStatsProps {
  treasury: TreasuryInfo
}

const TreasuryStats = ({ treasury }: TreasuryStatsProps) => {
  const isPositiveChange = treasury.dailyChange.startsWith('+')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[var(--primary-400)]" />
          <h3 className="text-lg font-semibold text-[var(--text-default)]">Treasury</h3>
        </div>
        <span className={`badge ${isPositiveChange ? 'badge-success' : 'badge-error'}`}>
          {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {treasury.dailyChange}%
        </span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[var(--primary-400)]" />
            <span className="stat-label">Total Value</span>
          </div>
          <p className="stat-value-sm font-mono">
            {treasury.totalValue} <span className="text-base text-[var(--text-faint)]">INJ</span>
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-[var(--primary-400)]" />
            <span className="stat-label">24h Volume</span>
          </div>
          <p className="stat-value-sm font-mono text-[var(--primary-400)]">
            {treasury.dailyVolume} <span className="text-base text-[var(--text-faint)]">INJ</span>
          </p>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="mb-4">
        <h4 className="stat-label mb-3">Recent Trades</h4>
        <div className="space-y-2">
          {treasury.recentTrades.map((trade, index) => (
            <div 
              key={index} 
              className="card-elevated flex items-center justify-between p-3 hover:border-[var(--border-default)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  trade.type === 'LONG' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                  trade.type === 'SHORT' ? 'bg-[var(--error)]/10 text-[var(--error)]' :
                  'bg-[var(--surface-active)] text-[var(--text-muted)]'
                }`}>
                  {trade.type}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-default)]">{trade.amount} INJ</p>
                  <p className="text-xs text-[var(--text-faint)]">{trade.leverage}x leverage</p>
                </div>
              </div>
              <span className={`font-mono text-sm font-semibold ${trade.result === 'win' ? 'trend-up' : 'trend-down'}`}>
                {trade.result === 'win' ? '+' : ''}{trade.profit} INJ
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
        <div>
          <p className="stat-label mb-1">Market Cap</p>
          <p className="font-mono text-sm font-semibold text-[var(--text-default)]">{treasury.marketCap} INJ</p>
        </div>
        <div>
          <p className="stat-label mb-1">Holders</p>
          <p className="font-mono text-sm font-semibold text-[var(--text-default)]">{treasury.holderCount}</p>
        </div>
      </div>
    </div>
  )
}

export default TreasuryStats
