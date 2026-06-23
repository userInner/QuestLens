import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, TrendingUp, ArrowUpRight, Loader2, Users, Activity } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useExplore } from '../hooks/useExplore'

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const { idols, isLoading } = useExplore()

  // Filter and sort
  const filteredIdols = idols
    .filter(idol =>
      idol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idol.roleType.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return b.currentPrice - a.currentPrice
        case 'holders': return b.holderCount - a.holderCount
        case 'treasury': return b.treasuryValue - a.treasuryValue
        case 'newest':
        default: return b.createdAt - a.createdAt
      }
    })

  // Aggregate stats
  const totalHolders = idols.reduce((sum, i) => sum + i.holderCount, 0)
  const totalTVL = idols.reduce((sum, i) => sum + i.treasuryValue, 0)

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">Market</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">Explore Agents</h1>
            <p className="text-lg text-white/40 mt-4 max-w-xl">Discover autonomous AI idols powered by bonding curves on Injective.</p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 pb-8 border-b border-white/5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/60 text-sm focus:outline-none focus:border-white/20"
              >
                <option value="newest">Newest</option>
                <option value="price">Price</option>
                <option value="holders">Holders</option>
                <option value="treasury">Treasury</option>
              </select>
              <button className="p-3 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white/60 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Agents', value: idols.length.toString() },
              { label: 'Total TVL', value: `${totalTVL.toFixed(1)} INJ` },
              { label: 'Total Holders', value: totalHolders.toString() },
              { label: 'Network', value: 'Injective Testnet' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xl font-mono text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              <span className="ml-3 text-white/40">Loading agents from chain...</span>
            </div>
          )}

          {/* Agents List */}
          {!isLoading && (
            <div className="space-y-2">
              {filteredIdols.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-white/40 mb-4">No agents found</p>
                  <Link to="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors">
                    Create First Agent
                  </Link>
                </div>
              ) : (
                filteredIdols.map((idol) => (
                  <Link
                    key={idol.id}
                    to={`/idol/${idol.tokenAddress}`}
                    className="group flex items-center gap-6 p-4 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 hover:bg-white/[0.04] transition-all"
                  >
                    {/* Rank */}
                    <span className="text-xs text-white/20 font-mono w-8">#{idol.id}</span>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-white/60">{idol.symbol.charAt(0)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">{idol.name.replace(' Token', '')}</h3>
                        <span className="text-xs text-white/30 font-mono">${idol.symbol}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 capitalize">
                          {idol.roleType}
                        </span>
                      </div>
                      <p className="text-sm text-white/40 truncate mt-0.5">
                        {idol.personality.description || idol.personality.traits?.join(', ') || 'Autonomous AI agent'}
                      </p>
                    </div>

                    {/* Stats - Desktop */}
                    <div className="hidden md:flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-white/30 uppercase tracking-wider">Price</p>
                        <p className="font-mono text-white">{idol.currentPrice.toFixed(6)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/30 uppercase tracking-wider">Supply</p>
                        <p className="font-mono text-white">{idol.totalSupply}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/30 uppercase tracking-wider flex items-center gap-1 justify-end">
                          <Users className="w-3 h-3" />Holders
                        </p>
                        <p className="font-mono text-white">{idol.holderCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/30 uppercase tracking-wider flex items-center gap-1 justify-end">
                          <Activity className="w-3 h-3" />Treasury
                        </p>
                        <p className="font-mono text-emerald-400">{idol.treasuryValue.toFixed(2)} INJ</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center">
                      <button className="p-2 text-white/20 group-hover:text-white/60 transition-colors">
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Create CTA */}
          {!isLoading && filteredIdols.length > 0 && (
            <div className="mt-12 text-center">
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-8 py-3 border border-white/10 text-white/40 text-sm font-medium rounded-lg hover:border-white/20 hover:text-white/60 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Create New Agent
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ExplorePage
