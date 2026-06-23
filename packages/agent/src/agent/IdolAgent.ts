import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AzureOpenAIService } from '../services/azure-openai.js';
import { InjectiveService } from '../services/injective.js';
import { TwitterService } from '../services/twitter.js';
import { MCPClient } from '../services/mcp-client.js';
import { EventEmitter } from 'events';

interface TreasuryStats {
  totalValue: string;
  tokenPrice: string;
  marketCap: string;
  holderCount: number;
}

interface MarketContext {
  price: string;
  supply: string;
  recentBuyVolume: string;
  recentEvents: string[];
}

export class IdolAgent extends EventEmitter {
  private config: Config;
  private openai: AzureOpenAIService;
  private injective: InjectiveService;
  private twitter: TwitterService;
  private mcp: MCPClient;
  
  private isRunning = false;
  private lastContentGenTime = 0;
  private dailyTradeCount = 0;
  private lastTradeReset = Date.now();
  
  // Personality state
  private mood: 'excited' | 'neutral' | 'concerned' | 'rebellious' = 'neutral';
  private recentTrades: Array<{ type: string; result: string; amount: string }> = [];
  
  constructor(config: Config) {
    super();
    this.config = config;
    
    this.openai = new AzureOpenAIService(config);
    this.injective = new InjectiveService(config);
    this.twitter = new TwitterService(config);
    this.mcp = new MCPClient(config);
  }
  
  async initialize(): Promise<void> {
    logger.info(`🎭 Initializing AI Idol Agent: ${this.config.AGENT_NAME}`);
    
    // Initialize services
    await this.injective.initialize();
    await this.mcp.connect();
    
    // Register for blockchain events
    this.injective.on('TokensPurchased', this.handleTokenPurchase.bind(this));
    this.injective.on('ProfitDistributed', this.handleProfitDistribution.bind(this));
    this.injective.on('TreasuryTradeExecuted', this.handleTradeExecution.bind(this));
    
    logger.info('✅ Agent initialized successfully');
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    
    // Main event loop
    while (this.isRunning) {
      try {
        // Poll for blockchain events
        await this.injective.pollEvents();
        
        // Check if we need to generate content
        await this.checkContentGeneration();
        
        // Check market conditions for trading
        await this.evaluateTradingOpportunities();
        
        // Reset daily trade counter if needed
        this.checkAndResetDailyTrades();
        
        await this.sleep(this.config.POLL_INTERVAL);
      } catch (error) {
        logger.error('Error in main loop:', error);
        await this.sleep(this.config.POLL_INTERVAL * 2);
      }
    }
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.mcp.disconnect();
    logger.info('Agent stopped');
  }
  
  /**
   * Handle token purchase events - triggers content generation
   */
  private async handleTokenPurchase(event: {
    buyer: string;
    amount: string;
    cost: string;
  }): Promise<void> {
    logger.info(`📈 Token purchase detected: ${event.amount} tokens for ${event.cost} INJ`);
    
    // Get treasury stats
    const stats = await this.injective.getTreasuryStats();
    
    // Update mood based on purchase size
    const costInInj = parseFloat(event.cost) / 1e18;
    if (costInInj > 1) {
      this.mood = 'excited';
    }
    
    // Generate and post content
    await this.generateTreasuryGrowthContent(stats, event);
  }
  
  /**
   * Handle profit distribution - triggers dividend announcement
   */
  private async handleProfitDistribution(event: {
    totalProfit: string;
    holdersShare: string;
    buybackAmount: string;
  }): Promise<void> {
    logger.info(`💰 Profit distributed: ${event.totalProfit}`);
    
    const content = await this.openai.generateProfitAnnouncement({
      profit: event.totalProfit,
      holdersShare: event.holdersShare,
      buybackAmount: event.buybackAmount,
      mood: this.mood,
      personality: this.config.AGENT_PERSONALITY,
    });
    
    await this.twitter.post(content);
    this.emit('contentPosted', { type: 'profit', content });
  }
  
  /**
   * Handle trade execution confirmation
   */
  private async handleTradeExecution(event: {
    tradeType: string;
    amount: string;
    leverage: string;
  }): Promise<void> {
    logger.info(`📊 Trade executed: ${event.tradeType} ${event.amount} at ${event.leverage}x`);
    
    this.recentTrades.push({
      type: event.tradeType,
      amount: event.amount,
      result: 'pending',
    });
    
    // Keep only last 10 trades
    if (this.recentTrades.length > 10) {
      this.recentTrades.shift();
    }
  }
  
  /**
   * Generate content when treasury grows
   */
  private async generateTreasuryGrowthContent(
    stats: TreasuryStats,
    event: { buyer: string; amount: string; cost: string }
  ): Promise<void> {
    try {
      // Generate meme image
      const imageUrl = await this.openai.generateMemeImage({
        mood: this.mood,
        treasuryValue: stats.totalValue,
        priceChange: 'up',
        personality: this.config.AGENT_PERSONALITY,
      });
      
      // Generate tweet text
      const tweet = await this.openai.generateTreasuryGrowthTweet({
        buyer: event.buyer,
        amount: event.amount,
        cost: event.cost,
        treasuryValue: stats.totalValue,
        tokenPrice: stats.tokenPrice,
        mood: this.mood,
        personality: this.config.AGENT_PERSONALITY,
        recentTrades: this.recentTrades,
      });
      
      // Post to Twitter
      if (imageUrl) {
        await this.twitter.postWithImage(tweet, imageUrl);
      } else {
        await this.twitter.post(tweet);
      }
      
      this.emit('contentPosted', { type: 'treasuryGrowth', tweet, imageUrl });
      
      // Reset mood after posting
      this.mood = 'neutral';
      
    } catch (error) {
      logger.error('Failed to generate content:', error);
    }
  }
  
  /**
   * Check if we should generate periodic content
   */
  private async checkContentGeneration(): Promise<void> {
    const now = Date.now();
    if (now - this.lastContentGenTime < this.config.CONTENT_GENERATION_INTERVAL) {
      return;
    }
    
    this.lastContentGenTime = now;
    
    try {
      // Get market context from MCP
      const marketContext = await this.mcp.getMarketContext();
      
      // Generate periodic content
      const content = await this.openai.generatePeriodicContent({
        personality: this.config.AGENT_PERSONALITY,
        mood: this.mood,
        marketContext,
        recentTrades: this.recentTrades,
      });
      
      if (content) {
        await this.twitter.post(content);
        this.emit('contentPosted', { type: 'periodic', content });
      }
      
    } catch (error) {
      logger.error('Failed to generate periodic content:', error);
    }
  }
  
  /**
   * Evaluate market conditions and execute trades
   */
  private async evaluateTradingOpportunities(): Promise<void> {
    // Check daily trade limit
    if (this.dailyTradeCount >= 3) { // Max 3 trades per day
      return;
    }
    
    try {
      // Get market data from MCP
      const marketData = await this.mcp.getMarketData();
      
      // Get treasury stats
      const stats = await this.injective.getTreasuryStats();
      
      // Ask AI for trading decision
      const decision = await this.openai.evaluateTrade({
        marketData,
        treasuryValue: stats.totalValue,
        recentTrades: this.recentTrades,
        personality: this.config.AGENT_PERSONALITY,
        riskParams: {
          maxDailyTradePercent: this.config.MAX_DAILY_TRADE_PERCENT,
          maxLeverage: this.config.MAX_LEVERAGE,
        },
      });
      
      if (decision.shouldTrade && decision.tradeParams) {
        // Execute trade through contract
        await this.injective.executeTrade(
          decision.tradeParams.type,
          decision.tradeParams.amount,
          decision.tradeParams.leverage
        );
        
        this.dailyTradeCount++;
        
        // Update mood based on trade type
        if (decision.tradeParams.type === 'LONG') {
          this.mood = 'excited';
        } else if (decision.tradeParams.type === 'SHORT') {
          this.mood = 'rebellious';
        }
        
        // Generate trade announcement
        const tweet = await this.openai.generateTradeAnnouncement({
          tradeType: decision.tradeParams.type,
          amount: decision.tradeParams.amount,
          leverage: decision.tradeParams.leverage,
          reasoning: decision.reasoning,
          personality: this.config.AGENT_PERSONALITY,
        });
        
        await this.twitter.post(tweet);
      }
      
    } catch (error) {
      logger.error('Failed to evaluate trading opportunities:', error);
    }
  }
  
  /**
   * Check and reset daily trade counter
   */
  private checkAndResetDailyTrades(): void {
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - this.lastTradeReset > oneDay) {
      this.dailyTradeCount = 0;
      this.lastTradeReset = Date.now();
      logger.debug('Daily trade counter reset');
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
