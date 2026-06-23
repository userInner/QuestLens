import { useState } from 'react'
import { Crown, Gem, Flame, Eye, ExternalLink, Lock } from 'lucide-react'

// NFT collection mock data with images
const nfts = [
  {
    id: 1,
    name: 'Genesis Vivian',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
    tier: 'legendary',
    price: '2.5 ETH',
    holders: 1,
    perks: ['Exclusive DAO access', 'Revenue share 5%'],
    minted: true,
  },
  {
    id: 2,
    name: 'Vivian #042',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop',
    tier: 'epic',
    price: '0.8 ETH',
    holders: 42,
    perks: ['Early access', 'Discord VIP'],
    minted: true,
  },
  {
    id: 3,
    name: 'Trader Badge',
    image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop',
    tier: 'rare',
    price: '0.15 ETH',
    holders: 156,
    perks: ['Trading signals'],
    minted: false,
  },
  {
    id: 4,
    name: 'Community Member',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
    tier: 'common',
    price: '0.05 ETH',
    holders: 1024,
    perks: ['Basic access'],
    minted: true,
  },
]

const tierConfig = {
  legendary: { color: '#f59e0b', icon: Crown, glow: 'shadow-amber-500/50' },
  epic: { color: '#a855f7', icon: Gem, glow: 'shadow-purple-500/50' },
  rare: { color: '#3b82f6', icon: Flame, glow: 'shadow-blue-500/50' },
  common: { color: '#6b7280', icon: Eye, glow: 'shadow-gray-500/50' },
}

const NFTGallery = () => {
  const [selectedNFT, setSelectedNFT] = useState<typeof nfts[0] | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-default)] flex items-center gap-2">
            <Gem className="w-5 h-5 text-[var(--primary-400)]" />
            NFT Collection
          </h3>
          <p className="text-xs text-[var(--text-muted)]">Exclusive AI-generated collectibles</p>
        </div>
        <span className="badge badge-accent">
          {nfts.filter(n => n.minted).length}/{nfts.length} Minted
        </span>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 gap-3">
        {nfts.map((nft) => {
          const config = tierConfig[nft.tier as keyof typeof tierConfig]
          const Icon = config.icon
          const isHovered = hoveredId === nft.id

          return (
            <div
              key={nft.id}
              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                isHovered ? 'scale-105 z-10' : ''
              } ${nft.minted ? '' : 'opacity-60'}`}
              onMouseEnter={() => setHoveredId(nft.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedNFT(nft)}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : ''}`}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Tier badge */}
                <div 
                  className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"
                  style={{ backgroundColor: `${config.color}30`, color: config.color }}
                >
                  <Icon className="w-3 h-3" />
                  {nft.tier}
                </div>

                {/* Minted status */}
                {!nft.minted && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-muted)]">Coming Soon</p>
                    </div>
                  </div>
                )}

                {/* Info overlay */}
                <div className={`absolute bottom-0 left-0 right-0 p-3 transition-transform duration-300 ${isHovered ? 'translate-y-0' : 'translate-y-2'}`}>
                  <p className="font-semibold text-white text-sm truncate">{nft.name}</p>
                  <p className="text-xs text-white/70">{nft.price}</p>
                </div>

                {/* Hover glow */}
                {isHovered && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                      boxShadow: `inset 0 0 30px ${config.color}40`,
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Total Value */}
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">Collection Value</span>
          <span className="font-mono font-semibold text-[var(--primary-400)]">3.5 ETH</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-[var(--text-muted)]">Total Holders</span>
          <span className="font-mono text-[var(--text-default)]">1,223</span>
        </div>
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setSelectedNFT(null)}
        >
          <div 
            className="card max-w-md w-full animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full image */}
            <div className="relative aspect-square -mx-6 -mt-6 mb-4">
              <img 
                src={selectedNFT.image} 
                alt={selectedNFT.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
              
              {/* Close button */}
              <button 
                className="absolute top-4 right-4 btn-secondary"
                onClick={() => setSelectedNFT(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-[var(--text-default)]">{selectedNFT.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                    style={{ 
                      backgroundColor: `${tierConfig[selectedNFT.tier as keyof typeof tierConfig].color}30`,
                      color: tierConfig[selectedNFT.tier as keyof typeof tierConfig].color
                    }}
                  >
                    {selectedNFT.tier}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">{selectedNFT.holders} holders</span>
                </div>
              </div>

              <div className="card-elevated p-4">
                <p className="text-sm text-[var(--text-muted)] mb-2">Current Price</p>
                <p className="text-2xl font-bold text-[var(--primary-400)]">{selectedNFT.price}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Holder Benefits</p>
                <ul className="space-y-1">
                  {selectedNFT.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[var(--text-default)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-400)]" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full btn-primary">
                <ExternalLink className="w-4 h-4" />
                View on Marketplace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NFTGallery
