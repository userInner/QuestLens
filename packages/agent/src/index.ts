import { config } from './config/index.js';
import { AgentLoop } from './agent/AgentLoop.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('┌─────────────────────────────────────────┐');
  logger.info('│   🎭 NovaIdol AI Agent — Vivian          │');
  logger.info('│   Tools + Mood + Autonomous Decisions    │');
  logger.info('└─────────────────────────────────────────┘');
  logger.info('');
  logger.info(`Config:`);
  logger.info(`  Name: ${config.AGENT_NAME}`);
  logger.info(`  Model: ${config.AI_MODEL}`);
  logger.info(`  RPC: ${config.INJECTIVE_RPC}`);
  logger.info(`  Token: ${config.IDOL_TOKEN_ADDRESS}`);
  logger.info(`  Max Leverage: ${config.MAX_LEVERAGE}x`);
  logger.info('');

  const agent = new AgentLoop(config);

  // Demo mode: run 3 cycles then exit
  const mode = process.argv[2] || 'demo';

  if (mode === 'loop') {
    // Production: continuous loop
    logger.info('Mode: LOOP (continuous, Ctrl+C to stop)');
    process.on('SIGINT', () => {
      logger.info('Shutting down...');
      agent.stop();
      process.exit(0);
    });
    await agent.startLoop(config.POLL_INTERVAL);
  } else {
    // Demo: run 2 cycles to showcase tools + mood
    logger.info('Mode: DEMO (2 cycles)');
    logger.info('');

    await agent.runOnce();
    logger.info('');
    logger.info('── Waiting 3s before next cycle... ──');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await agent.runOnce();

    logger.info('');
    logger.info('═══════════════════════════════════════');
    logger.info('✅ Demo complete!');
    logger.info('');
    logger.info('To run continuously:');
    logger.info('  npx tsx src/index.ts loop');
    logger.info('═══════════════════════════════════════');
  }
}

main().catch((err) => {
  logger.error('Agent crashed:', err);
  process.exit(1);
});
