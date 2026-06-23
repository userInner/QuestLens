import { ethers } from 'ethers'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'

// Network config — switch to Network.Mainnet for production
const NETWORK = Network.Testnet
const ENDPOINTS = getNetworkEndpoints(NETWORK)

// Contract addresses — update after deployment
// For testnet demo, use placeholder addresses until contracts are deployed
export const CONTRACT_ADDRESSES = {
  idolToken: import.meta.env.VITE_IDOL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  idolFactory: import.meta.env.VITE_IDOL_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
  erc8004Agent: import.meta.env.VITE_ERC8004_AGENT_ADDRESS || '0x0000000000000000000000000000000000000000',
}

// IdolToken ABI — only the functions we need for frontend
export const IDOL_TOKEN_ABI = [
  // Read functions
  'function getCurrentPrice() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function getBuyCost(uint256 amount) view returns (uint256)',
  'function getSellRefund(uint256 amount) view returns (uint256)',
  'function getTreasuryStats() view returns (uint256 totalValue, uint256 tokenPrice, uint256 marketCap, uint256 holderCount)',
  'function getAccumulatedDividends(address holder) view returns (uint256)',
  'function treasury() view returns (address)',
  'function totalDeposited() view returns (uint256)',
  'function totalProfitsPerToken() view returns (uint256)',
  'function roleType() view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  // Constants
  'function INITIAL_PRICE() view returns (uint256)',
  'function CURVE_SLOPE() view returns (uint256)',
  'function PROTOCOL_FEE_PERCENT() view returns (uint256)',
  'function TREASURY_PERCENT() view returns (uint256)',
  // Write functions
  'function buyTokens(uint256 minTokensOut) payable',
  'function sellTokens(uint256 amount, uint256 minRefund)',
  'function claimDividends()',
  // Events
  'event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)',
  'event TokensSold(address indexed seller, uint256 amount, uint256 refund)',
  'event ProfitDistributed(uint256 totalProfit, uint256 holdersShare, uint256 buybackAmount)',
  'event DividendClaimed(address indexed holder, uint256 amount)',
] as const

// IdolFactory ABI
export const IDOL_FACTORY_ABI = [
  'function createIdol(string name, string symbol, address idolAgent, address treasuryAddress, string roleType, string personality) payable returns (uint256)',
  'function getIdol(uint256 idolId) view returns (tuple(address token, address treasury, address idolAgent, string name, string symbol, string roleType, string personality, uint256 createdAt, bool active))',
  'function getIdolCount() view returns (uint256)',
  'function getActiveIdols() view returns (tuple(address token, address treasury, address idolAgent, string name, string symbol, string roleType, string personality, uint256 createdAt, bool active)[])',
  'function creationFee() view returns (uint256)',
  'event IdolCreated(uint256 indexed idolId, address indexed token, address indexed treasury, address idolAgent, string name, string symbol, string roleType)',
] as const

// ERC-8004 Agent Identity ABI
export const ERC8004_AGENT_ABI = [
  'function getAgent(uint256 agentId) view returns (tuple(string name, string description, string modelProvider, string modelId, string personality, address operator, bytes32 capabilities, uint256 createdAt, bool active))',
  'function getAgentByOperator(address operator) view returns (tuple(string name, string description, string modelProvider, string modelId, string personality, address operator, bytes32 capabilities, uint256 createdAt, bool active))',
  'function agentIdByOperator(address operator) view returns (uint256)',
  'function hasCapability(uint256 agentId, uint256 cap) view returns (bool)',
  'function getAgentCount() view returns (uint256)',
] as const

/**
 * Get a read-only provider for Injective EVM RPC
 */
export function getReadProvider(): ethers.JsonRpcProvider {
  // Injective EVM JSON-RPC endpoint
  const evmRpc = import.meta.env.VITE_EVM_RPC_URL || 'https://evm.testnet.injective.network'
  return new ethers.JsonRpcProvider(evmRpc)
}

/**
 * Get a signer from the connected wallet (MetaMask / Keplr EVM)
 */
export async function getWalletSigner(): Promise<ethers.BrowserProvider | null> {
  const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
  if (!ethereum) return null
  return new ethers.BrowserProvider(ethereum)
}

/**
 * Get a read-only IdolToken contract instance
 */
export function getIdolTokenContract(address?: string): ethers.Contract {
  const provider = getReadProvider()
  const contractAddress = address || CONTRACT_ADDRESSES.idolToken
  return new ethers.Contract(contractAddress, IDOL_TOKEN_ABI, provider)
}

/**
 * Get a writable IdolToken contract instance (requires connected wallet)
 */
export async function getIdolTokenContractWithSigner(address?: string): Promise<ethers.Contract | null> {
  const browserProvider = await getWalletSigner()
  if (!browserProvider) return null
  
  const signer = await browserProvider.getSigner()
  const contractAddress = address || CONTRACT_ADDRESSES.idolToken
  return new ethers.Contract(contractAddress, IDOL_TOKEN_ABI, signer)
}

/**
 * Get a read-only IdolFactory contract instance
 */
export function getIdolFactoryContract(): ethers.Contract {
  const provider = getReadProvider()
  return new ethers.Contract(CONTRACT_ADDRESSES.idolFactory, IDOL_FACTORY_ABI, provider)
}

/**
 * Formatting helpers
 */
export function formatInj(wei: bigint | string): string {
  return ethers.formatEther(wei)
}

export function parseInj(inj: string): bigint {
  return ethers.parseEther(inj)
}

export function formatTokens(wei: bigint | string, decimals = 18): string {
  return ethers.formatUnits(wei, decimals)
}

export function parseTokens(amount: string, decimals = 18): bigint {
  return ethers.parseUnits(amount, decimals)
}

/**
 * Check if a contract address is deployed (non-zero)
 */
export function isContractDeployed(address: string): boolean {
  return address !== '0x0000000000000000000000000000000000000000' && address !== ''
}

/**
 * Bonding curve math (mirrors Solidity logic for off-chain estimation)
 * IMPORTANT: The contract operates with raw token units (no decimals factor)
 * and INITIAL_PRICE in wei. All integral math must be done in wei-space.
 */
export const BondingCurve = {
  INITIAL_PRICE: 0.001, // INJ (human-readable)
  INITIAL_PRICE_WEI: BigInt('1000000000000000'), // 10^15 wei
  CURVE_SLOPE: 1000,

  /**
   * Calculate price at a given supply (raw token units)
   * Returns price in INJ (human-readable)
   */
  getPriceAtSupply(supply: number): number {
    // price_wei = INITIAL_PRICE_WEI + supply^2 / CURVE_SLOPE
    const priceWei = Number(this.INITIAL_PRICE_WEI) + (supply * supply) / this.CURVE_SLOPE
    return priceWei / 1e18
  },

  /**
   * Curve integral in wei: IP*s + s^3/(3*CS)
   */
  _curveIntegralWei(supply: number): bigint {
    const s = BigInt(Math.floor(supply))
    return this.INITIAL_PRICE_WEI * s + (s * s * s) / (3n * BigInt(this.CURVE_SLOPE))
  },

  /**
   * Generate bonding curve data points for charting
   */
  generateCurvePoints(currentSupply: number, numPoints = 100): Array<{ supply: number; price: number }> {
    const maxSupply = Math.max(currentSupply * 2, 1000)
    const points: Array<{ supply: number; price: number }> = []
    for (let i = 0; i <= numPoints; i++) {
      const supply = Math.floor((maxSupply / numPoints) * i)
      const price = this.getPriceAtSupply(supply)
      points.push({ supply, price })
    }
    return points
  },

  /**
   * Estimate tokens received for a given INJ amount (binary search, matches contract)
   */
  estimateTokensForInj(injAmount: number, currentSupply: number): number {
    const costWei = BigInt(Math.floor(injAmount * 1e18))
    const currentIntegral = this._curveIntegralWei(currentSupply)
    let low = 0
    let high = Math.floor(injAmount / this.INITIAL_PRICE) + 1
    for (let i = 0; i < 64; i++) {
      if (low >= high) break
      const mid = Math.floor((low + high + 1) / 2)
      const midCost = this._curveIntegralWei(currentSupply + mid) - currentIntegral
      if (midCost <= costWei) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    return low
  },

  /**
   * Estimate INJ received for selling tokens (with 5% fee, matches contract)
   */
  estimateInjForTokens(tokenAmount: number, currentSupply: number): number {
    if (tokenAmount <= 0 || currentSupply <= 0) return 0
    const newSupply = Math.max(0, currentSupply - Math.floor(tokenAmount))
    const rawRefundWei = this._curveIntegralWei(currentSupply) - this._curveIntegralWei(newSupply)
    const refundWithFee = (rawRefundWei * 95n) / 100n
    return Number(refundWithFee) / 1e18
  },
}
