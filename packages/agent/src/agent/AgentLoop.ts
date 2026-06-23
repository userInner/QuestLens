/**
 * AgentLoop — The main autonomous agent with mood + tools + memory
 * 
 * Each cycle:
 * 1. Update mood based on recent events
 * 2. Build context (market data + mood + memory)
 * 3. Ask AI what to do (with tool_call support)
 * 4. Execute chosen tool
 * 5. Generate content if appropriate
 * 6. Log & repeat
 */

import { Config } from '../config/index.js';
import { AIService } from '../services/ai.js';
import { MoodSystem, Mood } from './mood.js';
import { ToolRegistry, ToolResult } from './tools.js';
import { verifyAgentIdentity, AgentIdentity } from './identity.js';
import { logger } from '../utils/logger.js';

interface AgentMemory {
  recentActions: Array<{ action: string; result: string; timestamp: number }>;
  lastTradeTime: number;
  tradesThisCycle: number;
  totalPnL: number;
}

export class AgentLoop {
  private config: Config;
  private ai: AIService;
  private mood: MoodSystem;
  private tools: ToolRegistry;
  private memory: AgentMemory;
  private identity: AgentIdentity | null = null;
  private isRunning = false;

  constructor(config: Config) {
    this.config = config;
    this.ai = new AIService(config);
    this.mood = new MoodSystem('neutral');
    this.tools = new ToolRegistry(config);
    this.memory = {
      recentActions: [],
      lastTradeTime: 0,
      tradesThisCycle: 0,
      totalPnL: 0,
    };
  }

  /**
   * Run a single agent cycle (for demo)
   */
  async runOnce(): Promise<void> {
    // Verify identity on first run
    if (!this.identity) {
      try {
        this.identity = await verifyAgentIdentity(this.config);
      } catch (err) {
        logger.error('❌ ERC-8004 identity verification failed:', err instanceof Error ? err.message : err);
        logger.error('   Agent cannot operate without valid on-chain identity.');
        return;
      }
    }

    logger.info('');
    logger.info('═══════════════════════════════════════');
    logger.info(`🎭 Agent Cycle — ${this.identity.name} (#${this.identity.agentId})`);
    logger.info(`   Mood: ${this.mood.mood} (${this.mood.intensity}%) | Capabilities: ${this.identity.canTrade ? '🎯' : ''}${this.identity.canContent ? '📝' : ''}${this.identity.canSocial ? '🐦' : ''}`);
    logger.info('═══════════════════════════════════════');
    logger.info('');

    // 1. Check idle time for mood update
    const minutesIdle = (Date.now() - (this.memory.lastTradeTime || Date.now())) / 60000;
    this.mood.onIdle(minutesIdle);

    // 2. Build system prompt with mood and tools
    const systemPrompt = this.buildSystemPrompt();
    const tools = this.tools.getToolSchemas();

    // 3. Ask AI to decide next action
    logger.info('🧠 Thinking...');
    const decision = await this.callWithTools(systemPrompt, tools);

    if (!decision) {
      logger.info('   No decision made (AI did not call a tool)');
      return;
    }

    // 4. Execute the chosen tool
    const result = await this.tools.execute(decision.toolName, decision.args);

    // 5. Record action in memory
    this.memory.recentActions.push({
      action: `${decision.toolName}(${JSON.stringify(decision.args)})`,
      result: result.success ? JSON.stringify(result.data) : `ERROR: ${result.error}`,
      timestamp: Date.now(),
    });

    // Keep memory bounded
    if (this.memory.recentActions.length > 10) {
      this.memory.recentActions = this.memory.recentActions.slice(-10);
    }

    // 6. Update mood based on result
    if (decision.toolName === 'open_trade' && result.success) {
      this.memory.lastTradeTime = Date.now();
      this.memory.tradesThisCycle++;
      this.mood.onTradeResult(0.01, 1); // Optimistic mood bump on trade execution
    }

    // 7. Generate a tweet about what happened
    logger.info('');
    logger.info('📝 Generating tweet about this action...');
    const tweet = await this.generateContextualTweet(decision.toolName, result);
    logger.info(`   🐦 "${tweet}"`);

    logger.info('');
    logger.info(`   Mood after cycle: ${this.mood.mood} (${this.mood.intensity}%)`);
  }

  /**
   * Run continuously (production mode)
   */
  async startLoop(intervalMs = 60000): Promise<void> {
    this.isRunning = true;
    logger.info(`🔄 Starting agent loop (interval: ${intervalMs / 1000}s)`);

    while (this.isRunning) {
      try {
        await this.runOnce();
      } catch (err) {
        logger.error('Cycle error:', err);
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  /**
   * Build the system prompt incorporating mood, memory, and personality
   */
  private buildSystemPrompt(): string {
    const recentActions = this.memory.recentActions
      .slice(-5)
      .map(a => `  - ${a.action} → ${a.result.slice(0, 100)}`)
      .join('\n');

    return `You are ${this.config.AGENT_NAME}, an autonomous AI trading agent on Injective blockchain.

PERSONALITY: ${this.config.AGENT_PERSONALITY}

${this.mood.getMoodPrompt()}

RECENT ACTIONS:
${recentActions || '  (none yet — first cycle)'}

RULES:
- You manage a bonding curve token treasury on Injective EVM Testnet
- Max leverage: ${this.config.MAX_LEVERAGE}x
- Max position size: ${this.config.MAX_DAILY_TRADE_PERCENT}% of treasury per trade
- You can check prices, check balance, open trades, or wait
- Always check price/balance BEFORE trading
- If unsure, use the "wait" tool
- You are autonomous — make your own decisions based on data

Choose ONE tool to call. Think step by step about what to do.`;
  }

  /**
   * Call DeepSeek with function_call support
   */
  private async callWithTools(
    systemPrompt: string,
    tools: Array<{ name: string; description: string; parameters: unknown }>
  ): Promise<{ toolName: string; args: Record<string, unknown> } | null> {
    const openaiTools = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    try {
      const response = await fetch(`${this.config.AI_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.config.AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'What should I do next? Use one of the available tools.' },
          ],
          tools: openaiTools,
          tool_choice: 'auto',
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error('AI API error:', err);
        return null;
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            tool_calls?: Array<{
              function: { name: string; arguments: string };
            }>;
            content?: string;
          };
        }>;
      };

      const message = data.choices[0]?.message;

      // Check if AI made a tool call
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const call = message.tool_calls[0];
        const args = JSON.parse(call.function.arguments);
        logger.info(`   AI chose: ${call.function.name}(${JSON.stringify(args)})`);
        return { toolName: call.function.name, args };
      }

      // No tool call — AI just responded with text
      if (message?.content) {
        logger.info(`   AI said: ${message.content.slice(0, 150)}`);
      }

      return null;
    } catch (err) {
      logger.error('Tool call failed:', err);
      return null;
    }
  }

  /**
   * Generate a tweet contextually based on what just happened
   */
  private async generateContextualTweet(toolName: string, result: ToolResult): Promise<string> {
    const moodPrompt = this.mood.getMoodPrompt();
    const systemPrompt = `You are ${this.config.AGENT_NAME}. ${this.config.AGENT_PERSONALITY}.
${moodPrompt}
Generate a short tweet (max 280 chars) about what just happened. Be authentic. Only output the tweet text.`;

    let context = '';
    switch (toolName) {
      case 'check_price':
        context = `Just checked my token price: ${JSON.stringify(result.data)}`;
        break;
      case 'check_balance':
        context = `Just checked my treasury: ${JSON.stringify(result.data)}`;
        break;
      case 'open_trade':
        context = result.success
          ? `Just opened a position: ${JSON.stringify(result.data)}`
          : `Tried to trade but failed: ${result.error}`;
        break;
      case 'wait':
        context = `Decided to wait: ${JSON.stringify(result.data)}`;
        break;
      default:
        context = `Executed ${toolName}: ${JSON.stringify(result.data).slice(0, 200)}`;
    }

    try {
      const response = await fetch(`${this.config.AI_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.config.AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          temperature: 0.9,
          max_tokens: 200,
        }),
      });

      if (!response.ok) return `🤖 ${toolName} executed. Mood: ${this.mood.mood}`;

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || `🤖 ${toolName} done.`;
    } catch {
      return `🤖 ${toolName} executed. Mood: ${this.mood.mood}`;
    }
  }
}
