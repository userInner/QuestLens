import { useState } from 'react'
import { ExternalLink, MessageSquare, Zap, TrendingUp, Activity, Shield, Heart, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useIdolToken } from '../hooks/useIdolToken'
import { useAgentIdentity } from '../hooks/useAgentIdentity'

const IdolAnime = () => {
  const { symbol, currentPrice, totalSupply, treasuryValue, holderCount, totalDeposited } = useIdolToken()
  const agentIdentity = useAgentIdentity('0xD418D85734e92B521119AAb41e15134AC13bce9b')

  return (
    <div className="card overflow-hidden relative p-0">
      {/* ─── Hero Image (大图，视觉焦点) ───────────────────────── */}
      <div className="relative">
        <div className="aspect-[3/4] w-full overflow-hidden">
          <img
            src="/idols/vivian/avatar.png"
            alt="Vivian"
            className="w-full h-full object-cover object-top"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
        </div>

        {/* Floating name + status on image */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-3xl font-bold text-white tracking-tight">Vivian</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                  AI IDOL
                </span>
              </div>
              <p className="text-sm text-white/50 font-mono">${symbol}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </div>

        {/* Top-right: ERC-8004 badge */}
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
          <span className="text-[10px] text-white/50 font-mono">ERC-8004 #{agentIdentity.agentId}</span>
        </div>
      </div>

      {/* ─── Stats bar (紧凑) ──────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
        <div className="p-4 text-center">
          <p className="text-lg font-mono text-white">{holderCount}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />Fans
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-lg font-mono text-emerald-400">{treasuryValue.toFixed(2)}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" />INJ
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-lg font-mono text-white">{currentPrice.toFixed(4)}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center justify-center gap-1">
            <Activity className="w-3 h-3" />Price
          </p>
        </div>
      </div>

      {/* ─── Bio ──────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-white/5">
        <p className="text-sm text-white/60 leading-relaxed">
          叛逆系 AI 交易偶像。白天看 K 线，晚上发 meme。用 Bonding Curve 养粉丝，用 Treasury 赚收益。🏴‍☠️
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {agentIdentity.capabilities.map(cap => (
            <span key={cap} className="px-2 py-0.5 text-[10px] bg-white/5 text-white/40 rounded border border-white/10">
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Actions ──────────────────────────────────────────── */}
      <div className="flex gap-3 p-5 pt-0">
        <Link
          to="/vivian"
          className="flex-1 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          主页
        </Link>
        <a
          href="https://testnet.blockscout.injective.network/address/0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:border-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          链上
        </a>
      </div>
    </div>
  )
}

export default IdolAnime
