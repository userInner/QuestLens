import { useState } from 'react'
import { ArrowRight, ArrowLeft, Sparkles, Check, Cpu, Shield, Zap, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useWallet } from '../hooks/useWallet'
import { useCreateIdol } from '../hooks/useCreateIdol'

const steps = [
  { id: 1, title: 'Configure', description: 'Set basic parameters' },
  { id: 2, title: 'Personality', description: 'Define AI character' },
  { id: 3, title: 'Deploy', description: 'Launch to testnet' },
]

const personalityTraits = ['rebellious', 'analytical', 'chaotic', 'strategic', 'cautious', 'aggressive', 'meme-savvy', 'technical']

const roleTypes = [
  { id: 'trader', label: 'Trader', desc: 'Perpetual futures & spot trading' },
  { id: 'artist', label: 'Artist', desc: 'NFT creation & collection' },
  { id: 'detective', label: 'Detective', desc: 'On-chain analysis & alpha' },
  { id: 'influencer', label: 'Influencer', desc: 'Content creation & viral marketing' },
]

const CreatePage = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    roleType: 'trader',
    personality: [] as string[],
    strategy: 'balanced',
  })

  const { isConnected, ethereumAddress } = useWallet()
  const { deploy, isDeploying, txHash, error, deployedToken, reset } = useCreateIdol()

  const togglePersonality = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality: prev.personality.includes(trait)
        ? prev.personality.filter(t => t !== trait)
        : [...prev.personality, trait],
    }))
  }

  const handleDeploy = async () => {
    if (!formData.name || !formData.symbol) return

    const personality = JSON.stringify({
      traits: formData.personality,
      trading_style: formData.strategy,
      description: formData.description,
    })

    await deploy({
      name: `${formData.name} Token`,
      symbol: formData.symbol,
      roleType: formData.roleType,
      personality,
    })
  }

  const canProceedStep1 = formData.name.length > 0 && formData.symbol.length > 0
  const canProceedStep2 = formData.personality.length >= 2

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container max-w-4xl">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">Launch</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">Create Agent</h1>
            <p className="text-lg text-white/40 mt-4">Deploy an autonomous AI idol with bonding curve mechanics.</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-4 mb-12 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4 shrink-0">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${currentStep === step.id ? 'border-white/20 bg-white/5' : currentStep > step.id ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep > step.id ? 'bg-emerald-500 text-black' : currentStep === step.id ? 'bg-white text-black' : 'bg-white/10 text-white/40'}`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${currentStep === step.id ? 'text-white' : 'text-white/40'}`}>{step.title}</p>
                    <p className="text-xs text-white/20">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="card">
            {/* Step 1: Configure */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Agent Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Vivian"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Symbol *</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="e.g. VIVIAN"
                      maxLength={8}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your AI agent's trading style and personality..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">Role Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {roleTypes.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setFormData(prev => ({ ...prev, roleType: role.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${formData.roleType === role.id ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'}`}
                      >
                        <p className={`font-medium text-sm ${formData.roleType === role.id ? 'text-white' : 'text-white/60'}`}>{role.label}</p>
                        <p className="text-xs text-white/30 mt-1">{role.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Personality */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">Personality Traits (select 2-4)</label>
                  <div className="flex flex-wrap gap-2">
                    {personalityTraits.map((trait) => (
                      <button
                        key={trait}
                        onClick={() => togglePersonality(trait)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${formData.personality.includes(trait) ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'}`}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                  {formData.personality.length < 2 && (
                    <p className="text-xs text-white/30 mt-3">Select at least 2 traits to continue</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">Trading Strategy</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'conservative', label: 'Conservative', icon: Shield, desc: 'Low risk, steady gains' },
                      { id: 'balanced', label: 'Balanced', icon: Zap, desc: 'Moderate risk/reward' },
                      { id: 'aggressive', label: 'Aggressive', icon: Cpu, desc: 'High risk, high reward' },
                    ].map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => setFormData(prev => ({ ...prev, strategy: strategy.id }))}
                        className={`p-4 rounded-lg border text-left transition-all ${formData.strategy === strategy.id ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'}`}
                      >
                        <strategy.icon className={`w-5 h-5 mb-2 ${formData.strategy === strategy.id ? 'text-white' : 'text-white/30'}`} />
                        <p className={`font-medium text-sm ${formData.strategy === strategy.id ? 'text-white' : 'text-white/60'}`}>{strategy.label}</p>
                        <p className="text-xs text-white/30 mt-1">{strategy.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Deploy */}
            {currentStep === 3 && (
              <div className="text-center py-12">
                {!deployedToken ? (
                  <>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Ready to Deploy</h3>
                    <p className="text-white/40 mb-8 max-w-md mx-auto">
                      Your AI agent <span className="text-white font-medium">{formData.name}</span> will be deployed to Injective EVM Testnet with bonding curve mechanics.
                    </p>

                    {/* Summary */}
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg max-w-md mx-auto mb-8 text-left">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">Name</span>
                          <span className="text-white font-medium">{formData.name} Token</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Symbol</span>
                          <span className="text-white font-mono">${formData.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Role</span>
                          <span className="text-white capitalize">{formData.roleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Strategy</span>
                          <span className="text-white capitalize">{formData.strategy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Traits</span>
                          <span className="text-white">{formData.personality.join(', ')}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-white/5">
                          <span className="text-white/40">Creation Fee</span>
                          <span className="text-white font-mono">0.1 INJ</span>
                        </div>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="max-w-md mx-auto mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-left">
                        <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-rose-400">{error}</p>
                      </div>
                    )}

                    {/* Deploy button */}
                    {!isConnected ? (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-wallet-modal'))}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                      >
                        Connect Wallet to Deploy
                      </button>
                    ) : (
                      <button
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                      >
                        {isDeploying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Deploy Agent (0.1 INJ)
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  /* Success state */
                  <>
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Agent Deployed!</h3>
                    <p className="text-white/40 mb-8 max-w-md mx-auto">
                      <span className="text-white font-medium">{formData.name}</span> is now live on Injective EVM Testnet.
                    </p>

                    <div className="p-6 bg-white/[0.02] border border-emerald-500/20 rounded-lg max-w-md mx-auto mb-8 text-left">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">Token Address</span>
                          <a
                            href={`https://testnet.blockscout.injective.network/address/${deployedToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 font-mono text-xs flex items-center gap-1 hover:underline"
                          >
                            {deployedToken.slice(0, 10)}...{deployedToken.slice(-6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {txHash && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Transaction</span>
                            <a
                              href={`https://testnet.blockscout.injective.network/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 font-mono text-xs flex items-center gap-1 hover:underline"
                            >
                              {txHash.slice(0, 10)}...{txHash.slice(-6)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <a
                        href={`/idol/${deployedToken}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                      >
                        View Agent
                      </a>
                      <button
                        onClick={() => { reset(); setCurrentStep(1); setFormData({ name: '', symbol: '', description: '', roleType: 'trader', personality: [], strategy: 'balanced' }) }}
                        className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-white/60 font-medium rounded-lg hover:border-white/20 hover:text-white transition-colors"
                      >
                        Create Another
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Navigation */}
            {currentStep < 3 && (
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/5">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />Back
                </button>
                <button
                  onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                  disabled={(currentStep === 1 && !canProceedStep1) || (currentStep === 2 && !canProceedStep2)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue<ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CreatePage
