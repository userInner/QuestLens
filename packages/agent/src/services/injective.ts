import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';
import { ethers } from 'ethers';

// Contract ABIs (simplified for demo)
const IDOL_TOKEN_ABI = [
  'event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)',
  'event TokensSold(address indexed seller, uint256 amount, uint256 refund)',
  'event ProfitDistributed(uint256 totalProfit, uint256 holdersShare, uint256 buybackAmount)',
  'event TreasuryTradeExecuted(string tradeType, uint256 amount, uint256 leverage)',
  'function getTreasuryStats() view returns (uint256 totalValue, uint256 tokenPrice, uint256 marketCap, uint256 holderCount)',
  'function executeTreasuryTrade(string tradeType, uint256 amount, uint256 leverage)',
  'function idolAgent() view returns (address)',
];

const IDOL_FACTORY_ABI = [
  'event IdolCreated(uint256 indexed idolId, address indexed token, address indexed treasury, address idolAgent, string name, string symbol, string personality)',
  'function getIdol(uint256 idolId) view returns (address token, address treasury, address idolAgent, string name, string symbol, string personality, uint256 createdAt, bool active)',
];

interface TreasuryStats {
  totalValue: string;
  tokenPrice: string;
  marketCap: string;
  holderCount: number;
}

export class InjectiveService extends EventEmitter {
  private config: Config;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private tokenContract: ethers.Contract | null = null;
  private factoryContract: ethers.Contract | null = null;
  private lastBlockChecked = 0;
  
  constructor(config: Config) {
    super();
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    logger.info('🔗 Initializing Injective connection...');
    
    try {
      // Connect to Injective EVM
      this.provider = new ethers.JsonRpcProvider(this.config.INJECTIVE_RPC);
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(this.config.AGENT_PRIVATE_KEY, this.provider);
      logger.info(`Wallet address: ${this.wallet.address}`);
      
      // Initialize contracts if addresses provided
      if (this.config.IDOL_TOKEN_ADDRESS) {
        this.tokenContract = new ethers.Contract(
          this.config.IDOL_TOKEN_ADDRESS,
          IDOL_TOKEN_ABI,
          this.wallet
        );
        logger.info(`Connected to IdolToken at ${this.config.IDOL_TOKEN_ADDRESS}`);
      }
      
      if (this.config.IDOL_FACTORY_ADDRESS) {
        this.factoryContract = new ethers.Contract(
          this.config.IDOL_FACTORY_ADDRESS,
          IDOL_FACTORY_ABI,
          this.provider
        );
        logger.info(`Connected to IdolFactory at ${this.config.IDOL_FACTORY_ADDRESS}`);
      }
      
      // Get current block
      this.lastBlockChecked = await this.provider.getBlockNumber();
      logger.info(`Starting from block ${this.lastBlockChecked}`);
      
    } catch (error) {
      logger.error('Failed to initialize Injective connection:', error);
      throw error;
    }
  }
  
  /**
   * Poll for new blockchain events
   */
  async pollEvents(): Promise<void> {
    if (!this.provider || !this.tokenContract) {
      return;
    }
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock <= this.lastBlockChecked) {
        return;
      }
      
      // Query events from lastBlockChecked to currentBlock
      const filter = this.tokenContract.filters.TokensPurchased();
      const events = await this.tokenContract.queryFilter(
        filter,
        this.lastBlockChecked,
        currentBlock
      );
      
      for (const event of events) {
        if (event instanceof ethers.EventLog) {
          this.emit('TokensPurchased', {
            buyer: event.args?.buyer,
            amount: event.args?.amount.toString(),
            cost: event.args?.cost.toString(),
          });
        }
      }
      
      // Check for profit distribution events
      const profitFilter = this.tokenContract.filters.ProfitDistributed();
      const profitEvents = await this.tokenContract.queryFilter(
        profitFilter,
        this.lastBlockChecked,
        currentBlock
      );
      
      for (const event of profitEvents) {
        if (event instanceof ethers.EventLog) {
          this.emit('ProfitDistributed', {
            totalProfit: event.args?.totalProfit.toString(),
            holdersShare: event.args?.holdersShare.toString(),
            buybackAmount: event.args?.buybackAmount.toString(),
          });
        }
      }
      
      this.lastBlockChecked = currentBlock;
      
    } catch (error) {
      logger.error('Error polling events:', error);
    }
  }
  
  /**
   * Get treasury stats
   */
  async getTreasuryStats(): Promise<TreasuryStats> {
    if (!this.tokenContract) {
      // Return mock data for development
      return {
        totalValue: '10000000000000000000', // 10 INJ
        tokenPrice: '1000000000000000', // 0.001 INJ
        marketCap: '1000000000000000000000',
        holderCount: 42,
      };
    }
    
    try {
      const stats = await this.tokenContract.getTreasuryStats();
      return {
        totalValue: stats.totalValue.toString(),
        tokenPrice: stats.tokenPrice.toString(),
        marketCap: stats.marketCap.toString(),
        holderCount: Number(stats.holderCount),
      };
    } catch (error) {
      logger.error('Failed to get treasury stats:', error);
      throw error;
    }
  }
  
  /**
   * Execute treasury trade
   */
  async executeTrade(
    tradeType: 'LONG' | 'SHORT' | 'HEDGE',
    amount: string,
    leverage: number
  ): Promise<void> {
    if (!this.tokenContract || !this.wallet) {
      logger.warn('Mock mode: Trade execution simulated');
      this.emit('TreasuryTradeExecuted', {
        tradeType,
        amount,
        leverage,
      });
      return;
    }
    
    try {
      // Check if we're the authorized idol agent
      const authorizedAgent = await this.tokenContract.idolAgent();
      if (authorizedAgent.toLowerCase() !== this.wallet.address.toLowerCase()) {
        throw new Error('Not authorized as idol agent');
      }
      
      // Execute trade on contract
      const tx = await this.tokenContract.executeTreasuryTrade(
        tradeType,
        amount,
        leverage
      );
      
      logger.info(`Trade transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      logger.info(`Trade confirmed in block ${receipt?.blockNumber}`);
      
      this.emit('TreasuryTradeExecuted', {
        tradeType,
        amount,
        leverage,
        txHash: tx.hash,
      });
      
    } catch (error) {
      logger.error('Failed to execute trade:', error);
      throw error;
    }
  }
  
  /**
   * Get idol info from factory
   */
  async getIdolInfo(idolId: number): Promise<{
    token: string;
    treasury: string;
    idolAgent: string;
    name: string;
    symbol: string;
    personality: string;
  } | null> {
    if (!this.factoryContract) {
      return null;
    }
    
    try {
      const idol = await this.factoryContract.getIdol(idolId);
      return {
        token: idol.token,
        treasury: idol.treasury,
        idolAgent: idol.idolAgent,
        name: idol.name,
        symbol: idol.symbol,
        personality: idol.personality,
      };
    } catch (error) {
      logger.error('Failed to get idol info:', error);
      return null;
    }
  }
  
  /**
   * Subscribe to real-time events via WebSocket (if available)
   */
  async subscribeToEvents(): Promise<void> {
    // WebSocket subscription for real-time events
    // Implementation depends on Injective provider capabilities
    logger.info('Event subscription initialized');
  }
}
