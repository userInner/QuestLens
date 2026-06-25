import { useState } from 'react'
import { ExternalLink, MessageSquare, Zap, TrendingUp, Activity, Shield } from 'lucide-react'
import { useIdolToken } from '../hooks/useIdolToken'
import { useAgentIdentity } from '../hooks/useAgentIdentity'

const IdolAnime = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'identity' | 'chat'>('stats')
  const { symbol, currentPrice, totalSupply, treasuryValue, holderCount, totalDeposited } = useIdolToken()
  // Read ERC-8004 identity from chain (operator = deployer address)
  const agentIdentity = useAgentIdentity('0xD418D85734e92B521119AAb41e15134AC13bce9b')

  return (
    <div className="card overflow-hidden relative">
      {/* Header with avatar */}
      <div className="flex items-start gap-5 mb-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10">
            <img src="/idols/vivian/avatar.png" alt="Vivian" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Vivian</h2>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-white/5 text-white/40 rounded border border-white/10">
              AI
            </span>
          </div>
          <p className="text-sm text-white/40 font-mono">${symbol}</p>
          <p className="text-sm text-white/50 mt-2 leading-relaxed">
            Autonomous trading agent on Injective EVM. Bonding curve mechanics with profit sharing.
          </p>
        </div>
      </div>

      {/* Visual area */}
      <div className="relative mb-6 rounded-lg overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5">
        <div className="aspect-[3/4] max-h-[280px] relative flex items-center justify-center">
          {/* Abstract agent visualization */}
          <div className="relative w-48 h-48">
            <img src="/idols/vivian/avatar.png" alt="Vivian" className="w-full h-full object-cover rounded-xl" />
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
        </div>

        {/* Floating stats overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-white/30 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Price: <span className="text-emerald-400">{currentPrice.toFixed(4)} INJ</span>
              </span>
              <span className="text-white/30 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Supply: <span className="text-white/60">{totalSupply}</span>
              </span>
            </div>
            <span className="text-white/20 font-mono">#001</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 mb-6">
        {(['stats', 'identity', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            {tab === 'identity' ? 'ERC-8004' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <p className="text-xs text-white/30 mb-1 uppercase tracking-wider">Treasury</p>
              <p className="text-xl font-mono text-white">{treasuryValue.toFixed(2)} <span className="text-sm text-white/40">INJ</span></p>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <p className="text-xs text-white/30 mb-1 uppercase tracking-wider">Holders</p>
              <p className="text-xl font-mono text-white">{holderCount}</p>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
            <p className="text-xs text-white/30 mb-3 uppercase tracking-wider">Token Metrics</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Total Deposited</span>
                <span className="font-mono text-white/70">{totalDeposited.toFixed(4)} INJ</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Current Price</span>
                <span className="font-mono text-emerald-400">{currentPrice.toFixed(6)} INJ</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Total Supply</span>
                <span className="font-mono text-white/70">{totalSupply} tokens</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Network</span>
                <span className="font-mono text-white/70">Injective EVM Testnet</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'identity' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-white/40 uppercase tracking-wider">On-Chain Agent Identity</p>
            {agentIdentity.active && (
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">VERIFIED</span>
            )}
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Standard</span>
              <span className="text-white/70 font-mono">ERC-8004</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Agent ID</span>
              <span className="text-white/70 font-mono">#{agentIdentity.agentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Name</span>
              <span className="text-white/70">{agentIdentity.name || 'Loading...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Model</span>
              <span className="text-white/70">{agentIdentity.modelProvider}/{agentIdentity.modelId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Capabilities</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {agentIdentity.capabilities.map(cap => (
                  <span key={cap} className="px-1.5 py-0.5 text-[9px] bg-white/5 text-white/50 rounded border border-white/10">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Status</span>
              <span className={agentIdentity.active ? 'text-emerald-400' : 'text-rose-400'}>
                {agentIdentity.active ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="text-white/40">Operator</span>
              <span className="text-white/50 font-mono text-xs">{agentIdentity.operator?.slice(0, 10)}...{agentIdentity.operator?.slice(-4)}</span>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-3">
            Identity stored on Injective EVM • NFT ID #{agentIdentity.agentId}
          </p>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg min-h-[120px] flex flex-col">
          <div className="flex-1 space-y-3 mb-3">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 shrink-0">V</div>
              <div>
                <p className="text-xs text-white/30 mb-0.5">Vivian</p>
                <p className="text-sm text-white/70">Markets are looking interesting today. Keep an eye on INJ/USDC 👀</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Message coming soon..."
              disabled
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none"
            />
            <button disabled className="p-2 bg-white/10 text-white/40 rounded">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-white/5">
        <button
          onClick={() => document.getElementById('trade-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex-1 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Trade
        </button>
        <a
          href={`https://testnet.blockscout.injective.network/address/0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 border border-white/10 text-white/70 text-sm font-medium rounded hover:border-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Explorer
        </a>
      </div>
    </div>
  )
}

export default IdolAnime
