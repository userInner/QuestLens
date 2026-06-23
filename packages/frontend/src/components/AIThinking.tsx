import { useState, useEffect } from 'react'
import { Brain, Sparkles, Zap, Target, TrendingUp, MessageSquare } from 'lucide-react'

interface Thought {
  icon: React.ReactNode
  text: string
  type: 'analysis' | 'action' | 'social' | 'strategy'
}

const thoughts: Thought[] = [
  { icon: <Brain className="w-4 h-4" />, text: 'Analyzing market patterns...', type: 'analysis' },
  { icon: <TrendingUp className="w-4 h-4" />, text: 'Funding rates look bullish', type: 'analysis' },
  { icon: <Target className="w-4 h-4" />, text: 'Scanning for alpha opportunities...', type: 'strategy' },
  { icon: <Zap className="w-4 h-4" />, text: 'Executing optimal trade strategy', type: 'action' },
  { icon: <MessageSquare className="w-4 h-4" />, text: 'Generating community update...', type: 'social' },
  { icon: <Sparkles className="w-4 h-4" />, text: 'Learning from market data', type: 'analysis' },
]

const typeColors = {
  analysis: 'var(--primary-400)',
  action: 'var(--success)',
  social: 'var(--warning)',
  strategy: 'var(--primary-300)',
}

const AIThinking = () => {
  const [currentThought, setCurrentThought] = useState(0)
  const [isThinking, setIsThinking] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsThinking(true)
      setProgress(0)
      
      // Simulate thinking progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 10
        })
      }, 100)

      // Change thought after "thinking"
      setTimeout(() => {
        setCurrentThought(prev => (prev + 1) % thoughts.length)
        setIsThinking(false)
        setTimeout(() => setIsThinking(true), 100)
      }, 1500)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const thought = thoughts[currentThought]
  const color = typeColors[thought.type]

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
          style={{ backgroundColor: `${color}20` }}
        >
          <Brain className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <h4 className="font-semibold text-[var(--text-default)] text-sm">AI Neural Network</h4>
          <p className="text-xs text-[var(--text-faint)]">Real-time processing</p>
        </div>
        <div className="ml-auto flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ 
                backgroundColor: color,
                animationDelay: `${i * 200}ms`
              }}
            />
          ))}
        </div>
      </div>

      {/* Current Thought */}
      <div 
        className="p-3 rounded-lg transition-all duration-300"
        style={{ backgroundColor: `${color}10` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color }}>{thought.icon}</span>
          <span 
            className="text-sm font-medium transition-all duration-300"
            style={{ color }}
          >
            {thought.text}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-1 bg-[var(--surface-hover)] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-100"
            style={{ 
              width: `${progress}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      {/* Activity Dots */}
      <div className="mt-3 flex justify-between">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: color,
                opacity: thought.type === type ? 1 : 0.3
              }}
            />
            <span className="text-[10px] text-[var(--text-faint)] uppercase">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AIThinking
