import { Heart, MessageCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { IdolData } from '../types'

interface IdolProfileProps {
  idol: IdolData
}

const IdolProfile = ({ idol }: IdolProfileProps) => {
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)

  const formatNumber = (num: string) => {
    const n = parseFloat(num) / 1e18
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
    return n.toFixed(2)
  }

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          <img
            src={idol.avatar}
            alt={idol.name}
            className="avatar-lg"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--success)] rounded-full border-2 border-[var(--bg-base)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-default)]">{idol.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono text-sm text-[var(--primary-400)]">${idol.symbol}</p>
                <button 
                  onClick={handleCopy}
                  className="btn-ghost p-1"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <button 
              onClick={() => setLiked(!liked)}
              className={`btn-ghost p-2 ${liked ? 'text-[var(--error)]' : ''}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-faint)] mt-1">
            Created {new Date(idol.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
        {idol.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {idol.personality.map((trait, index) => (
          <span key={index} className="tag">
            {trait}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-elevated">
          <p className="stat-label mb-1">Total Supply</p>
          <p className="stat-value-sm font-mono">{formatNumber(idol.totalSupply)}</p>
        </div>
        <div className="card-elevated">
          <p className="stat-label mb-1">Price</p>
          <p className="stat-value-sm font-mono text-[var(--primary-400)]">
            {idol.currentPrice} INJ
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="btn-primary flex-1">
          Trade ${idol.symbol}
        </button>
        <button className="btn-secondary p-3">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button className="btn-secondary p-3">
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default IdolProfile
