import { useState, useEffect, useRef } from 'react'
import { ArrowUpRight, ArrowDownRight, User, Clock } from 'lucide-react'

interface Activity {
  id: string
  type: 'buy' | 'sell' | 'trade' | 'tweet' | 'holder'
  user: string
  amount?: string
  token?: string
  message?: string
  timestamp: Date
}

const generateMockActivity = (): Activity => {
  const types: Activity['type'][] = ['buy', 'sell', 'trade', 'tweet', 'holder']
  const type = types[Math.floor(Math.random() * types.length)]
  const users = ['0x7a3f...8d2e', '0x9b1c...4f5a', '0x2e8d...1a9b', '0x5f4a...3c7e', '0x1b9c...6d2f']
  const tokens = ['VIVIAN', 'NEON', 'CIPHER', 'NOVA']
  
  const base: Activity = {
    id: Math.random().toString(36).substring(7),
    type,
    user: users[Math.floor(Math.random() * users.length)],
    timestamp: new Date(),
  }

  switch (type) {
    case 'buy':
      return { ...base, amount: (Math.random() * 10).toFixed(2), token: tokens[Math.floor(Math.random() * tokens.length)] }
    case 'sell':
      return { ...base, amount: (Math.random() * 5).toFixed(2), token: tokens[Math.floor(Math.random() * tokens.length)] }
    case 'trade':
      return { ...base, message: `Opened ${Math.random() > 0.5 ? 'LONG' : 'SHORT'} position` }
    case 'tweet':
      return { ...base, message: 'Posted new market analysis' }
    case 'holder':
      return { ...base, message: 'Became a new holder' }
    default:
      return base
  }
}

const activityConfig = {
  buy: { color: 'var(--success)', icon: <ArrowUpRight className="w-3 h-3" />, label: 'bought' },
  sell: { color: 'var(--error)', icon: <ArrowDownRight className="w-3 h-3" />, label: 'sold' },
  trade: { color: 'var(--primary-400)', icon: <Clock className="w-3 h-3" />, label: 'traded' },
  tweet: { color: 'var(--warning)', icon: <Clock className="w-3 h-3" />, label: 'tweeted' },
  holder: { color: 'var(--primary-300)', icon: <User className="w-3 h-3" />, label: 'joined' },
}

const LiveActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial activities
    setActivities(Array.from({ length: 5 }, generateMockActivity))

    const interval = setInterval(() => {
      if (!isPaused) {
        const newActivity = generateMockActivity()
        setActivities(prev => [newActivity, ...prev].slice(0, 10))
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isPaused])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div
      ref={containerRef}
      className="card overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <h3 className="text-lg font-semibold text-[var(--text-default)]">Live Activity</h3>
        </div>
        <span className="text-xs text-[var(--text-faint)]">
          {isPaused ? 'Paused' : 'Real-time'}
        </span>
      </div>

      <div className="space-y-2 relative">
        {activities.map((activity, index) => {
          const config = activityConfig[activity.type]
          const isNew = index === 0

          return (
            <div
              key={activity.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                isNew ? 'animate-slide-in bg-[var(--surface-hover)]' : ''
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-[var(--text-faint)] text-xs">
                    {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                  </span>
                  <span className="text-[var(--text-muted)]">{config.label}</span>
                  {activity.amount && (
                    <span className="font-semibold" style={{ color: config.color }}>
                      {activity.amount} INJ
                    </span>
                  )}
                  {activity.token && (
                    <span className="text-[var(--primary-400)] font-medium">
                      ${activity.token}
                    </span>
                  )}
                </div>
                {activity.message && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {activity.message}
                  </p>
                )}
              </div>

              <span className="text-xs text-[var(--text-faint)] whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </span>
            </div>
          )
        })}

        {/* Glow effect at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-card)] to-transparent pointer-events-none" />
      </div>
    </div>
  )
}

export default LiveActivityFeed
