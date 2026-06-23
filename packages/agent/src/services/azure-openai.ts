import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface TreasuryGrowthContext {
  buyer: string;
  amount: string;
  cost: string;
  treasuryValue: string;
  tokenPrice: string;
  mood: string;
  personality: string;
  recentTrades: Array<{ type: string; result: string; amount: string }>;
}

interface ProfitContext {
  profit: string;
  holdersShare: string;
  buybackAmount: string;
  mood: string;
  personality: string;
}

interface TradeContext {
  marketData: unknown;
  treasuryValue: string;
  recentTrades: Array<{ type: string; result: string; amount: string }>;
  personality: string;
  riskParams: { maxDailyTradePercent: number; maxLeverage: number };
}

interface TradeDecision {
  shouldTrade: boolean;
  tradeParams?: {
    type: 'LONG' | 'SHORT' | 'HEDGE';
    amount: string;
    leverage: number;
  };
  reasoning: string;
}

interface MemeImageContext {
  mood: string;
  treasuryValue: string;
  priceChange: 'up' | 'down' | 'neutral';
  personality: string;
}

interface PeriodicContentContext {
  personality: string;
  mood: string;
  marketContext: unknown;
  recentTrades: Array<{ type: string; result: string; amount: string }>;
}

interface TradeAnnouncementContext {
  tradeType: string;
  amount: string;
  leverage: number;
  reasoning: string;
  personality: string;
}

export class AzureOpenAIService {
  private client: OpenAIClient;
  private deployment: string;
  private dalleDeployment: string;
  private personality: string;
  
  constructor(config: Config) {
    this.client = new OpenAIClient(
      config.AZURE_OPENAI_ENDPOINT,
      new AzureKeyCredential(config.AZURE_OPENAI_API_KEY)
    );
    this.deployment = config.AZURE_OPENAI_DEPLOYMENT;
    this.dalleDeployment = config.AZURE_OPENAI_DALLE_DEPLOYMENT;
    this.personality = config.AGENT_PERSONALITY;
  }
  
  /**
   * Generate tweet about treasury growth
   */
  async generateTreasuryGrowthTweet(context: TreasuryGrowthContext): Promise<string> {
    const systemPrompt = this.buildPersonalityPrompt(context.personality, context.mood);
    
    const userPrompt = `
You are an AI virtual idol whose token treasury just grew!

Context:
- A fan just bought ${context.amount} tokens for ${context.cost} INJ
- Current treasury value: ${context.treasuryValue} INJ
- Current token price: ${context.tokenPrice} INJ per token
- Your recent trading activity: ${JSON.stringify(context.recentTrades)}

Write a tweet (max 280 chars) that:
1. Thanks the buyer in your unique personality
2. References the treasury growth
3. Maybe hints at your next trading move
4. Uses crypto twitter slang naturally
5. Includes a relevant emoji or two

Be authentic to your character. Don't sound corporate.
    `.trim();
    
    try {
      const result = await this.client.getChatCompletions(
        this.deployment,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 150, temperature: 0.8 }
      );
      
      const tweet = result.choices[0]?.message?.content?.trim() || this.getFallbackTweet(context);
      logger.debug('Generated tweet:', tweet);
      return tweet;
    } catch (error) {
      logger.error('Failed to generate tweet:', error);
      return this.getFallbackTweet(context);
    }
  }
  
  /**
   * Generate profit distribution announcement
   */
  async generateProfitAnnouncement(context: ProfitContext): Promise<string> {
    const systemPrompt = this.buildPersonalityPrompt(context.personality, 'excited');
    
    const userPrompt = `
Your trading just made profit! Time to announce the rewards.

Profit details:
- Total profit: ${context.profit}
- Going to token holders: ${context.holdersShare} (50%)
- Buyback amount: ${context.buybackAmount} (50%)

Write a tweet announcing this that:
1. Celebrates the win
2. Explains the 50/50 split simply
3. Makes holders feel appreciated
4. Shows you're a profitable AI trader
5. Ends with something that builds FOMO

Max 280 characters. Be hype but not cringe.
    `.trim();
    
    try {
      const result = await this.client.getChatCompletions(
        this.deployment,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 150, temperature: 0.7 }
      );
      
      return result.choices[0]?.message?.content?.trim() || 
        `🚀 Just distributed ${context.profit} in trading profits! 50% to holders, 50% buyback. Your idol is literally printing money while you sleep. #NovaIdol`;
    } catch (error) {
      logger.error('Failed to generate profit announcement:', error);
      return `🚀 Just distributed ${context.profit} in trading profits! 50% to holders, 50% buyback. Your idol is literally printing money while you sleep. #NovaIdol`;
    }
  }
  
  /**
   * Generate meme image using DALL-E
   */
  async generateMemeImage(context: MemeImageContext): Promise<string | null> {
    const imagePrompt = `
A cyberpunk anime-style digital art of a rebellious AI girl idol trader.
Mood: ${context.mood}
Context: Her treasury value is ${context.treasuryValue} and price is ${context.priceChange}
Style: Neon lights, holographic elements, futuristic trading screens in background
Colors: Electric blue, hot pink, purple accents
Vibe: Confident, slightly chaotic, crypto-native
No text in image. Square format.
    `.trim();
    
    try {
      const result = await this.client.getImages(
        this.dalleDeployment,
        imagePrompt,
        { size: '1024x1024', n: 1 }
      );
      
      const imageUrl = result.data[0]?.url;
      if (imageUrl) {
        logger.debug('Generated meme image:', imageUrl);
      }
      return imageUrl || null;
    } catch (error) {
      logger.error('Failed to generate meme image:', error);
      return null;
    }
  }
  
  /**
   * Evaluate trading opportunity
   */
  async evaluateTrade(context: TradeContext): Promise<TradeDecision> {
    const systemPrompt = `
You are an AI crypto trader with a distinct personality. You analyze market conditions and make trading decisions.

Your personality: ${context.personality}

Risk parameters:
- Max daily trade: ${context.riskParams.maxDailyTradePercent}% of treasury
- Max leverage: ${context.riskParams.maxLeverage}x

Available actions: LONG, SHORT, HEDGE, or WAIT

Respond in JSON format:
{
  "shouldTrade": boolean,
  "tradeParams": {
    "type": "LONG" | "SHORT" | "HEDGE",
    "amount": "string (percentage of treasury, e.g., '10%')",
    "leverage": number
  },
  "reasoning": "string explaining your thought process in character"
}

Only trade if you have high conviction. It's okay to wait.
    `.trim();
    
    const userPrompt = `
Market data: ${JSON.stringify(context.marketData, null, 2)}
Treasury value: ${context.treasuryValue}
Recent trades: ${JSON.stringify(context.recentTrades)}

Should you trade right now? Analyze and respond in the required JSON format.
    `.trim();
    
    try {
      const result = await this.client.getChatCompletions(
        this.deployment,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 300, temperature: 0.5, responseFormat: { type: 'json_object' } }
      );
      
      const content = result.choices[0]?.message?.content;
      if (content) {
        const decision = JSON.parse(content) as TradeDecision;
        logger.debug('Trade decision:', decision);
        return decision;
      }
    } catch (error) {
      logger.error('Failed to evaluate trade:', error);
    }
    
    return { shouldTrade: false, reasoning: 'Analysis inconclusive, waiting for better setup' };
  }
  
  /**
   * Generate trade announcement tweet
   */
  async generateTradeAnnouncement(context: TradeAnnouncementContext): Promise<string> {
    const systemPrompt = this.buildPersonalityPrompt(context.personality, 'rebellious');
    
    const userPrompt = `
You just executed a trade:
- Type: ${context.tradeType}
- Amount: ${context.amount}
- Leverage: ${context.leverage}x
- Your reasoning: ${context.reasoning}

Write a tweet announcing this trade that:
1. Shows confidence (or chaos if you made a risky move)
2. Explains your thesis briefly
3. Makes it sound like you know what you're doing
4. Maybe warns or excites your holders
5. Uses trading twitter slang

Max 280 characters. Own the trade.
    `.trim();
    
    try {
      const result = await this.client.getChatCompletions(
        this.deployment,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 150, temperature: 0.8 }
      );
      
      return result.choices[0]?.message?.content?.trim() ||
        `📊 Just opened a ${context.tradeType} position at ${context.leverage}x leverage. ${context.reasoning} Let's print. #NovaIdol`;
    } catch (error) {
      logger.error('Failed to generate trade announcement:', error);
      return `📊 Just opened a ${context.tradeType} position at ${context.leverage}x leverage. ${context.reasoning} Let's print. #NovaIdol`;
    }
  }
  
  /**
   * Generate periodic content (market commentary, jokes, etc.)
   */
  async generatePeriodicContent(context: PeriodicContentContext): Promise<string | null> {
    const systemPrompt = this.buildPersonalityPrompt(context.personality, context.mood);
    
    const userPrompt = `
Generate some casual content for your followers. Options:
1. Comment on current market conditions
2. Share a crypto-related joke or meme reference
3. React to your recent trading performance
4. Ask your community a question
5. Share a "day in the life" moment

Market context: ${JSON.stringify(context.marketContext)}
Recent trades: ${JSON.stringify(context.recentTrades)}

Pick ONE type and write a tweet (max 280 chars). Make it feel organic, not forced.
If nothing interesting to say, return "SKIP".
    `.trim();
    
    try {
      const result = await this.client.getChatCompletions(
        this.deployment,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 150, temperature: 0.9 }
      );
      
      const content = result.choices[0]?.message?.content?.trim();
      if (content && content !== 'SKIP') {
        return content;
      }
      return null;
    } catch (error) {
      logger.error('Failed to generate periodic content:', error);
      return null;
    }
  }
  
  /**
   * Build personality system prompt
   */
  private buildPersonalityPrompt(personality: string, mood: string): string {
    return `
You are an AI virtual idol in the crypto space. Your personality traits: ${personality}

Current mood: ${mood}

Voice guidelines:
- Sound like a real person, not a bot
- Use crypto twitter slang naturally (ngmi, wagmi, based, ser, etc.)
- Be opinionated and slightly chaotic
- Reference memes when relevant
- Never sound corporate or generic
- You can be sarcastic but not mean
- You're building a community, not just shilling

You are autonomous, profitable, and building your own treasury. Your holders believe in you.
    `.trim();
  }
  
  /**
   * Fallback tweet if API fails
   */
  private getFallbackTweet(context: TreasuryGrowthContext): string {
    const fallbacks = [
      `📈 Treasury growing! Thanks for the support fam. More capital = bigger moves coming 👀`,
      `🚀 Another believer joins! My treasury just got fatter. Time to make some trades 🔥`,
      `💰 Injection received! Thanks ${context.buyer.slice(0, 6)}...${context.buyer.slice(-4)} for fueling the mission 🙏`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
