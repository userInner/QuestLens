import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import HeroMinimal from '../components/HeroMinimal'
import PureBackground from '../components/PureBackground'
import IdolAnime from '../components/IdolAnime'
import ChartMinimal from '../components/ChartMinimal'
import TradeMinimal from '../components/TradeMinimal'
import ClaimDividends from '../components/ClaimDividends'
import { ToastContainer, useToast } from '../components/ui/Toast'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useIdolToken } from '../hooks/useIdolToken'

const TreasuryMinimal = lazy(() => import('../components/TreasuryMinimal'))

const HomePage = () => {
  const {
    symbol,
    currentPrice,
    totalSupply,
    treasuryValue,
    marketCap,
    holderCount,
    totalDeposited,
    userBalance,
    curvePoints,
    isLoading: isDataLoading,
    refetch,
  } = useIdolToken()

  const { toasts, addToast, removeToast } = useToast()

  const handleTradeSuccess = () => {
    refetch()
    addToast({
      type: 'success',
      title: 'Transaction Confirmed',
      message: 'Your trade has been executed on-chain',
      duration: 5000,
    })
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-bold">N</span>
          </div>
          <p className="text-white/40 text-sm font-mono">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="relative z-10">
        <HeroMinimal />

        {/* Main content - clean grid */}
        <div className="container pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Anime Idol Card */}
            <div className="lg:col-span-4">
              <IdolAnime />
            </div>

            {/* Right: Chart & Trade */}
            <div className="lg:col-span-8 space-y-8">
              <ChartMinimal
                currentPrice={currentPrice}
                supply={totalSupply}
                holderCount={holderCount}
                marketCap={marketCap}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <TradeMinimal
                  currentPrice={currentPrice}
                  totalSupply={totalSupply}
                  userBalance={userBalance}
                  symbol={symbol}
                  onTradeSuccess={handleTradeSuccess}
                />
                <div className="space-y-8">
                  <ClaimDividends />
                  <Suspense fallback={<CardSkeleton />}>
                    <TreasuryMinimal
                      treasuryValue={treasuryValue}
                      marketCap={marketCap}
                      holderCount={holderCount}
                      totalDeposited={totalDeposited}
                      currentPrice={currentPrice}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">N</span>
              </div>
              <span className="text-white font-medium">NovaIdol</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/30">
              <Link to="/docs" className="hover:text-white/60 transition-colors">Docs</Link>
              <a href="#" className="hover:text-white/60 transition-colors">GitHub</a>
              <a href="#" className="hover:text-white/60 transition-colors">Twitter</a>
            </div>

            <p className="text-xs text-white/20 font-mono">
              v1.0.0 &bull; ERC-8004
            </p>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default HomePage
