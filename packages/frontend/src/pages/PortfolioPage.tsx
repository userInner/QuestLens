import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, Gift, Activity, ExternalLink, ArrowUpRight, ArrowDownRight, Copy, Check } from 'lucide-react'
import { ethers } from 'ethers'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import ClaimDividends from '../components/ClaimDividends'
import { useWallet } from '../hooks/useWallet'
import { useIdolToken } from '../hooks/useIdolToken'
import { CONTRACT_ADDRESSES, IDOL_TOKEN_ABI, getReadProvider, formatInj, isContractDeployed } from '../services/contract'
import { useT } from '../i18n'

interface UserTrade {
  type: 'buy' | 'sell'
  amount: number
  cost: number
  block: number
  txHash: string
}

const PortfolioPage = () => {
  const { isConnected, injectiveAddress, ethereumAddress, balance: walletBalance } = useWallet()
  const { symbol, currentPrice, userBalance, userDividends, treasuryValue, totalSupply } = useIdolToken()
  const [trades, setTrades] = useState<UserTrade[]>([])
  const [isLoadingTrades, setIsLoadingTrades] = useState(true)
  const [copied, setCopied] = useState(false)
  const t = useT()

  // Calculate portfolio value
  const holdingValue = userBalance * currentPrice
  const portfolioShare = totalSupply > 0 ? ((userBalance / totalSupply) * 100) : 0

  // Fetch user's trade history
  useEffect(() => {
    async function fetchUserTrades() {
      if (!isConnected || !ethereumAddress) {
        setIsLoadingTrades(false)
        return
      }

      const contractAddress = CONTRACT_ADDRESSES.idolToken
      if (!isContractDeployed(contractAddress)) {
        setIsLoadingTrades(false)
        return
      }

      try {
        const provider = getReadProvider()
        const contract = new ethers.Contract(contractAddress, IDOL_TOKEN_ABI, provider)
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 10000)

        // Filter by user address
        const buyFilter = contract.filters.TokensPurchased(ethereumAddress)
        const sellFilter = contract.filters.TokensSold(ethereumAddress)

        const [buyEvents, sellEvents] = await Promise.all([
          contract.queryFilter(buyFilter, fromBlock, currentBlock),
          contract.queryFilter(sellFilter, fromBlock, currentBlock),
        ])

        const userTrades: UserTrade[] = [
          ...buyEvents.map(e => ({
            type: 'buy' as const,
            amount: Number(e.args?.[1] || 0),
            cost: Number(formatInj(e.args?.[2] || 0n)),
            block: e.blockNumber,
            txHash: e.transactionHash,
          })),
          ...sellEvents.map(e => ({
            type: 'sell' as const,
            amount: Number(e.args?.[1] || 0),
            cost: Number(formatInj(e.args?.[2] || 0n)),
            block: e.blockNumber,
            txHash: e.transactionHash,
          })),
        ].sort((a, b) => b.block - a.block)

        setTrades(userTrades)
      } catch (err) {
        console.warn('Failed to fetch user trades:', err)
      } finally {
        setIsLoadingTrades(false)
      }
    }

    fetchUserTrades()
  }, [isConnected, ethereumAddress])

  // Total spent / received
  const totalSpent = trades.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.cost, 0)
  const totalReceived = trades.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.cost, 0)
  const realizedPnL = totalReceived - totalSpent + holdingValue

  const copyAddress = async () => {
    if (ethereumAddress) {
      await navigator.clipboard.writeText(ethereumAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">{t('portfolio.label')}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">{t('portfolio.title')}</h1>
            <p className="text-lg text-white/40 mt-4">{t('portfolio.subtitle')}</p>
          </div>

          {!isConnected ? (
            /* Not connected state */
            <div className="card text-center py-16">
              <Wallet className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">{t('portfolio.connect.title')}</h3>
              <p className="text-white/40 mb-6">{t('portfolio.connect.desc')}</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-wallet-modal'))}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                {t('portfolio.connect.btn')}
              </button>
            </div>
          ) : (
            <>
              {/* Wallet info */}
              <div className="card mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <p className="text-sm text-white/40">{t('portfolio.wallet.connected')}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white">{ethereumAddress?.slice(0, 12)}...{ethereumAddress?.slice(-6)}</span>
                        <button onClick={copyAddress} className="text-white/30 hover:text-white/50 transition-colors">
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/40">{t('portfolio.wallet.inj.balance')}</p>
                    <p className="text-xl font-mono text-white">{parseFloat(walletBalance).toFixed(4)} INJ</p>
                  </div>
                </div>
              </div>

              {/* Portfolio stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-xs text-white/30 uppercase tracking-wider">{t('portfolio.stats.holdings')}</span>
                  </div>
                  <p className="text-2xl font-mono text-white">{userBalance}</p>
                  <p className="text-xs text-white/30 mt-1">{symbol} {t('common.tokens').toLowerCase()}</p>
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-xs text-white/30 uppercase tracking-wider">{t('portfolio.stats.value')}</span>
                  </div>
                  <p className="text-2xl font-mono text-white">{holdingValue.toFixed(4)}</p>
                  <p className="text-xs text-white/30 mt-1">INJ</p>
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-3.5 h-3.5 text-emerald-400/50" />
                    <span className="text-xs text-white/30 uppercase tracking-wider">{t('portfolio.stats.dividends')}</span>
                  </div>
                  <p className="text-2xl font-mono text-emerald-400">{userDividends.toFixed(4)}</p>
                  <p className="text-xs text-white/30 mt-1">{t('portfolio.stats.dividends.claimable')}</p>
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-xs text-white/30 uppercase tracking-wider">{t('portfolio.stats.share')}</span>
                  </div>
                  <p className="text-2xl font-mono text-white">{portfolioShare.toFixed(1)}%</p>
                  <p className="text-xs text-white/30 mt-1">{t('portfolio.stats.share.desc')}</p>
                </div>
              </div>

              {/* Main content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Trade history */}
                <div className="lg:col-span-2">
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-medium text-white">{t('portfolio.trades.title')}</h3>
                      <span className="text-xs text-white/30">{trades.length} {t('portfolio.trades.transactions')}</span>
                    </div>

                    {isLoadingTrades ? (
                      <div className="text-center py-8 text-white/30">{t('portfolio.trades.loading')}</div>
                    ) : trades.length === 0 ? (
                      <div className="text-center py-12">
                        <Activity className="w-8 h-8 text-white/10 mx-auto mb-3" />
                        <p className="text-white/40 mb-4">{t('portfolio.trades.empty')}</p>
                        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
                          {t('trade.buy')} {symbol}
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trades.map((trade, i) => (
                          <div key={i} className="flex items-center justify-between py-3 px-4 bg-white/[0.02] border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                trade.type === 'buy' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                              }`}>
                                {trade.type === 'buy'
                                  ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                  : <ArrowDownRight className="w-4 h-4 text-rose-400" />
                                }
                              </div>
                              <div>
                                <p className="text-sm text-white font-medium">
                                  {trade.type === 'buy' ? t('portfolio.trades.bought') : t('portfolio.trades.sold')} {trade.amount} {symbol}
                                </p>
                                <p className="text-xs text-white/30">Block #{trade.block}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className={`font-mono text-sm ${trade.type === 'buy' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {trade.type === 'buy' ? '-' : '+'}{trade.cost.toFixed(4)} INJ
                                </p>
                              </div>
                              <a
                                href={`https://testnet.blockscout.injective.network/tx/${trade.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/20 hover:text-white/40 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {trades.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-white/30 mb-1">{t('portfolio.trades.total.spent')}</p>
                          <p className="font-mono text-sm text-rose-400">{totalSpent.toFixed(4)} INJ</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-1">{t('portfolio.trades.total.received')}</p>
                          <p className="font-mono text-sm text-emerald-400">{totalReceived.toFixed(4)} INJ</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/30 mb-1">{t('portfolio.trades.unrealized')}</p>
                          <p className="font-mono text-sm text-white">{holdingValue.toFixed(4)} INJ</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Claim + quick stats */}
                <div className="space-y-8">
                  <ClaimDividends />

                  {/* Holdings card */}
                  <div className="card">
                    <h3 className="text-sm font-medium text-white mb-4">{t('portfolio.position.title')}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('portfolio.position.token')}</span>
                        <Link to={`/idol/${CONTRACT_ADDRESSES.idolToken}`} className="text-white hover:text-emerald-400 transition-colors font-mono flex items-center gap-1">
                          ${symbol} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('portfolio.position.price')}</span>
                        <span className="text-white font-mono">{currentPrice.toFixed(6)} INJ</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('portfolio.position.balance')}</span>
                        <span className="text-white font-mono">{userBalance} {t('common.tokens').toLowerCase()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('portfolio.position.share')}</span>
                        <span className="text-white font-mono">{portfolioShare.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('portfolio.position.treasury')}</span>
                        <span className="text-white font-mono">{treasuryValue.toFixed(2)} INJ</span>
                      </div>
                      <div className="flex justify-between text-sm pt-3 border-t border-white/5">
                        <span className="text-white/40">{t('portfolio.position.network')}</span>
                        <span className="text-white/60 text-xs">{t('portfolio.position.network.value')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default PortfolioPage
