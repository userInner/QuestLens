import { useState, useEffect, useRef } from 'react'
import { Brain, Zap, MessageSquare, TrendingUp, Activity, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useAgentIdentity } from '../hooks/useAgentIdentity'
import { useIdolToken } from '../hooks/useIdolToken'
import { useT } from '../i18n'

interface AgentLogEntry {
  id: number
  timestamp: number
  type: 'think' | 'tool_call' | 'result' | 'tweet' | 'mood_change' | 'identity'
  content: string
  mood?: string
  moodIntensity?: number
}

const AgentDashboard = () => {
  const [actions, setActions] = useState<AgentLogEntry[]>([])
  const [currentMood, setCurrentMood] = useState('neutral')
  const [moodIntensity, setMoodIntensity] = useState(50)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const t = useT()

  // Mood definitions
  const MOOD_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
    euphoric: { emoji: '🚀', color: 'text-yellow-400', label: t('agent.mood.euphoric') },
    excited: { emoji: '📈', color: 'text-emerald-400', label: t('agent.mood.excited') },
    neutral: { emoji: '🧠', color: 'text-white/60', label: t('agent.mood.neutral') },
    cautious: { emoji: '🤔', color: 'text-orange-400', label: t('agent.mood.cautious') },
    stressed: { emoji: '😰', color: 'text-rose-400', label: t('agent.mood.stressed') },
    rebellious: { emoji: '🏴‍☠️', color: 'text-purple-400', label: t('agent.mood.rebellious') },
    bored: { emoji: '😴', color: 'text-gray-400', label: t('agent.mood.bored') },
  }

  const agentIdentity = useAgentIdentity('0xD418D85734e92B521119AAb41e15134AC13bce9b')
  const { currentPrice, totalSupply, treasuryValue, holderCount } = useIdolToken()

  // Poll the agent log file written by the backend agent process
  const fetchLog = async () => {
    try {
      const res = await fetch('/agent-log.json?t=' + Date.now())
      if (!res.ok) return
      const entries: AgentLogEntry[] = await res.json()

      if (entries.length > 0) {
        setActions(entries)
        const latest = entries[0]
        if (latest.mood) setCurrentMood(latest.mood)
        if (latest.moodIntensity) setMoodIntensity(latest.moodIntensity)
        setLastUpdate(latest.timestamp)

        // Check if agent is "live" (last entry within 60s)
        setIsLive(Date.now() - latest.timestamp < 60000)
      }
    } catch {
      // Log file doesn't exist yet — agent hasn't run
    }
  }

  // Start polling on mount
  useEffect(() => {
    fetchLog()
    intervalRef.current = setInterval(fetchLog, 3000) // Poll every 3s
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
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">{t('agent.label')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">{t('agent.title')}</h1>
                <p className="text-lg text-white/40 mt-4">{t('agent.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isLive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                  <span className={`text-sm font-medium ${isLive ? 'text-emerald-400' : 'text-white/40'}`}>
                    {isLive ? t('agent.running') : t('agent.offline')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info banner if agent not running */}
          {!isLive && actions.length === 0 && (
            <div className="mb-8 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-white/70 font-medium mb-1">{t('agent.info.title')}</p>
                  <p className="text-xs text-white/40">{t('agent.info.desc')}</p>
                  <code className="block mt-2 text-xs text-emerald-400 bg-black/30 px-3 py-2 rounded font-mono">
                    cd packages/agent && npx tsx src/index.ts loop
                  </code>
                  <p className="text-xs text-white/30 mt-2">{t('agent.info.note')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats + Mood row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* Mood */}
            <div className="card col-span-2 md:col-span-1">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('agent.mood')}</p>
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
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('agent.status')}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                <span className={`text-sm font-medium ${isLive ? 'text-emerald-400' : 'text-white/40'}`}>
                  {isLive ? t('agent.status.active') : t('agent.status.offline')}
                </span>
              </div>
            </div>
            {/* Actions */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('agent.actions')}</p>
              <p className="text-xl font-mono text-white">{actions.length}</p>
            </div>
            {/* Identity */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('agent.identity')}</p>
              <p className="text-sm text-white/70">ERC-8004 #{agentIdentity.agentId}</p>
              <p className="text-xs text-white/30">{agentIdentity.capabilities.join(', ')}</p>
            </div>
            {/* Treasury */}
            <div className="card">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('agent.treasury')}</p>
              <p className="text-xl font-mono text-white">{treasuryValue.toFixed(2)}</p>
              <p className="text-xs text-white/30">INJ</p>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Action Log */}
            <div className="lg:col-span-2 card max-h-[600px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">{t('agent.log.title')}</h3>
                  {isLive && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                </div>
                <span className="text-xs text-white/20">
                  {lastUpdate ? `Updated ${Math.floor((Date.now() - lastUpdate) / 1000)}s ago` : 'No data'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {actions.length === 0 ? (
                  <div className="text-center py-16">
                    <Brain className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30">{t('agent.log.empty')}</p>
                    <p className="text-xs text-white/20 mt-2">{t('agent.log.empty.hint')}</p>
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
              {/* Mood System */}
              <div className="card">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-white/30" />
                  {t('agent.mood.system')}
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
                  {t('agent.mood.affects')}
                </p>
              </div>

              {/* Tools */}
              <div className="card">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-white/30" />
                  {t('agent.tools')}
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'check_price', desc: t('agent.tool.check_price') },
                    { name: 'check_balance', desc: t('agent.tool.check_balance') },
                    { name: 'open_trade', desc: t('agent.tool.open_trade') },
                    { name: 'generate_tweet', desc: t('agent.tool.generate_tweet') },
                    { name: 'wait', desc: t('agent.tool.wait') },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-mono text-white/50">{tool.name}</span>
                      <span className="text-[10px] text-white/20">{tool.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture */}
              <div className="card border-blue-500/10">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  {t('agent.architecture')}
                </h3>
                <ol className="space-y-2 text-xs text-white/40 list-decimal list-inside">
                  <li>Backend agent runs continuously (Node.js)</li>
                  <li>DeepSeek AI decides next action (function_call)</li>
                  <li>Tool executed on-chain via ethers.js</li>
                  <li>Results written to log file</li>
                  <li>This dashboard polls log every 3s</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-white/20">
                    Backend: <code className="text-emerald-400/60">packages/agent/src/index.ts</code>
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

// Helper functions
function getActionStyle(type: AgentLogEntry['type']): string {
  switch (type) {
    case 'think': return 'bg-blue-500/5 border-blue-500/10'
    case 'tool_call': return 'bg-purple-500/5 border-purple-500/10'
    case 'result': return 'bg-emerald-500/5 border-emerald-500/10'
    case 'tweet': return 'bg-sky-500/5 border-sky-500/10'
    case 'mood_change': return 'bg-orange-500/5 border-orange-500/10'
    case 'identity': return 'bg-indigo-500/5 border-indigo-500/10'
    default: return 'bg-white/[0.02] border-white/5'
  }
}

function getActionIcon(type: AgentLogEntry['type']) {
  const cls = "w-4 h-4 shrink-0 mt-0.5"
  switch (type) {
    case 'think': return <Brain className={`${cls} text-blue-400`} />
    case 'tool_call': return <Zap className={`${cls} text-purple-400`} />
    case 'result': return <TrendingUp className={`${cls} text-emerald-400`} />
    case 'tweet': return <MessageSquare className={`${cls} text-sky-400`} />
    case 'mood_change': return <Activity className={`${cls} text-orange-400`} />
    case 'identity': return <Brain className={`${cls} text-indigo-400`} />
    default: return <Clock className={`${cls} text-white/30`} />
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default AgentDashboard
