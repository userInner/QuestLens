import { useMemo, useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { Maximize2, TrendingUp } from 'lucide-react'
import { BondingCurve } from '../services/contract'
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, IDOL_TOKEN_ABI, getReadProvider, isContractDeployed, formatInj } from '../services/contract'

interface ChartMinimalProps {
  currentPrice: number
  supply: number
  holderCount?: number
  marketCap?: number
}

interface PricePoint {
  time: string
  price: number
  supply: number
}

const ChartMinimal = ({ currentPrice, supply, holderCount = 0, marketCap = 0 }: ChartMinimalProps) => {
  const [chartMode, setChartMode] = useState<'curve' | 'history'>('history')
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Generate bonding curve theoretical points
  const curveData = useMemo(() => {
    return BondingCurve.generateCurvePoints(supply, 80)
  }, [supply])

  // Fetch trade history from on-chain events
  useEffect(() => {
    async function fetchTradeHistory() {
      const contractAddress = CONTRACT_ADDRESSES.idolToken
      if (!isContractDeployed(contractAddress)) {
        setIsLoadingHistory(false)
        return
      }

      try {
        const provider = getReadProvider()
        const contract = new ethers.Contract(contractAddress, IDOL_TOKEN_ABI, provider)

        // Get TokensPurchased and TokensSold events from last 1000 blocks
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 5000)

        const buyFilter = contract.filters.TokensPurchased()
        const sellFilter = contract.filters.TokensSold()

        const [buyEvents, sellEvents] = await Promise.all([
          contract.queryFilter(buyFilter, fromBlock, currentBlock),
          contract.queryFilter(sellFilter, fromBlock, currentBlock),
        ])

        // Combine and sort by block number
        const allEvents = [
          ...buyEvents.map(e => ({
            block: e.blockNumber,
            type: 'buy' as const,
            amount: Number(e.args?.[1] || 0),
            cost: e.args?.[2] ? Number(formatInj(e.args[2])) : 0,
          })),
          ...sellEvents.map(e => ({
            block: e.blockNumber,
            type: 'sell' as const,
            amount: Number(e.args?.[1] || 0),
            cost: e.args?.[2] ? Number(formatInj(e.args[2])) : 0,
          })),
        ].sort((a, b) => a.block - b.block)

        // Build price history from events
        let runningSupply = 0
        const history: PricePoint[] = [
          { time: 'Genesis', price: BondingCurve.getPriceAtSupply(0), supply: 0 }
        ]

        for (const event of allEvents) {
          if (event.type === 'buy') {
            runningSupply += event.amount
          } else {
            runningSupply = Math.max(0, runningSupply - event.amount)
          }
          const price = BondingCurve.getPriceAtSupply(runningSupply)
          history.push({
            time: `Block ${event.block}`,
            price,
            supply: runningSupply,
          })
        }

        // Add current state
        history.push({
          time: 'Now',
          price: currentPrice,
          supply,
        })

        setPriceHistory(history)
      } catch (err) {
        console.warn('Failed to fetch trade history:', err)
        // Fallback: generate simple history from current state
        setPriceHistory([
          { time: 'Start', price: 0.001, supply: 0 },
          { time: 'Now', price: currentPrice, supply },
        ])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchTradeHistory()
  }, [currentPrice, supply])

  const CurveTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { supply: number; price: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-[#111111] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-white/40 mb-1">Supply: {d.supply}</p>
          <p className="text-lg font-mono text-white">{d.price.toFixed(6)} INJ</p>
        </div>
      )
    }
    return null
  }

  const HistoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: PricePoint }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-[#111111] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-white/40 mb-1">{d.time}</p>
          <p className="text-lg font-mono text-white">{d.price.toFixed(6)} INJ</p>
          <p className="text-xs text-white/30">Supply: {d.supply}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-medium text-white">
            {chartMode === 'history' ? 'Price History' : 'Bonding Curve'}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            {chartMode === 'history' ? 'Token price over time' : 'Price vs supply relationship'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setChartMode('history')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartMode === 'history' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
              }`}
            >
              K-Line
            </button>
            <button
              onClick={() => setChartMode('curve')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                chartMode === 'curve' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
              }`}
            >
              Curve
            </button>
          </div>
          <button className="p-2 text-white/30 hover:text-white/60 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-8 pb-6 border-b border-white/5">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Current Price</p>
          <p className="text-xl font-mono text-white">{currentPrice.toFixed(6)}</p>
          <p className="text-xs text-white/30">INJ per token</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Market Cap</p>
          <p className="text-xl font-mono text-white">{formatValue(marketCap || supply * currentPrice)}</p>
          <p className="text-xs text-white/30">INJ</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Total Supply</p>
          <p className="text-xl font-mono text-white">{supply}</p>
          <p className="text-xs text-white/30">Tokens</p>
        </div>
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Holders</p>
          <p className="text-xl font-mono text-white">{holderCount}</p>
          <p className="text-xs text-white/30">Addresses</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        {chartMode === 'history' ? (
          /* Price History (K-Line style) */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={priceHistory.length > 1 ? priceHistory : [{ time: 'Start', price: 0.001, supply: 0 }, { time: 'Now', price: currentPrice, supply }]}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.1)"
                tickFormatter={(v) => v.toFixed(4)}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip content={<HistoryTooltip />} />
              <Area
                type="stepAfter"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Bonding Curve */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="supply"
                stroke="rgba(255,255,255,0.1)"
                tickFormatter={(v) => formatSupply(v)}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.1)"
                tickFormatter={(v) => v.toFixed(4)}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip content={<CurveTooltip />} />
              <Area type="monotone" dataKey="price" stroke="none" fill="url(#areaGradient)" />
              <Line
                type="monotone"
                dataKey="price"
                stroke="url(#lineGradient)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 1.5, fill: '#0a0a0a' }}
              />
              {/* Current position marker */}
              {supply > 0 && (
                <ReferenceDot
                  x={supply}
                  y={currentPrice}
                  r={6}
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          {chartMode === 'history'
            ? `${priceHistory.length} trades recorded on-chain`
            : 'Price increases as supply grows (exponential curve)'
          }
        </div>
        <span className="text-xs text-white/20 font-mono">
          Injective EVM Testnet
        </span>
      </div>
    </div>
  )
}

function formatSupply(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(4)
}

export default ChartMinimal
