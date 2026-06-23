import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // AI (DeepSeek / OpenAI-compatible)
  AI_API_URL: string;
  AI_API_KEY: string;
  AI_MODEL: string;

  // Injective EVM
  INJECTIVE_RPC: string;
  INJECTIVE_CHAIN_ID: string;
  IDOL_TOKEN_ADDRESS: string;
  IDOL_FACTORY_ADDRESS: string;
  ERC8004_AGENT_ADDRESS: string;
  AGENT_PRIVATE_KEY: string;

  // Agent Identity
  AGENT_NAME: string;
  AGENT_PERSONALITY: string;

  // Risk Management
  MAX_DAILY_TRADE_PERCENT: number;
  MAX_LEVERAGE: number;

  // Intervals
  POLL_INTERVAL: number;
  CONTENT_GENERATION_INTERVAL: number;

  // Debug
  DEBUG: boolean;
}

export const config: Config = {
  AI_API_URL: process.env.AI_API_URL || 'https://api.deepseek.com',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'deepseek-v4-flash-pro',

  INJECTIVE_RPC: process.env.INJECTIVE_RPC || 'https://k8s.testnet.json-rpc.injective.network/',
  INJECTIVE_CHAIN_ID: process.env.INJECTIVE_CHAIN_ID || '1439',
  IDOL_TOKEN_ADDRESS: process.env.IDOL_TOKEN_ADDRESS || '',
  IDOL_FACTORY_ADDRESS: process.env.IDOL_FACTORY_ADDRESS || '',
  ERC8004_AGENT_ADDRESS: process.env.ERC8004_AGENT_ADDRESS || '',
  AGENT_PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY || '',

  AGENT_NAME: process.env.AGENT_NAME || 'Vivian',
  AGENT_PERSONALITY: process.env.AGENT_PERSONALITY || 'rebellious, sarcastic, crypto-native',

  MAX_DAILY_TRADE_PERCENT: parseInt(process.env.MAX_DAILY_TRADE_PERCENT || '20'),
  MAX_LEVERAGE: parseInt(process.env.MAX_LEVERAGE || '5'),

  POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL || '30000'),
  CONTENT_GENERATION_INTERVAL: parseInt(process.env.CONTENT_GENERATION_INTERVAL || '300000'),

  DEBUG: process.env.DEBUG === 'true',
};
