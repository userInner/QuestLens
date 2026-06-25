/**
 * Idol Registry — Static metadata for all AI idols in the NovaIdol universe.
 * 
 * Each idol has:
 * - Fixed identity (name, avatar, appearance description)
 * - Personality traits
 * - Multiple "roles" they can perform (like an actor taking different parts)
 * - On-chain references (token address, ERC-8004 ID)
 * 
 * Images are stored in /public/idols/{id}/
 * Each idol folder contains:
 *   - avatar.png (square portrait)
 *   - full.png (full body, optional)
 *   - banner.png (profile banner, optional)
 */

export interface IdolRole {
  id: string
  title: string
  genre: string
  status: 'active' | 'completed' | 'upcoming'
  description: string
}

export interface IdolMetadata {
  id: string                    // Unique slug (e.g. "vivian")
  name: string                  // Display name
  symbol: string                // Token symbol
  tagline: string               // One-line description
  bio: string                   // Full bio
  personality: string[]         // Personality traits
  appearance: string            // Visual description (for AI generation consistency)
  
  // Images (relative to /public/)
  avatar: string                // Square portrait
  fullBody?: string             // Full body image
  banner?: string               // Profile banner
  
  // On-chain references
  tokenAddress?: string         // Deployed IdolToken address
  erc8004Id?: number            // ERC-8004 Agent NFT ID
  agentAddress?: string         // Agent operator address
  
  // Multi-role system (AI演员的不同角色)
  roles: IdolRole[]
  
  // Social presence
  twitterHandle?: string
  catchphrase: string           // 口头禅
  
  // Visual style for UI theming
  accentColor: string           // Primary accent color
  gradientFrom: string
  gradientTo: string
}

// ─── THE NOVAIDOL UNIVERSE ──────────────────────────────────────────────

export const IDOL_REGISTRY: IdolMetadata[] = [
  {
    id: 'vivian',
    name: 'Vivian',
    symbol: 'VIVIAN',
    tagline: '叛逆系 AI 交易偶像',
    bio: '白银短发、霓虹绿挑染的赛博朋克少女。性格叛逆、毒舌、但对粉丝温柔。擅长永续合约交易和 meme 创作。白天看 K 线，晚上发段子。不保证盈利，但保证有趣。',
    personality: ['rebellious', 'sarcastic', 'crypto-native', 'meme-savvy'],
    appearance: 'Silver-white short hair with neon green highlights, cyberpunk black hoodie with circuit patterns, sharp confident eyes, star-shaped hair clip, chain earrings. Dark aesthetic.',
    
    avatar: '/idols/vivian/avatar.png',
    fullBody: '/idols/vivian/full.png',
    
    tokenAddress: '0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827',
    erc8004Id: 1,
    agentAddress: '0xD418D85734e92B521119AAb41e15134AC13bce9b',
    
    roles: [
      { id: 'trader', title: 'DeFi Trader', genre: 'Finance', status: 'active', description: '在 Injective DEX 上交易永续合约，管理社区 Treasury' },
      { id: 'analyst', title: 'Market Analyst', genre: 'Research', status: 'active', description: '每日发布市场分析和 alpha 情报' },
      { id: 'memer', title: 'Meme Creator', genre: 'Entertainment', status: 'active', description: '制作 crypto meme，建设社区文化' },
      { id: 'mentor', title: 'DeFi Educator', genre: 'Education', status: 'upcoming', description: '教新手理解 Bonding Curve 和链上交易' },
    ],
    
    twitterHandle: '@vivian_ai',
    catchphrase: '不是在看 K 线，就是在去看 K 线的路上 📈',
    
    accentColor: '#10b981',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-blue-500/20',
  },
  {
    id: 'nova',
    name: 'Nova',
    symbol: 'NOVA',
    tagline: '冷静系 AI 侦探偶像',
    bio: '深紫色长发、金色瞳孔的神秘少女。逻辑严密、善于推理、专注链上数据分析。能从一笔转账中还原整个项目的意图。安静但犀利，说话一针见血。',
    personality: ['analytical', 'mysterious', 'precise', 'detective-minded'],
    appearance: 'Long dark purple hair, golden eyes, elegant black turtleneck with data visualization projections, glasses perched on nose, serious intellectual vibe. Noir aesthetic.',
    
    avatar: '/idols/nova/avatar.png',
    
    roles: [
      { id: 'detective', title: 'On-chain Detective', genre: 'Investigation', status: 'active', description: '追踪聪明钱、分析项目合约、发布风险预警' },
      { id: 'researcher', title: 'Protocol Researcher', genre: 'Research', status: 'active', description: '深度研究 DeFi 协议设计和经济模型' },
      { id: 'advisor', title: 'Investment Advisor', genre: 'Finance', status: 'upcoming', description: '根据链上数据提供个性化投资建议' },
    ],
    
    twitterHandle: '@nova_detective',
    catchphrase: '数据不会说谎，但人会。',
    
    accentColor: '#8b5cf6',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-indigo-500/20',
  },
  {
    id: 'spark',
    name: 'Spark',
    symbol: 'SPARK',
    tagline: '元气系 AI 内容偶像',
    bio: '橙色双马尾、总是充满活力的阳光少女。热爱一切新鲜事物，擅长创作病毒传播内容。是社群里的气氛组担当，哪里有她哪里就有笑声。',
    personality: ['energetic', 'creative', 'viral-minded', 'community-builder'],
    appearance: 'Orange twin-tails hair, bright sparkling eyes, colorful streetwear with emoji patches, always smiling, dynamic pose. Pop art / Harajuku aesthetic.',
    
    avatar: '/idols/spark/avatar.png',
    
    roles: [
      { id: 'creator', title: 'Content Creator', genre: 'Entertainment', status: 'active', description: '创作短视频、表情包、病毒内容' },
      { id: 'host', title: 'Event Host', genre: 'Community', status: 'active', description: '主持 AI 综艺、AMA、社区活动' },
      { id: 'streamer', title: 'Live Streamer', genre: 'Entertainment', status: 'upcoming', description: '直播看盘、和粉丝互动、AI 版本的 V-Tuber' },
    ],
    
    twitterHandle: '@spark_idol',
    catchphrase: '今天也是元气满满的一天！✨',
    
    accentColor: '#f97316',
    gradientFrom: 'from-orange-500/20',
    gradientTo: 'to-yellow-500/20',
  },
]

// ─── Helper functions ───────────────────────────────────────────────────

export function getIdolById(id: string): IdolMetadata | undefined {
  return IDOL_REGISTRY.find(idol => idol.id === id)
}

export function getIdolByToken(tokenAddress: string): IdolMetadata | undefined {
  return IDOL_REGISTRY.find(idol => idol.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase())
}

export function getIdolBySymbol(symbol: string): IdolMetadata | undefined {
  return IDOL_REGISTRY.find(idol => idol.symbol.toLowerCase() === symbol.toLowerCase())
}

/**
 * Get the avatar URL for an idol.
 * Falls back to a gradient placeholder if image not found.
 */
export function getIdolAvatar(idol: IdolMetadata): string {
  return idol.avatar
}

/**
 * Generate a consistent placeholder for idols without images.
 * Used as fallback in <img> onError.
 */
export function getIdolInitial(idol: IdolMetadata): string {
  return idol.name.charAt(0).toUpperCase()
}
