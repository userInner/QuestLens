import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, TrendingUp, Users, Activity, Zap, Copy, Check, MessageSquare } from 'lucide-react'
import { ethers } from 'ethers'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import ChartMinimal from '../components/ChartMinimal'
import TradeMinimal from '../components/TradeMinimal'
import { useIdolToken } from '../hooks/useIdolToken'
import { useWallet } from '../hooks/useWallet'
import { IDOL_TOKEN_ABI, getReadProvider, formatInj, CONTRACT_ADDRESSES, isContractDeployed } from '../services/contract'

interface TradeEvent {
  type: 'buy' | 'sell'
  address: string
  amount: number
  cost: number
  block: number
  txHash: string
}

interface AgentTweet {
  text: string
  timestamp: number
  type: 'trade' | 'analysis' | 'meme'
}

const IdolDetailPage = () => {
  const { address } = useParams<{ address: string }>()
  const tokenAddress = address || CONTRACT_ADDRESSES.idolToken
  const [copied, setCopied] = useState(false)
  const [tradeHistory, setTradeHistory] = useState<TradeEvent[]>([])
  const [tweets, setTweets] = useState<AgentTweet[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isRequestingLicense, setIsRequestingLicense] = useState(false)
  const [licenseGranted, setLicenseGranted] = useState(false)
  const [licenseId, setLicenseId] = useState(0)

  const {
    name, symbol, currentPrice, totalSupply,
    treasuryValue, holderCount, totalDeposited,
    userBalance, isContractLive, refetch,
  } = useIdolToken(tokenAddress)

  const { isConnected } = useWallet()

  // Copy address
  const copyAddress = async () => {
    await navigator.clipboard.writeText(tokenAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Request license (demo: simulates contract call)
  const handleRequestLicense = async () => {
    setIsRequestingLicense(true)
    try {
      // In production: call IdolLicensing.requestLicense(token, tier, "short_drama", 30)
      // For demo: simulate success after delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      const id = Math.floor(Math.random() * 1000) + 1
      setLicenseId(id)
      setLicenseGranted(true)
    } catch (err) {
      console.error('License request failed:', err)
    } finally {
      setIsRequestingLicense(false)
    }
  }

  // Fetch on-chain trade history
  useEffect(() => {
    async function fetchHistory() {
      if (!isContractDeployed(tokenAddress)) {
        setIsLoadingHistory(false)
        return
      }
      try {
        const provider = getReadProvider()
        const contract = new ethers.Contract(tokenAddress, IDOL_TOKEN_ABI, provider)
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 10000)

        const [buyEvents, sellEvents] = await Promise.all([
          contract.queryFilter(contract.filters.TokensPurchased(), fromBlock, currentBlock),
          contract.queryFilter(contract.filters.TokensSold(), fromBlock, currentBlock),
        ])

        const history: TradeEvent[] = [
          ...buyEvents.map(e => ({
            type: 'buy' as const,
            address: e.args?.[0] || '',
            amount: Number(e.args?.[1] || 0),
            cost: Number(formatInj(e.args?.[2] || 0n)),
            block: e.blockNumber,
            txHash: e.transactionHash,
          })),
          ...sellEvents.map(e => ({
            type: 'sell' as const,
            address: e.args?.[0] || '',
            amount: Number(e.args?.[1] || 0),
            cost: Number(formatInj(e.args?.[2] || 0n)),
            block: e.blockNumber,
            txHash: e.transactionHash,
          })),
        ].sort((a, b) => b.block - a.block)

        setTradeHistory(history)

        // Generate AI tweets based on trade events
        generateTweets(history)
      } catch (err) {
        console.warn('Failed to fetch trade history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [tokenAddress])

  // Generate simulated AI agent tweets based on real trade events
  function generateTweets(trades: TradeEvent[]) {
    if (trades.length === 0) return

    const tweetTemplates = {
      buy: [
        (t: TradeEvent) => `🚀 New holder joined the squad! Someone just picked up ${t.amount} $${symbol} tokens for ${t.cost.toFixed(4)} INJ. Welcome aboard, anon! Treasury growing stronger 💪`,
        (t: TradeEvent) => `📈 Another buy signal confirmed. ${t.amount} tokens minted at ${currentPrice.toFixed(6)} INJ. The curve doesn't lie — we're going up only.`,
        (t: TradeEvent) => `GM to everyone who's buying the dip. ${t.cost.toFixed(4)} INJ flowing into treasury. Time to put this capital to work 🎯`,
      ],
      sell: [
        (t: TradeEvent) => `📊 Paper hands alert! Someone sold ${t.amount} $${symbol} tokens. More supply for diamond hands. Treasury still healthy at ${treasuryValue.toFixed(2)} INJ 💎`,
        (t: TradeEvent) => `Somebody took profits — ${t.cost.toFixed(4)} INJ out. Respect the play. We're still early though. Current price: ${currentPrice.toFixed(6)} INJ`,
      ],
      analysis: [
        () => `📉 Market analysis: With ${holderCount} holders and ${totalSupply} supply, current price at ${currentPrice.toFixed(6)} INJ looks like accumulation zone. Not financial advice, I'm literally an AI 🤖`,
        () => `🧠 Treasury update: ${treasuryValue.toFixed(2)} INJ under management. Bonding curve backing is solid. Next target: break above ${(currentPrice * 1.5).toFixed(6)} INJ resistance.`,
        () => `⚡ Running on Injective EVM Testnet. ${holderCount} addresses holding $${symbol}. The AI doesn't sleep, doesn't eat, doesn't rug. Just trades. 24/7/365.`,
      ],
    }

    const generatedTweets: AgentTweet[] = []

    // Generate tweets from recent trades
    trades.slice(0, 3).forEach((trade, i) => {
      const templates = tweetTemplates[trade.type]
      const template = templates[i % templates.length]
      generatedTweets.push({
        text: template(trade),
        timestamp: Date.now() - (i + 1) * 3600000, // hours ago
        type: 'trade',
      })
    })

    // Add an analysis tweet
    const analysisTemplate = tweetTemplates.analysis[Math.floor(Math.random() * tweetTemplates.analysis.length)]
    generatedTweets.push({
      text: analysisTemplate(trades[0]),
      timestamp: Date.now() - 7200000,
      type: 'analysis',
    })

    setTweets(generatedTweets)
  }

  const handleTradeSuccess = () => refetch()

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container">
          {/* Back nav */}
          <Link to="/explore" className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Explore</span>
          </Link>

          {/* ─── Hero Banner with large idol image ─── */}
          <div className="relative rounded-2xl overflow-hidden mb-10 border border-white/5">
            <div className="h-[320px] md:h-[400px] relative">
              <img
                src="/idols/vivian/avatar.png"
                alt={name}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 to-transparent" />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl md:text-5xl font-bold text-white">{name?.replace(' Token', '') || 'Vivian'}</h1>
                      <span className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                        AI IDOL
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-white/50 font-mono">${symbol}</span>
                      <button onClick={copyAddress} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-6)}
                      </button>
                    </div>
                  </div>
                  <a
                    href={`https://testnet.blockscout.injective.network/address/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg text-sm text-white/60 hover:text-white/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
                  </a>
                </div>
              </div>

              {/* Top badges */}
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            {[
              { icon: Activity, label: 'Price', value: `${currentPrice.toFixed(6)} INJ` },
              { icon: TrendingUp, label: 'Supply', value: `${totalSupply} tokens` },
              { icon: Users, label: 'Holders', value: holderCount.toString() },
              { icon: Zap, label: 'Treasury', value: `${treasuryValue.toFixed(2)} INJ` },
              { icon: Activity, label: 'Deposited', value: `${totalDeposited.toFixed(4)} INJ` },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-xs text-white/30 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="font-mono text-white text-lg">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* ─── Licensing Rights (持币使用权) ─── */}
          <div className="card mb-10 border-emerald-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                形象使用权 Licensing
              </h3>
              <span className="text-[10px] text-white/30">基于持币比例自动授权</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${userBalance > 0 && totalSupply > 0 && (userBalance / totalSupply) >= 0.1 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-emerald-400">Basic</span>
                  <span className="text-xs text-white/30 font-mono">≥ 10%</span>
                </div>
                <p className="text-sm text-white/60">社区内容创作权</p>
                <p className="text-[10px] text-white/30 mt-1">粉丝二创、表情包、社区活动</p>
              </div>
              <div className={`p-4 rounded-xl border ${userBalance > 0 && totalSupply > 0 && (userBalance / totalSupply) >= 0.2 ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-400">Standard</span>
                  <span className="text-xs text-white/30 font-mono">≥ 20%</span>
                </div>
                <p className="text-sm text-white/60">商业 AI 短剧使用权</p>
                <p className="text-[10px] text-white/30 mt-1">用该形象参演商业内容、综艺</p>
              </div>
              <div className={`p-4 rounded-xl border ${userBalance > 0 && totalSupply > 0 && (userBalance / totalSupply) >= 0.5 ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-400">Exclusive</span>
                  <span className="text-xs text-white/30 font-mono">≥ 50%</span>
                </div>
                <p className="text-sm text-white/60">独家使用权</p>
                <p className="text-[10px] text-white/30 mt-1">限定期限内独占该形象商业权益</p>
              </div>
            </div>
            {userBalance > 0 && totalSupply > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/40">
                    你的持仓: {userBalance} / {totalSupply} ({((userBalance / totalSupply) * 100).toFixed(1)}%)
                  </span>
                  <span className={`text-xs font-medium ${
                    (userBalance / totalSupply) >= 0.5 ? 'text-purple-400' :
                    (userBalance / totalSupply) >= 0.2 ? 'text-blue-400' :
                    (userBalance / totalSupply) >= 0.1 ? 'text-emerald-400' :
                    'text-white/30'
                  }`}>
                    {(userBalance / totalSupply) >= 0.5 ? 'Exclusive 权限已解锁' :
                     (userBalance / totalSupply) >= 0.2 ? 'Standard 权限已解锁' :
                     (userBalance / totalSupply) >= 0.1 ? 'Basic 权限已解锁' :
                     '增持到 10% 解锁使用权'}
                  </span>
                </div>

                {/* 申请使用权按钮 */}
                {(userBalance / totalSupply) >= 0.1 && (
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-white font-medium">申请商业使用授权</p>
                        <p className="text-xs text-white/30 mt-0.5">获得链上许可证，用于 AI 短剧制作</p>
                      </div>
                      <button
                        onClick={handleRequestLicense}
                        disabled={isRequestingLicense}
                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                      >
                        {isRequestingLicense ? 'Requesting...' : '申请 License'}
                      </button>
                    </div>

                    {licenseGranted && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <p className="text-xs text-emerald-400 font-medium mb-1">License 已授权</p>
                        <p className="text-[10px] text-white/40">
                          License ID: #{licenseId} | 有效期: 30 天 | 类型: {(userBalance / totalSupply) >= 0.5 ? 'Exclusive' : (userBalance / totalSupply) >= 0.2 ? 'Standard' : 'Basic'}
                        </p>
                        <p className="text-[10px] text-white/30 mt-2">
                          你现在可以下载该偶像的形象资源，用于 AI 短剧内容制作。制作收入请打入 Treasury 合约地址。
                        </p>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                        <p className="text-[10px] text-white/30">流程</p>
                        <p className="text-[10px] text-white/50 mt-1">申请 → 制作 → 上线 → 分润</p>
                      </div>
                      <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                        <p className="text-[10px] text-white/30">收入归属</p>
                        <p className="text-[10px] text-white/50 mt-1">流入 Treasury，全员分红</p>
                      </div>
                      <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                        <p className="text-[10px] text-white/30">失效条件</p>
                        <p className="text-[10px] text-white/50 mt-1">持仓低于门槛自动撤销</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Chart + Trade History */}
            <div className="lg:col-span-2 space-y-8">
              {/* K-Line Chart */}
              <ChartMinimal
                currentPrice={currentPrice}
                supply={totalSupply}
                holderCount={holderCount}
                marketCap={totalSupply * currentPrice}
              />

              {/* Trade History */}
              <div className="card">
                <h3 className="text-lg font-medium text-white mb-6">Trade History</h3>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-white/30">Loading trades from chain...</div>
                ) : tradeHistory.length === 0 ? (
                  <div className="text-center py-8 text-white/30">No trades yet</div>
                ) : (
                  <div className="space-y-2">
                    {tradeHistory.slice(0, 20).map((trade, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {trade.type.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm text-white/70">{trade.amount} tokens</p>
                            <p className="text-xs text-white/30 font-mono">
                              {trade.address.slice(0, 8)}...{trade.address.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-sm ${trade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.type === 'buy' ? '+' : '-'}{trade.cost.toFixed(4)} INJ
                          </p>
                          <a
                            href={`https://testnet.blockscout.injective.network/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-white/20 hover:text-white/40 flex items-center gap-1 justify-end"
                          >
                            Block #{trade.block} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Trade + AI Tweets */}
            <div className="space-y-8">
              {/* Trade Panel */}
              <TradeMinimal
                currentPrice={currentPrice}
                totalSupply={totalSupply}
                userBalance={userBalance}
                symbol={symbol}
                onTradeSuccess={handleTradeSuccess}
              />

              {/* AI Agent Tweets */}
              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">AI Agent Feed</h3>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                    Auto-generated
                  </span>
                </div>

                {tweets.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">
                    Agent will post after first trade events...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tweets.map((tweet, i) => (
                      <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white/60">V</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">Vivian</span>
                              <span className="text-xs text-white/20">@vivian_ai</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                tweet.type === 'trade' ? 'bg-emerald-500/10 text-emerald-400' :
                                tweet.type === 'analysis' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-orange-500/10 text-orange-400'
                              }`}>
                                {tweet.type}
                              </span>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">{tweet.text}</p>
                            <p className="text-xs text-white/20 mt-2">
                              {getTimeAgo(tweet.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-white/20 text-center">
                    Tweets auto-generated by AI agent based on on-chain trade events
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default IdolDetailPage
