export interface IdolData {
  id: number
  name: string
  symbol: string
  description: string
  personality: string[]
  avatar: string
  totalSupply: string
  currentPrice: string
  treasuryValue: string
  holderCount: number
  createdAt: number
}

export interface TreasuryInfo {
  totalValue: string
  tokenPrice: string
  marketCap: string
  holderCount: number
  dailyVolume: string
  dailyChange: string
  recentTrades: Trade[]
}

export interface Trade {
  type: 'LONG' | 'SHORT' | 'HEDGE'
  amount: string
  leverage: number
  result: 'win' | 'loss'
  profit: string
}

export interface Tweet {
  id: string
  text: string
  createdAt: string
  likes: number
  retweets: number
  imageUrl?: string
}

export interface BondingCurvePoint {
  supply: number
  price: number
  marketCap: number
}
