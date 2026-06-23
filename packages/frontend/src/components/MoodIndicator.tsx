import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap, Coffee, Moon } from 'lucide-react'

interface Mood {
  emoji: string
  label: string
  color: string
  icon: React.ReactNode
  description: string
}

const moods: Record<string, Mood> = {
  bullish: {
    emoji: '🚀',
    label: 'Bullish',
    color: 'var(--success)',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Feeling confident about the market',
  },
  bearish: {
    emoji: '📉',
    label: 'Bearish',
    color: 'var(--error)',
    icon: <TrendingDown className="w-4 h-4" />,
    description: 'Cautious about market conditions',
  },
  analyzing: {
    emoji: '🧐',
    label: 'Analyzing',
    color: 'var(--primary-400)',
    icon: <Activity className="w-4 h-4" />,
    description: 'Scanning for opportunities',
  },
  excited: {
    emoji: '⚡',
    label: 'Excited',
    color: 'var(--warning)',
    icon: <Zap className="w-4 h-4" />,
    description: 'High energy trading mode',
  },
  chill: {
    emoji: '☕',
    label: 'Chill',
    color: 'var(--text-muted)',
    icon: <Coffee className="w-4 h-4" />,
    description: 'Waiting for the right moment',
  },
  resting: {
    emoji: '🌙',
    label: 'Resting',
    color: 'var(--primary-300)',
    icon: <Moon className="w-4 h-4" />,
    description: 'Recharging for next session',
  },
}

interface MoodIndicatorProps {
  currentMood?: keyof typeof moods
  onMoodChange?: (mood: keyof typeof moods) => void
}

const MoodIndicator = ({ currentMood = 'analyzing', onMoodChange }: MoodIndicatorProps) => {
  const [mood, setMood] = useState<keyof typeof moods>(currentMood)
  const [isHovered, setIsHovered] = useState(false)
  const [pulseCount, setPulseCount] = useState(0)

  useEffect(() => {
    // Auto-change mood based on market conditions (simulated)
    const interval = setInterval(() => {
      const moodKeys = Object.keys(moods) as (keyof typeof moods)[]
      const randomMood = moodKeys[Math.floor(Math.random() * moodKeys.length)]
      setMood(randomMood)
      setPulseCount(prev => prev + 1)
      onMoodChange?.(randomMood)
    }, 15000) // Change every 15 seconds

    return () => clearInterval(interval)
  }, [onMoodChange])

  const currentMoodData = moods[mood]

  return (
    <div
      className="relative inline-flex items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mood Badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer"
        style={{
          backgroundColor: `${currentMoodData.color}15`,
          borderColor: `${currentMoodData.color}30`,
          boxShadow: isHovered ? `0 0 20px ${currentMoodData.color}20` : 'none',
        }}
      >
        <span className="text-lg animate-bounce" key={pulseCount}>
          {currentMoodData.emoji}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: currentMoodData.color }}
        >
          {currentMoodData.label}
        </span>
        <span style={{ color: currentMoodData.color }}>
          {currentMoodData.icon}
        </span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 animate-fade-in">
          <div className="card p-3 text-center">
            <p className="text-sm font-medium text-[var(--text-default)]">
              {currentMoodData.description}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              AI sentiment indicator
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 rotate-45 bg-[var(--bg-card)] border-r border-b border-[var(--border-subtle)]" />
          </div>
        </div>
      )}

      {/* Animated ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-30"
        style={{ backgroundColor: currentMoodData.color }}
      />
    </div>
  )
}

export default MoodIndicator
