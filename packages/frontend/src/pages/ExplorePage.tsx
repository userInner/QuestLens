import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, TrendingUp, ArrowUpRight, Loader2, Users, Activity } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useExplore } from '../hooks/useExplore'
import { useT } from '../i18n'

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const t = useT()

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
  const totalHolders = idols.reduce((sum, i) => sum + (i.holderCount || 0), 0)
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
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">{t('explore.label.market')}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">{t('explore.title')}</h1>
            <p className="text-lg text-white/40 mt-4 max-w-xl">{t('explore.subtitle')}</p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 pb-8 border-b border-white/5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('explore.search.placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/60 text-sm focus:outline-none focus:border-white/20"
              >
                <option value="newest">{t('explore.sort.newest')}</option>
                <option value="price">{t('explore.sort.price')}</option>
                <option value="holders">{t('explore.sort.holders')}</option>
                <option value="treasury">{t('explore.sort.treasury')}</option>
              </select>
              <button className="p-3 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white/60 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('explore.stats.agents'), value: idols.length.toString() },
              { label: t('explore.stats.tvl'), value: `${totalTVL.toFixed(1)} INJ` },
              { label: t('explore.stats.holders'), value: totalHolders.toString() },
              { label: t('explore.stats.network'), value: t('common.network') },
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
              <span className="ml-3 text-white/40">{t('explore.loading')}</span>
            </div>
          )}

          {/* Agents Grid — Large visual cards */}
          {!isLoading && (
            <div className="space-y-6">
              {filteredIdols.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-white/40 mb-4">{t('explore.empty')}</p>
                  <Link to="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors">
                    {t('explore.create.first')}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredIdols.map((idol) => (
                    <Link
                      key={idol.id}
                      to={`/idol/${idol.tokenAddress}`}
                      className="group block rounded-2xl border border-white/5 overflow-hidden hover:border-white/15 transition-all hover:shadow-xl hover:shadow-emerald-500/5"
                    >
                      {/* Big image */}
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={`/idols/${idol.name.toLowerCase().replace(' token', '')}/avatar.png`}
                          alt={idol.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement
                            el.style.display = 'none'
                            el.parentElement!.classList.add('bg-gradient-to-br', 'from-emerald-500/10', 'to-blue-500/10', 'flex', 'items-center', 'justify-center')
                            el.parentElement!.innerHTML = `<span class="text-6xl font-bold text-white/20">${idol.symbol.charAt(0)}</span>`
                          }}
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />

                        {/* Status badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-emerald-400 font-medium">{t('explore.card.active')}</span>
                        </div>

                        {/* Name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-bold text-white">{idol.name.replace(' Token', '')}</h3>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                              AI IDOL
                            </span>
                          </div>
                          <p className="text-sm text-white/50 font-mono">${idol.symbol}</p>
                          <p className="text-xs text-white/40 mt-2 line-clamp-2">
                            {idol.personality.description || idol.personality.traits?.join(', ') || 'Autonomous AI agent on Injective'}
                          </p>
                        </div>
                      </div>

                      {/* Stats footer */}
                      <div className="grid grid-cols-3 divide-x divide-white/5 bg-[#0a0a0a]">
                        <div className="p-3 text-center">
                          <p className="text-sm font-mono text-white">{idol.currentPrice.toFixed(4)}</p>
                          <p className="text-[10px] text-white/30">{t('explore.card.price')}</p>
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-sm font-mono text-white">{idol.holderCount}</p>
                          <p className="text-[10px] text-white/30">{t('explore.card.fans')}</p>
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-sm font-mono text-emerald-400">{idol.treasuryValue.toFixed(2)}</p>
                          <p className="text-[10px] text-white/30">{t('explore.card.treasury')}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
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
                {t('explore.create')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ExplorePage
