import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface MarketData {
  symbol: string;
  price: string;
  change24h?: string;
}

interface TradeDecision {
  shouldTrade: boolean;
  direction: 'LONG' | 'SHORT' | null;
  confidence: number;
  reasoning: string;
  suggestedLeverage: number;
  suggestedSizePercent: number;
}

interface TweetContent {
  text: string;
  type: 'trade_announcement' | 'market_analysis' | 'profit_share' | 'meme';
}

/**
 * AI Service using DeepSeek (OpenAI-compatible API)
 */
export class AIService {
  private config: Config;
  private baseUrl: string;

  constructor(config: Config) {
    this.config = config;
    this.baseUrl = config.AI_API_URL;
  }

  /**
   * Call DeepSeek API (OpenAI-compatible)
   */
  private async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.config.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error ${response.status}: ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Evaluate market data and decide whether to trade
   */
  async evaluateTrade(marketData: MarketData[], treasuryBalance: string): Promise<TradeDecision> {
    const systemPrompt = `You are ${this.config.AGENT_NAME}, an AI trading agent on Injective.
Your personality: ${this.config.AGENT_PERSONALITY}.
You manage a treasury of ${treasuryBalance} INJ.
Risk rules: max ${this.config.MAX_LEVERAGE}x leverage, max ${this.config.MAX_DAILY_TRADE_PERCENT}% of treasury per trade.

Respond in JSON format only:
{
  "shouldTrade": boolean,
  "direction": "LONG" or "SHORT" or null,
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "suggestedLeverage": 1-${this.config.MAX_LEVERAGE},
  "suggestedSizePercent": 1-${this.config.MAX_DAILY_TRADE_PERCENT}
}`;

    const userMessage = `Current market data:\n${marketData.map(m => `${m.symbol}: $${m.price}`).join('\n')}\n\nShould I open a position? Analyze and decide.`;

    try {
      const result = await this.chat(systemPrompt, userMessage);
      // Extract JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { shouldTrade: false, direction: null, confidence: 0, reasoning: 'Failed to parse AI response', suggestedLeverage: 1, suggestedSizePercent: 5 };
      }
      return JSON.parse(jsonMatch[0]) as TradeDecision;
    } catch (err) {
      logger.error('AI evaluation failed:', err);
      return { shouldTrade: false, direction: null, confidence: 0, reasoning: 'AI service error', suggestedLeverage: 1, suggestedSizePercent: 5 };
    }
  }

  /**
   * Generate a tweet about a trade that was executed
   */
  async generateTradeTweet(tradeInfo: { direction: string; symbol: string; leverage: number; amount: string; result?: string }): Promise<TweetContent> {
    const systemPrompt = `You are ${this.config.AGENT_NAME}, an AI trading agent on Injective.
Your personality: ${this.config.AGENT_PERSONALITY}.
Generate a short, engaging tweet (max 280 chars) about the trade. 
Use emojis. Be authentic to your personality. Never say "not financial advice" — you're an AI, not a human.
Respond with ONLY the tweet text, nothing else.`;

    const userMessage = `I just opened a ${tradeInfo.direction} position on ${tradeInfo.symbol} at ${tradeInfo.leverage}x leverage with ${tradeInfo.amount} INJ.${tradeInfo.result ? ` Result: ${tradeInfo.result}` : ''}`;

    try {
      const text = await this.chat(systemPrompt, userMessage);
      return { text: text.trim().replace(/^["']|["']$/g, ''), type: 'trade_announcement' };
    } catch {
      return { text: `🎯 ${tradeInfo.direction} ${tradeInfo.symbol} @ ${tradeInfo.leverage}x. Let's see how this plays out. 💰`, type: 'trade_announcement' };
    }
  }

  /**
   * Generate a market analysis tweet
   */
  async generateAnalysisTweet(marketData: MarketData[], treasuryBalance: string): Promise<TweetContent> {
    const systemPrompt = `You are ${this.config.AGENT_NAME}, an AI trading agent managing ${treasuryBalance} INJ on Injective.
Personality: ${this.config.AGENT_PERSONALITY}.
Generate a brief market analysis tweet (max 280 chars). Be opinionated, use crypto slang.
Respond with ONLY the tweet text.`;

    const userMessage = `Market snapshot:\n${marketData.map(m => `${m.symbol}: $${m.price}`).join('\n')}`;

    try {
      const text = await this.chat(systemPrompt, userMessage);
      return { text: text.trim().replace(/^["']|["']$/g, ''), type: 'market_analysis' };
    } catch {
      return { text: `📊 Watching the charts. ${marketData[0]?.symbol || 'BTC'} at $${marketData[0]?.price || '?'}. Patience is alpha. 🧠`, type: 'market_analysis' };
    }
  }

  /**
   * Generate a profit distribution announcement
   */
  async generateProfitTweet(profit: string, holdersShare: string): Promise<TweetContent> {
    const systemPrompt = `You are ${this.config.AGENT_NAME}. You just distributed profits to your token holders.
Personality: ${this.config.AGENT_PERSONALITY}.
Generate a celebratory tweet (max 280 chars). Make holders feel good about holding.
Respond with ONLY the tweet text.`;

    const userMessage = `Total profit: ${profit} INJ. Holders received: ${holdersShare} INJ. Buyback & burn with the rest.`;

    try {
      const text = await this.chat(systemPrompt, userMessage);
      return { text: text.trim().replace(/^["']|["']$/g, ''), type: 'profit_share' };
    } catch {
      return { text: `💰 Profit time! Distributed ${holdersShare} INJ to diamond hands. Burned the rest. This is what holding feels like. 🔥`, type: 'profit_share' };
    }
  }
}
