import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface MarketData {
  btcPrice: number;
  ethPrice: number;
  injPrice: number;
  fundingRates: Record<string, number>;
  rsi: Record<string, number>;
}

interface MarketContext {
  price: string;
  supply: string;
  recentBuyVolume: string;
  recentEvents: string[];
}

export class MCPClient {
  private config: Config;
  private mockMode: boolean;
  
  constructor(config: Config) {
    this.config = config;
    this.mockMode = config.MOCK_MODE;
  }
  
  async connect(): Promise<void> {
    if (this.mockMode) {
      logger.info('[MOCK MCP] Client initialized in mock mode');
      return;
    }
    logger.info('MCP Client would connect to:', this.config.MCP_SERVER_URL);
  }
  
  async disconnect(): Promise<void> {
    logger.info('MCP Client disconnected');
  }
  
  async getMarketData(): Promise<MarketData> {
    if (this.mockMode) {
      return {
        btcPrice: 45000 + Math.random() * 5000,
        ethPrice: 2500 + Math.random() * 300,
        injPrice: 25 + Math.random() * 5,
        fundingRates: { 'BTC/USDT': 0.0001, 'ETH/USDT': -0.0002 },
        rsi: { 'BTC': 55, 'ETH': 48, 'INJ': 62 },
      };
    }
    return this.getMockMarketData();
  }
  
  async getMarketContext(): Promise<MarketContext> {
    if (this.mockMode) {
      return {
        price: '0.001',
        supply: '1000000',
        recentBuyVolume: '5.2',
        recentEvents: ['Treasury grew by 10%', 'New holder joined', 'Trade executed'],
      };
    }
    return this.getMockMarketContext();
  }
  
  private getMockMarketData(): MarketData {
    return {
      btcPrice: 45000 + Math.random() * 5000,
      ethPrice: 2500 + Math.random() * 300,
      injPrice: 25 + Math.random() * 5,
      fundingRates: { 'BTC/USDT': 0.0001, 'ETH/USDT': -0.0002 },
      rsi: { 'BTC': 55, 'ETH': 48, 'INJ': 62 },
    };
  }
  
  private getMockMarketContext(): MarketContext {
    return {
      price: '0.001',
      supply: '1000000',
      recentBuyVolume: '5.2',
      recentEvents: ['Treasury grew by 10%', 'New holder joined'],
    };
  }
}
