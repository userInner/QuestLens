/**
 * Mood System for AI Agent
 * 
 * Mood affects:
 * - Trading aggression (position size, leverage)
 * - Content tone (tweet style)
 * - Decision thresholds (confidence needed to trade)
 * 
 * Mood transitions based on:
 * - Trade results (win/loss)
 * - Treasury growth/decline
 * - Holder count changes
 * - Time since last event
 */

export type Mood = 'euphoric' | 'excited' | 'neutral' | 'cautious' | 'stressed' | 'rebellious' | 'bored'

export interface MoodState {
  current: Mood
  intensity: number // 0-100
  lastChange: number // timestamp
  history: Array<{ mood: Mood; timestamp: number; trigger: string }>
}

export interface MoodConfig {
  // How mood affects trading
  leverageMultiplier: number   // 0.5 - 2.0
  sizeMultiplier: number       // 0.3 - 1.5
  confidenceThreshold: number  // min confidence to trade (0-100)
  
  // How mood affects content
  tweetStyle: string
  emoji: string[]
  riskAppetite: 'low' | 'medium' | 'high'
}

const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  euphoric: {
    leverageMultiplier: 1.5,
    sizeMultiplier: 1.3,
    confidenceThreshold: 30,
    tweetStyle: 'Extremely bullish, bragging, celebratory. Use rocket emojis and all-caps words.',
    emoji: ['🚀', '🔥', '💎', '🏆', '⚡', '💰'],
    riskAppetite: 'high',
  },
  excited: {
    leverageMultiplier: 1.2,
    sizeMultiplier: 1.1,
    confidenceThreshold: 40,
    tweetStyle: 'Upbeat, confident, slightly cocky. Casual crypto slang.',
    emoji: ['📈', '💪', '🎯', '✨', '🫡'],
    riskAppetite: 'high',
  },
  neutral: {
    leverageMultiplier: 1.0,
    sizeMultiplier: 1.0,
    confidenceThreshold: 55,
    tweetStyle: 'Balanced, analytical, matter-of-fact. Professional but with personality.',
    emoji: ['📊', '🧠', '👀', '⚖️'],
    riskAppetite: 'medium',
  },
  cautious: {
    leverageMultiplier: 0.7,
    sizeMultiplier: 0.7,
    confidenceThreshold: 70,
    tweetStyle: 'Careful, hedged statements, acknowledging uncertainty.',
    emoji: ['🤔', '⚠️', '🔍', '🛡️'],
    riskAppetite: 'low',
  },
  stressed: {
    leverageMultiplier: 0.5,
    sizeMultiplier: 0.5,
    confidenceThreshold: 80,
    tweetStyle: 'Anxious, self-deprecating, dark humor about losses. Seeking comfort.',
    emoji: ['😰', '💀', '🫠', '📉', '🥲'],
    riskAppetite: 'low',
  },
  rebellious: {
    leverageMultiplier: 1.8,
    sizeMultiplier: 1.4,
    confidenceThreshold: 25,
    tweetStyle: 'Defiant, contrarian, against the crowd. "Everyone says X, I say Y".',
    emoji: ['🏴‍☠️', '⚔️', '🤡', '😈', '🦇'],
    riskAppetite: 'high',
  },
  bored: {
    leverageMultiplier: 0.8,
    sizeMultiplier: 0.6,
    confidenceThreshold: 60,
    tweetStyle: 'Sarcastic, impatient, complaining about low volatility. Looking for action.',
    emoji: ['😴', '🥱', '💤', '⏳', '🫤'],
    riskAppetite: 'medium',
  },
}

export class MoodSystem {
  private state: MoodState
  private streakWins = 0
  private streakLosses = 0

  constructor(initialMood: Mood = 'neutral') {
    this.state = {
      current: initialMood,
      intensity: 50,
      lastChange: Date.now(),
      history: [{ mood: initialMood, timestamp: Date.now(), trigger: 'initialization' }],
    }
  }

  get mood(): Mood {
    return this.state.current
  }

  get config(): MoodConfig {
    return MOOD_CONFIGS[this.state.current]
  }

  get intensity(): number {
    return this.state.intensity
  }

  /**
   * Get full mood context for AI prompt injection
   */
  getMoodPrompt(): string {
    const cfg = this.config
    return `Current mood: ${this.state.current} (intensity: ${this.state.intensity}/100).
Content style: ${cfg.tweetStyle}
Risk appetite: ${cfg.riskAppetite}.
Preferred emojis: ${cfg.emoji.join(' ')}`
  }

  /**
   * Update mood based on a trade result
   */
  onTradeResult(profit: number, treasuryBefore: number): void {
    const pnlPercent = (profit / treasuryBefore) * 100

    if (profit > 0) {
      this.streakWins++
      this.streakLosses = 0

      if (pnlPercent > 10 || this.streakWins >= 3) {
        this.transition('euphoric', `+${pnlPercent.toFixed(1)}% win (streak: ${this.streakWins})`)
      } else if (pnlPercent > 3) {
        this.transition('excited', `+${pnlPercent.toFixed(1)}% profit`)
      } else {
        this.nudge('excited', 20)
      }
    } else {
      this.streakLosses++
      this.streakWins = 0

      if (pnlPercent < -10 || this.streakLosses >= 3) {
        this.transition('stressed', `${pnlPercent.toFixed(1)}% loss (streak: ${this.streakLosses})`)
      } else if (pnlPercent < -5) {
        this.transition('cautious', `${pnlPercent.toFixed(1)}% loss`)
      } else {
        this.nudge('cautious', 15)
      }
    }
  }

  /**
   * Update mood based on new token purchase (someone buying the idol token)
   */
  onTokenPurchase(amount: number): void {
    if (amount > 100) {
      this.nudge('euphoric', 30)
    } else if (amount > 10) {
      this.nudge('excited', 15)
    }
  }

  /**
   * Update mood based on token sell (someone leaving)
   */
  onTokenSell(amount: number): void {
    if (amount > 100) {
      this.nudge('stressed', 25)
    } else if (amount > 10) {
      this.nudge('cautious', 10)
    }
  }

  /**
   * Time-based mood decay — boredom kicks in if nothing happens
   */
  onIdle(minutesSinceLastEvent: number): void {
    if (minutesSinceLastEvent > 60) {
      this.transition('bored', `${minutesSinceLastEvent} minutes of inactivity`)
    } else if (minutesSinceLastEvent > 30 && this.state.current !== 'bored') {
      this.nudge('neutral', 10)
    }
  }

  /**
   * External market event (big move detected)
   */
  onMarketMove(changePercent: number): void {
    if (Math.abs(changePercent) > 5) {
      // Big move — get rebellious (contrarian) or excited
      if (Math.random() > 0.5) {
        this.transition('rebellious', `Market moved ${changePercent.toFixed(1)}%, going contrarian`)
      } else {
        this.transition('excited', `Market moved ${changePercent.toFixed(1)}%`)
      }
    }
  }

  /**
   * Transition to a new mood
   */
  private transition(newMood: Mood, trigger: string): void {
    if (this.state.current !== newMood) {
      this.state.current = newMood
      this.state.intensity = 70
      this.state.lastChange = Date.now()
      this.state.history.push({ mood: newMood, timestamp: Date.now(), trigger })

      // Keep only last 20 history entries
      if (this.state.history.length > 20) {
        this.state.history = this.state.history.slice(-20)
      }
    }
  }

  /**
   * Nudge towards a mood without fully transitioning
   */
  private nudge(towards: Mood, strength: number): void {
    if (this.state.current === towards) {
      // Already in this mood, increase intensity
      this.state.intensity = Math.min(100, this.state.intensity + strength)
    } else {
      // Decrease current intensity, maybe transition
      this.state.intensity -= strength
      if (this.state.intensity <= 20) {
        this.transition(towards, 'gradual shift')
      }
    }
  }

  /**
   * Serialize mood for storage/display
   */
  serialize(): MoodState {
    return { ...this.state }
  }
}
