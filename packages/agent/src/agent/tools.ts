/**
 * Tool Registry for AI Agent
 * 
 * Tools are functions the AI can call via function_call.
 * Each tool has a schema (for the AI) and an executor (for runtime).
 */

import { ethers } from 'ethers';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Tool parameter/return types
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

// Contract ABI
const IDOL_TOKEN_ABI = [
  'function getCurrentPrice() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function getTreasuryStats() view returns (uint256 totalValue, uint256 tokenPrice, uint256 marketCap, uint256 holderCount)',
  'function executeTreasuryTrade(string tradeType, uint256 amount, uint256 leverage)',
  'function distributeProfits() payable',
  'function holderCount() view returns (uint256)',
];

/**
 * Tool Registry — manages all available tools for the AI agent
 */
export class ToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; executor: ToolExecutor }> = new Map();
  private config: Config;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(config: Config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.INJECTIVE_RPC);
    this.wallet = new ethers.Wallet(config.AGENT_PRIVATE_KEY, this.provider);

    this.registerBuiltinTools();
  }

  /**
   * Get all tool definitions for the AI (OpenAI function schema format)
   */
  getToolSchemas(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Execute a tool by name
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, data: null, error: `Unknown tool: ${toolName}` };
    }

    logger.info(`🔧 Executing tool: ${toolName}`, args);
    try {
      const result = await tool.executor(args);
      logger.info(`   Result: ${result.success ? '✅' : '❌'}`, result.data);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`   Tool ${toolName} failed:`, msg);
      return { success: false, data: null, error: msg };
    }
  }

  /**
   * Register all built-in tools
   */
  private registerBuiltinTools(): void {
    // --- Market Data Tools ---

    this.register({
      name: 'check_price',
      description: 'Get the current token price and market data for the idol token',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    }, async () => {
      const contract = new ethers.Contract(this.config.IDOL_TOKEN_ADDRESS, IDOL_TOKEN_ABI, this.provider);
      const [price, supply, stats] = await Promise.all([
        contract.getCurrentPrice(),
        contract.totalSupply(),
        contract.getTreasuryStats(),
      ]);
      return {
        success: true,
        data: {
          currentPrice: ethers.formatEther(price) + ' INJ',
          totalSupply: supply.toString() + ' tokens',
          treasuryValue: ethers.formatEther(stats.totalValue) + ' INJ',
          marketCap: ethers.formatEther(stats.marketCap) + ' INJ',
          holderCount: stats.holderCount.toString(),
        },
      };
    });

    this.register({
      name: 'check_balance',
      description: 'Check the agent wallet INJ balance and trading subaccount',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    }, async () => {
      const balance = await this.provider.getBalance(this.wallet.address);
      const contractBalance = await this.provider.getBalance(this.config.IDOL_TOKEN_ADDRESS);
      return {
        success: true,
        data: {
          agentBalance: ethers.formatEther(balance) + ' INJ',
          contractLiquidity: ethers.formatEther(contractBalance) + ' INJ',
          agentAddress: this.wallet.address,
        },
      };
    });

    this.register({
      name: 'check_inj_price',
      description: 'Get the current INJ/USD price from oracle',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    }, async () => {
      // In production, this would query Pyth or the MCP server
      // For demo, return cached market data
      return {
        success: true,
        data: {
          symbol: 'INJ/USD',
          price: '4.90',
          source: 'cached (would use MCP in production)',
        },
      };
    });

    // --- Trading Tools ---

    this.register({
      name: 'open_trade',
      description: 'Open a leveraged position using treasury funds. Calls executeTreasuryTrade on the contract.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', description: 'Trade direction', enum: ['LONG', 'SHORT', 'HEDGE'] },
          amount_inj: { type: 'string', description: 'Amount in INJ to trade (e.g. "0.1")' },
          leverage: { type: 'string', description: 'Leverage multiplier (1-5)' },
        },
        required: ['direction', 'amount_inj', 'leverage'],
      },
    }, async (args) => {
      const direction = args.direction as string;
      const amountInj = args.amount_inj as string;
      const leverage = parseInt(args.leverage as string);

      if (leverage > this.config.MAX_LEVERAGE) {
        return { success: false, data: null, error: `Leverage ${leverage} exceeds max ${this.config.MAX_LEVERAGE}` };
      }

      const contract = new ethers.Contract(this.config.IDOL_TOKEN_ADDRESS, IDOL_TOKEN_ABI, this.wallet);
      const amountWei = ethers.parseEther(amountInj);

      const tx = await contract.executeTreasuryTrade(direction, amountWei, leverage, { gasLimit: 300000 });
      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          txHash: receipt.hash,
          direction,
          amount: amountInj + ' INJ',
          leverage: leverage + 'x',
          status: 'executed',
        },
      };
    });

    // --- Content Tools ---

    this.register({
      name: 'generate_tweet',
      description: 'Draft a tweet. Returns the text but does NOT post it (posting requires Twitter API).',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'What to tweet about', enum: ['trade_result', 'market_analysis', 'community', 'meme', 'treasury_update'] },
          context: { type: 'string', description: 'Additional context for the tweet' },
        },
        required: ['topic'],
      },
    }, async (args) => {
      // This tool just structures the request — the actual AI generates the content
      // in the main loop after calling this tool
      return {
        success: true,
        data: {
          topic: args.topic,
          context: args.context || '',
          note: 'Tweet content will be generated by the AI in the next step',
        },
      };
    });

    this.register({
      name: 'wait',
      description: 'Do nothing this cycle. Use when market conditions are unclear or no action is needed.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why choosing to wait' },
        },
        required: ['reason'],
      },
    }, async (args) => {
      return {
        success: true,
        data: { action: 'wait', reason: args.reason },
      };
    });
  }

  /**
   * Register a new tool
   */
  private register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
  }
}
