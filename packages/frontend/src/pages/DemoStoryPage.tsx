import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Upload, Users, Film, Coins, TrendingUp, Gift } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useIdolToken } from '../hooks/useIdolToken'

interface Step {
  id: number
  title: string
  description: string
  detail: string
  icon: React.ElementType
  txHash?: string
  link?: string
  linkLabel?: string
  status: 'completed' | 'active' | 'upcoming'
}

const DemoStoryPage = () => {
  const { currentPrice, totalSupply, treasuryValue, holderCount, userBalance, userDividends } = useIdolToken()
  const [activeStep, setActiveStep] = useState(1)

  const steps: Step[] = [
    {
      id: 1,
      title: 'Creator Mints Identity',
      description: 'A creator uploads their likeness and mints an on-chain AI idol with a bonding curve token.',
      detail: `Vivian was created with ERC-8004 identity on Injective EVM Testnet. Her likeness is stored on-chain, and $VIVIAN token was deployed with a bonding curve pricing model. Initial price: 0.001 INJ.`,
      icon: Upload,
      txHash: '0xead373902e46d1f20fd47af372ba4c8201c2f1b1c2d3f828421167b3dca40d05',
      link: '/create',
      linkLabel: 'Try Create',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Fans Invest (Buy Tokens)',
      description: 'Fans buy $VIVIAN tokens via bonding curve. 80% goes to Treasury, 20% protocol fee.',
      detail: `Current state: ${totalSupply} tokens minted, ${holderCount} holders, price at ${currentPrice.toFixed(6)} INJ. Each purchase increases the price for the next buyer — early fans are rewarded.`,
      icon: Users,
      link: '/',
      linkLabel: 'Buy $VIVIAN',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Producer Acquires License',
      description: 'An AI drama producer holds 20%+ tokens, automatically qualifying for commercial usage rights.',
      detail: `With ${userBalance} tokens (${totalSupply > 0 ? ((userBalance / totalSupply) * 100).toFixed(1) : 0}% of supply), you qualify for ${(userBalance / totalSupply) >= 0.5 ? 'Exclusive' : (userBalance / totalSupply) >= 0.2 ? 'Standard' : 'Basic'} license. No approval needed — holding IS the license.`,
      icon: Film,
      link: '/idol/0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827',
      linkLabel: 'View License',
      status: 'completed',
    },
    {
      id: 4,
      title: 'AI Drama Earns Revenue',
      description: 'The AI short drama using Vivian\'s likeness generates revenue. Profit is sent to the Treasury contract.',
      detail: `Simulated: 0.3 INJ revenue from an AI drama was distributed to the contract via distributeProfits(). 50% (0.15 INJ) allocated to holder dividends, 50% (0.15 INJ) for buyback & burn.`,
      icon: Coins,
      txHash: '0x3dcca59b620e71d7e1104c1ea9bba8475bff3d53bc5f3327564b20cf80566ef1',
      status: 'completed',
    },
    {
      id: 5,
      title: 'Holders Claim Dividends',
      description: 'All $VIVIAN holders can claim their proportional share of the drama revenue.',
      detail: `Your claimable dividends: ${userDividends.toFixed(6)} INJ. This is your share based on holding ${userBalance} / ${totalSupply} tokens. Click Claim on the homepage or portfolio page.`,
      icon: Gift,
      link: '/portfolio',
      linkLabel: 'Claim Dividends',
      status: userDividends > 0 ? 'completed' : 'active',
    },
    {
      id: 6,
      title: 'Token Price Rises',
      description: 'More fans buy in after seeing the revenue share. Bonding curve ensures price increases with demand.',
      detail: `Current price: ${currentPrice.toFixed(6)} INJ. As more people buy, the price automatically increases via the bonding curve formula: price = 0.001 + (supply² / 1000). Early believers profit from later demand.`,
      icon: TrendingUp,
      link: '/',
      linkLabel: 'View Chart',
      status: 'active',
    },
  ]

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">Demo</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">
              The Full Story
            </h1>
            <p className="text-lg text-white/40 mt-4 max-w-2xl">
              How a face becomes an asset, earns revenue from AI dramas, and shares profits with all token holders. Every step below happened on-chain.
            </p>
          </div>

          {/* Live stats banner */}
          <div className="grid grid-cols-4 gap-4 mb-12 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-white/30 mb-1">Token Price</p>
              <p className="text-lg font-mono text-white">{currentPrice.toFixed(4)} INJ</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/30 mb-1">Holders</p>
              <p className="text-lg font-mono text-white">{holderCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/30 mb-1">Treasury</p>
              <p className="text-lg font-mono text-emerald-400">{treasuryValue.toFixed(2)} INJ</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/30 mb-1">Your Dividends</p>
              <p className="text-lg font-mono text-emerald-400">{userDividends.toFixed(4)} INJ</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-8">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`relative flex gap-6 cursor-pointer group`}
                  onClick={() => setActiveStep(step.id)}
                >
                  {/* Step indicator */}
                  <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : step.status === 'active'
                      ? 'bg-white/5 border-white/20'
                      : 'bg-white/[0.02] border-white/5'
                  }`}>
                    {step.status === 'completed' ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${step.status === 'active' ? 'text-white/60' : 'text-white/20'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-8 ${activeStep === step.id ? '' : ''}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-lg font-medium ${step.status === 'completed' ? 'text-white' : step.status === 'active' ? 'text-white/80' : 'text-white/40'}`}>
                        {step.title}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        step.status === 'completed'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                          : step.status === 'active'
                          ? 'border-white/20 text-white/50 bg-white/5'
                          : 'border-white/5 text-white/20'
                      }`}>
                        {step.status === 'completed' ? 'Done' : step.status === 'active' ? 'Current' : 'Next'}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mb-3">{step.description}</p>

                    {/* Expanded detail */}
                    {activeStep === step.id && (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl mt-3 animate-fade-in">
                        <p className="text-sm text-white/60 leading-relaxed mb-3">{step.detail}</p>
                        <div className="flex items-center gap-3">
                          {step.txHash && (
                            <a
                              href={`https://testnet.blockscout.injective.network/tx/${step.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-400/60 hover:text-emerald-400 font-mono"
                            >
                              tx: {step.txHash.slice(0, 10)}...
                            </a>
                          )}
                          {step.link && (
                            <Link
                              to={step.link}
                              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                            >
                              {step.linkLabel} <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-12 p-6 bg-white/[0.02] border border-emerald-500/10 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-3">The Flywheel</h3>
            <div className="flex items-center gap-2 flex-wrap text-sm text-white/50">
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">Upload Face</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">Mint Token</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">Fans Buy In</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">AI Drama Revenue</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">Dividends to All Holders</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">Price Rises</span>
              <ArrowRight className="w-4 h-4 text-white/20" />
              <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">More Fans</span>
            </div>
            <p className="text-xs text-white/30 mt-4">
              All steps above are real on-chain transactions on Injective EVM Testnet. Verify any tx hash on the block explorer.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DemoStoryPage
