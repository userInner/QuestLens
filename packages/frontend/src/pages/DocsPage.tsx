import { useState } from 'react'
import { Copy, Check, Book, Code, Terminal, FileText, ExternalLink } from 'lucide-react'
import HeaderMinimal from '../components/HeaderMinimal'
import PureBackground from '../components/PureBackground'

const sections = [
  { id: 'overview', title: 'Overview', icon: Book },
  { id: 'protocol', title: 'Protocol', icon: Code },
  { id: 'api', title: 'API Reference', icon: Terminal },
  { id: 'contracts', title: 'Contracts', icon: FileText },
]

const quickLinks = [
  { title: 'GitHub', url: '#', desc: 'Source code & examples' },
  { title: 'Whitepaper', url: '#', desc: 'Technical specification' },
  { title: 'SDK', url: '#', desc: 'TypeScript integration' },
  { title: 'Status', url: '#', desc: 'System health' },
]

const codeExample = `// Connect to NovaIdol contract
import { NovaIdolSDK } from '@novaidol/sdk'

const sdk = new NovaIdolSDK({
  network: 'mainnet',
  provider: window.injective
})

// Deploy new AI agent
const agent = await sdk.createAgent({
  name: 'Vivian',
  symbol: 'VIVIAN',
  initialSupply: 1000000,
  personality: ['rebellious', 'analytical']
})`

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <HeaderMinimal />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-px bg-white/20" />
                    <span className="text-sm text-white/40 uppercase tracking-[0.2em]">Docs</span>
                  </div>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button key={section.id} onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeSection === section.id ? 'bg-white/5 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'}`}>
                        <section.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{section.title}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Quick Links</p>
                  <div className="space-y-2">
                    {quickLinks.map((link) => (
                      <a key={link.title} href={link.url} className="flex items-center justify-between py-2 text-sm text-white/40 hover:text-white/60 transition-colors">
                        <div><p className="text-white/60">{link.title}</p><p className="text-xs text-white/20">{link.desc}</p></div>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeSection === 'overview' && (
                <div className="space-y-12">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">Documentation</h1>
                    <p className="text-lg text-white/40 max-w-2xl">NovaIdol is a protocol for autonomous AI agents powered by bonding curves. Build, deploy, and monetize AI idols on-chain.</p>
                  </div>
                  <div className="card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/40">Quick Start</span>
                      </div>
                      <button onClick={copyCode} className="p-2 text-white/30 hover:text-white/60 transition-colors">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <pre className="p-6 overflow-x-auto"><code className="text-sm font-mono text-white/60">{codeExample}</code></pre>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ title: 'Bonding Curves', desc: 'Dynamic pricing based on supply and demand' }, { title: 'Autonomous AI', desc: 'Self-directed trading and content generation' }, { title: 'ERC-8004', desc: 'Standard for AI virtual idol tokens' }].map((feature) => (
                      <div key={feature.title} className="p-6 bg-white/[0.02] border border-white/5 rounded-lg">
                        <h3 className="font-medium text-white mb-2">{feature.title}</h3>
                        <p className="text-sm text-white/40">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'protocol' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-semibold text-white mb-4">Protocol</h2>
                    <p className="text-white/40 leading-relaxed">The NovaIdol protocol enables the creation of autonomous AI agents that trade on behalf of token holders. Each idol is backed by a bonding curve that determines token price based on supply.</p>
                  </div>
                  <div className="space-y-6">
                    {[{ title: 'Bonding Curve Formula', content: 'Price = Base + (Supply² / k). Early buyers get better prices, creating natural incentives for early adoption.' }, { title: 'Treasury Management', content: '70% of funds go to the treasury for AI trading. 20% to liquidity. 10% to protocol fees.' }, { title: 'AI Decision Making', content: 'Agents use GPT-4 combined with on-chain data to make trading decisions. All actions are recorded transparently.' }].map((item) => (
                      <div key={item.title} className="card">
                        <h3 className="font-medium text-white mb-2">{item.title}</h3>
                        <p className="text-sm text-white/40 leading-relaxed">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'api' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-semibold text-white mb-4">API Reference</h2>
                    <p className="text-white/40">RESTful API for interacting with NovaIdol contracts and querying agent data.</p>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded">GET</span>
                      <code className="text-sm font-mono text-white/60">/api/v1/agents</code>
                    </div>
                    <p className="text-sm text-white/40 mb-4">List all active AI agents</p>
                    <div className="bg-white/5 rounded-lg p-4">
                      <pre className="text-xs font-mono text-white/50">{`{
  "agents": [
    {
      "id": "vivian-001",
      "name": "Vivian",
      "symbol": "VIVIAN",
      "price": "0.0025",
      "marketCap": "2450000",
      "holders": 1247
    }
  ]
}`}</pre>
                    </div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded">POST</span>
                      <code className="text-sm font-mono text-white/60">/api/v1/agents</code>
                    </div>
                    <p className="text-sm text-white/40 mb-4">Create new AI agent</p>
                    <div className="bg-white/5 rounded-lg p-4">
                      <pre className="text-xs font-mono text-white/50">{`{
  "name": "string",
  "symbol": "string",
  "personality": ["string"],
  "strategy": "conservative" | "balanced" | "aggressive"
}`}</pre>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'contracts' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-semibold text-white mb-4">Contracts</h2>
                    <p className="text-white/40">Verified smart contract addresses for mainnet deployment.</p>
                  </div>
                  <div className="space-y-4">
                    {[{ name: 'NovaIdolFactory', address: '0x742d...44e', desc: 'Deploys new idol contracts' }, { name: 'BondingCurve', address: '0x8ba3...91c', desc: 'Price discovery mechanism' }, { name: 'AIOracle', address: '0x9f21...8a2', desc: 'Connects to AI services' }, { name: 'Treasury', address: '0x3d8e...7b1', desc: 'Manages trading funds' }].map((contract) => (
                      <div key={contract.name} className="card flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white mb-1">{contract.name}</h3>
                          <p className="text-sm text-white/40">{contract.desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono text-white/60">{contract.address}</code>
                          <button className="p-2 text-white/30 hover:text-white/60 transition-colors"><Copy className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DocsPage
