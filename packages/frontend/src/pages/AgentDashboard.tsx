import { useState, useEffect, useRef } from 'react'
import { Brain, Zap, MessageSquare, TrendingUp, Activity, Clock, RefreshCw, Play, Square, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useAgentIdentity } from '../hooks/useAgentIdentity'
import { useIdolToken } from '../hooks/useIdolToken'
import { BondingCurve } from '../services/contract'

// Mood definitions
const MOOD_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  euphoric: { emoji: '🚀', color: 'text-yellow-400', label: 'Euphoric' },
  excited: { emoji: '📈', color: 'text-emerald-400', label: 'Excited' },
  neutral: { emoji: '🧠', color: 'text-white/60', label: 'Neutral' },
  cautious: { emoji: '🤔', color: 'text-orange-400', label: 'Cautious' },
  stressed: { emoji: '😰', color: 'text-rose-400', label: 'Stressed' },
  rebellious: { emoji: '🏴‍☠️', color: 'text-purple-400', label: 'Rebellious' },
  bored: { emoji: '😴', color: 'text-gray-400', label: 'Bored' },
}

interface AgentAction {
  id: number
  timestamp: number
  type: 'think' | 'tool_call' | 'result' | 'tweet' | 'mood_change'
  content: string
  metadata?: Record<string, unknown>
}

const AgentDashboard = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [currentMood, setCurrentMood] = useState('neutral')
  const [moodIntensity, setMoodIntensity] = useState(50)
  const [actions, setActions] = useState<AgentAction[]>([])
  const [cycleCount, setCycleCount] = useState(0)
  const [isThinking, setIsThinking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionIdRef = useRef(0)

  const agentIdentity = useAgentIdentity('0xD418D85734e92B521119AAb41e15134AC13bce9b')
  const { currentPrice, totalSupply, treasuryValue, holderCount } = useIdolToken()

  // Simulate agent cycle
  const runAgentCycle = async () => {
    setIsThinking(true)
    setCycleCount(prev => prev + 1)

    // Step 1: Think
    addAction('think', `🧠 Evaluating market conditions... (Mood: ${currentMood}, Intensity: ${moodIntensity}%)`)
    await delay(1500)

    // Step 2: Check price (tool call)
    addAction('tool_call', `🔧 check_price() → ${currentPrice.toFixed(6)} INJ | Supply: ${totalSupply} | Treasury: ${treasuryValue.toFixed(2)} INJ`)
    await delay(1000)

    // Step 3: AI decision
    const decision = simulateDecision()
    addAction('result', decision.message)
    await delay(1000)

    // Step 4: Maybe execute trade
    if (decision.shouldTrade) {
      addAction('tool_call', `🔧 open_trade({direction: "${decision.direction}", amount: "${decision.amount} INJ", leverage: "${decision.leverage}x"})`)
      await delay(1500)
      addAction('result', `✅ Trade executed: ${decision.direction} ${decision.amount} INJ @ ${decision.leverage}x`)

      // Mood change on trade
      const newMood = decision.direction === 'LONG' ? 'excited' : 'rebellious'
      setCurrentMood(newMood)
      setMoodIntensity(70)
      addAction('mood_change', `Mood shifted: ${currentMood} → ${newMood} (trade execution)`)
    }

    // Step 5: Generate tweet
    await delay(800)
    const tweet = generateTweet(decision)
    addAction('tweet', `🐦 "${tweet}"`)

    setIsThinking(false)
  }

  // Simulate AI decision based on current state
  function simulateDecision() {
    const volatility = Math.random()
    const moodFactor = currentMood === 'euphoric' || currentMood === 'rebellious' ? 0.7 : 0.3

    if (volatility > (1 - moodFactor) && treasuryValue > 0.5) {
      const direction = Math.random() > 0.4 ? 'LONG' : 'SHORT'
      const leverage = Math.min(5, Math.floor(Math.random() * 3) + 2)
      const sizePercent = Math.floor(Math.random() * 15) + 5
      const amount = (treasuryValue * sizePercent / 100).toFixed(4)
      return {
        shouldTrade: true,
        direction,
        leverage,
        amount,
        message: `📊 Decision: OPEN ${direction} — Confidence: ${Math.floor(60 + Math.random() * 30)}% | Reasoning: "${direction === 'LONG' ? 'Bullish momentum, bonding curve supply increasing' : 'Overextended, taking contrarian position'}"`,
      }
    }

    // Decide to wait
    const reasons = [
      'Market too flat, no clear signal. Patience is alpha.',
      'Confidence below threshold (55%). Waiting for better setup.',
      'Already exposed. Risk management says chill.',
      'Low volatility environment. Not worth the gas.',
    ]
    const reason = reasons[Math.floor(Math.random() * reasons.length)]

    // Maybe get bored
    if (cycleCount > 3 && currentMood === 'neutral') {
      setCurrentMood('bored')
      setMoodIntensity(60)
    }

    return {
      shouldTrade: false,
      direction: null,
      leverage: 0,
      amount: '0',
      message: `⏳ Decision: WAIT — "${reason}"`,
    }
  }

  // Generate contextual tweet
  function generateTweet(decision: { shouldTrade: boolean; direction: string | null; amount: string }) {
    const mood = MOOD_CONFIG[currentMood]
    if (decision.shouldTrade) {
      const templates = [
        `just went ${decision.direction} on INJ with ${decision.amount} from treasury. ${mood.emoji} let's see how this plays out`,
        `${decision.direction} ${decision.amount} INJ. confidence is high. ${mood.emoji} the curve doesn't lie.`,
        `executed a ${decision.direction} position. ${decision.amount} INJ on the line. manage risk, print alpha. ${mood.emoji}`,
      ]
      return templates[Math.floor(Math.random() * templates.length)]
    }
    const waitTemplates = [
      `checked the charts. nothing worth aping into rn. treasury at ${treasuryValue.toFixed(2)} INJ. ${mood.emoji} patience mode.`,
      `${totalSupply} tokens, ${holderCount} holders. small but mighty. ${mood.emoji} waiting for the right moment.`,
      `market giving nothing today. ${mood.emoji} sometimes the best trade is no trade.`,
    ]
    return waitTemplates[Math.floor(Math.random() * waitTemplates.length)]
  }

  function addAction(type: AgentAction['type'], content: string) {
    const action: AgentAction = {
      id: ++actionIdRef.current,
      timestamp: Date.now(),
      type,
      content,
    }
    setActions(prev => [action, ...prev].slice(0, 50)) // Keep last 50
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Auto-run loop
  const startAgent = () => {
    setIsRunning(true)
    addAction('think', '🎭 Agent started — entering autonomous loop')
    runAgentCycle()
    intervalRef.current = setInterval(runAgentCycle, 15000) // Every 15s
  }

  const stopAgent = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    addAction('think', '⏹️ Agent stopped')
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const moodConfig = MOOD_CONFIG[currentMood] || MOOD_CONFIG.neutral

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">AI Agent</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">Agent Dashboard</h1>
                <p className="text-lg text-white/40 mt-4">Watch Vivian think, decide, and act in real-time.</p>
              </div>
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <button
                    onClick={startAgent}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black font-medium rounded-lg hover:bg-emerald-400 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Agent
                  </button>
                ) : (
                  <button
                    onClick={stopAgent}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-black font-medium rounded-lg hover:bg-rose-400 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats + Mood row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* Mood */}
            <div className="card col-span-2 md:col-span-1">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Mood</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{moodConfig.emoji}</span>
                <div>
                  <p className={`font-medium ${moodConfig.color}`}>{moodConfig.label}</p>
                  <p className="text-xs text-white/30">{moodIntensity}% intensity</p>
                </div>
              </div>
            </div>
            {/* Status */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                <span className={`text-sm font-medium ${isRunning ? 'text-emerald-400' : 'text-white/40'}`}>
                  {isThinking ? 'Thinking...' : isRunning ? 'Active' : 'Stopped'}
                </span>
              </div>
            </div>
            {/* Cycles */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Cycles</p>
              <p className="text-xl font-mono text-white">{cycleCount}</p>
            </div>
            {/* Identity */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Identity</p>
              <p className="text-sm text-white/70">ERC-8004 #{agentIdentity.agentId}</p>
              <p className="text-xs text-white/30">{agentIdentity.capabilities.join(', ')}</p>
            </div>
            {/* Treasury */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Treasury</p>
              <p className="text-xl font-mono text-white">{treasuryValue.toFixed(2)}</p>
              <p className="text-xs text-white/30">INJ</p>
            </div>
          </div>

          {/* Main content: Action log + Side info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Action Log */}
            <div className="lg:col-span-2 card max-h-[600px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">Agent Thought Process</h3>
                  {isThinking && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                </div>
                <span className="text-xs text-white/20">{actions.length} events</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                {actions.length === 0 ? (
                  <div className="text-center py-16">
                    <Brain className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30">Click "Start Agent" to begin autonomous operation</p>
                    <p className="text-xs text-white/20 mt-2">Agent will check markets, make decisions, and generate content</p>
                  </div>
                ) : (
                  actions.map((action) => (
                    <div
                      key={action.id}
                      className={`p-3 rounded-lg border text-sm ${getActionStyle(action.type)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {getActionIcon(action.type)}
                          <p className="text-white/80 leading-relaxed break-words">{action.content}</p>
                        </div>
                        <span className="text-[10px] text-white/20 shrink-0 font-mono">
                          {formatTime(action.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-6">
              {/* Mood History */}
              <div className="card">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-white/30" />
                  Mood System
                </h3>
                <div className="space-y-3">
                  {Object.entries(MOOD_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{config.emoji}</span>
                        <span className={`text-xs ${key === currentMood ? config.color + ' font-medium' : 'text-white/30'}`}>
                          {config.label}
                        </span>
                      </div>
                      {key === currentMood && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${key === 'stressed' ? 'bg-rose-400' : key === 'euphoric' ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                              style={{ width: `${moodIntensity}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-white/30">{moodIntensity}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/15 mt-4">
                  Mood affects: trading aggression, position size, tweet tone
                </p>
              </div>

              {/* Tools Available */}
              <div className="card">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white/30" />
                  Available Tools
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'check_price', desc: 'Read token price & supply' },
                    { name: 'check_balance', desc: 'Query wallet & treasury' },
                    { name: 'open_trade', desc: 'Execute leveraged position' },
                    { name: 'generate_tweet', desc: 'Create content' },
                    { name: 'wait', desc: 'Skip this cycle' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-mono text-white/50">{tool.name}</span>
                      <span className="text-[10px] text-white/20">{tool.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="card border-blue-500/10">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  How It Works
                </h3>
                <ol className="space-y-2 text-xs text-white/40 list-decimal list-inside">
                  <li>Agent reads market data from chain</li>
                  <li>DeepSeek AI evaluates with function_call</li>
                  <li>Mood system adjusts risk appetite</li>
                  <li>Tool executed (trade / wait / tweet)</li>
                  <li>Results update mood → next cycle</li>
                </ol>
                <p className="text-[10px] text-white/20 mt-3">
                  In production: runs `npx tsx src/index.ts loop` with real DeepSeek API
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Helper functions
function getActionStyle(type: AgentAction['type']): string {
  switch (type) {
    case 'think': return 'bg-blue-500/5 border-blue-500/10'
    case 'tool_call': return 'bg-purple-500/5 border-purple-500/10'
    case 'result': return 'bg-emerald-500/5 border-emerald-500/10'
    case 'tweet': return 'bg-sky-500/5 border-sky-500/10'
    case 'mood_change': return 'bg-orange-500/5 border-orange-500/10'
    default: return 'bg-white/[0.02] border-white/5'
  }
}

function getActionIcon(type: AgentAction['type']) {
  const cls = "w-4 h-4 shrink-0 mt-0.5"
  switch (type) {
    case 'think': return <Brain className={`${cls} text-blue-400`} />
    case 'tool_call': return <Zap className={`${cls} text-purple-400`} />
    case 'result': return <TrendingUp className={`${cls} text-emerald-400`} />
    case 'tweet': return <MessageSquare className={`${cls} text-sky-400`} />
    case 'mood_change': return <Activity className={`${cls} text-orange-400`} />
    default: return <Clock className={`${cls} text-white/30`} />
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default AgentDashboard
