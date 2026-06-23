import { TrendingUp, Activity, BarChart3, Wallet, Shield, Zap } from 'lucide-react'

interface TreasuryMinimalProps {
  treasuryValue: number
  marketCap: number
  holderCount: number
  totalDeposited: number
  currentPrice: number
}

const TreasuryMinimal = ({
  treasuryValue,
  marketCap,
  holderCount,
  totalDeposited,
  currentPrice,
}: TreasuryMinimalProps) => {
  // Calculate some derived stats
  const treasuryRatio = totalDeposited > 0 ? ((treasuryValue / totalDeposited) * 100).toFixed(1) : '0'
  const priceChangeIndicator = currentPrice > 0.001 ? '+' : ''
  const priceChangePercent = currentPrice > 0
    ? (((currentPrice - 0.001) / 0.001) * 100).toFixed(1)
    : '0'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-white/40" />
          <h3 className="text-lg font-medium text-white">Treasury</h3>
        </div>
        <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">
          <TrendingUp className="w-3 h-3 inline mr-1" />
          {priceChangeIndicator}{priceChangePercent}%
        </span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3 h-3 text-white/30" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Total Value</span>
          </div>
          <p className="text-xl font-mono text-white">
            {treasuryValue.toFixed(2)} <span className="text-sm text-white/40">INJ</span>
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3 h-3 text-white/30" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Market Cap</span>
          </div>
          <p className="text-xl font-mono text-white">
            {formatValue(marketCap)} <span className="text-sm text-white/40">INJ</span>
          </p>
        </div>
      </div>

      {/* Treasury Health Indicators */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-emerald-400/60" />
            <span className="text-sm text-white/50">Treasury Ratio</span>
          </div>
          <span className="font-mono text-sm text-white/70">{treasuryRatio}%</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-blue-400/60" />
            <span className="text-sm text-white/50">Total Deposited</span>
          </div>
          <span className="font-mono text-sm text-white/70">{totalDeposited.toFixed(2)} INJ</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-purple-400/60" />
            <span className="text-sm text-white/50">Token Price</span>
          </div>
          <span className="font-mono text-sm text-white/70">{currentPrice.toFixed(6)} INJ</span>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Holders</p>
          <p className="font-mono text-sm text-white/70">{holderCount}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Fee Split</p>
          <p className="font-mono text-sm text-white/70">80/20</p>
        </div>
      </div>
    </div>
  )
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(2)
}

export default TreasuryMinimal
