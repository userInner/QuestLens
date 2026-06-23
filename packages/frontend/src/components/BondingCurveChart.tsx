import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { Maximize2, Download } from 'lucide-react'

interface BondingCurveChartProps {
  currentPrice: number
  supply: number
}

const BondingCurveChart = ({ currentPrice, supply }: BondingCurveChartProps) => {
  const [timeRange, setTimeRange] = useState('1D')

  const data = useMemo(() => {
    const points = []
    const maxSupply = Math.max(supply * 2, 1000000)
    for (let s = 0; s <= maxSupply; s += maxSupply / 50) {
      const basePrice = 0.001
      const price = basePrice + (s * s) / 1000000000
      points.push({ supply: s, price })
    }
    return points
  }, [supply])

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { supply: number; price: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="card p-3 shadow-xl" style={{ background: 'var(--bg-elevated)' }}>
          <p className="stat-label mb-1">Supply: {(data.supply / 1000).toFixed(0)}K</p>
          <p className="font-mono text-[var(--primary-400)] font-semibold">{data.price.toFixed(6)} INJ</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[var(--text-default)]">Bonding Curve</h3>
            <span className="badge badge-accent text-xs">
              <span className="status-dot-pulse" style={{ color: 'var(--success)' }} />
              Live
            </span>
          </div>
          <p className="text-xs text-[var(--text-faint)]">Price increases as token supply grows</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--surface-hover)] rounded-lg p-0.5">
            {['1H', '1D', '1W', '1M'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[var(--surface-active)] text-[var(--text-default)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-default)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="btn-ghost p-2">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-2">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Position */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-[var(--surface-hover)]">
        <div>
          <p className="stat-label mb-1">Current Position</p>
          <p className="font-mono text-sm text-[var(--text-default)]">
            {(supply / 1000).toFixed(0)}K tokens @ {currentPrice.toFixed(6)} INJ
          </p>
        </div>
        <div className="text-right">
          <p className="stat-label mb-1">Market Cap</p>
          <p className="font-mono text-sm font-semibold text-[var(--primary-400)]">
            {(supply * currentPrice / 1000).toFixed(2)}K INJ
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.03)" 
              vertical={false} 
            />
            <XAxis
              dataKey="supply"
              stroke="var(--gray-700)"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--gray-700)"
              tickFormatter={(value) => `${value.toFixed(3)}`}
              tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
            <ReferenceDot 
              x={supply} 
              y={currentPrice} 
              r={6} 
              fill="#10b981" 
              stroke="#fff" 
              strokeWidth={2} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default BondingCurveChart
