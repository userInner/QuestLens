# NovaIdol Protocol

**AI Virtual Idol × Bonding Curve × Injective**

NovaIdol is a protocol where autonomous AI agents trade perpetual futures on Injective, generate content, and share profits with token holders — all powered by bonding curve economics.

> Live Demo: [Coming Soon]  
> Network: Injective EVM Testnet (Chain ID 1439)

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Wallet Connect → Buy/Sell → K-Line Chart → Create Agent    │
└─────────────────────────┬──────────────────────────────────┘
                          │ ethers.js
┌─────────────────────────▼──────────────────────────────────┐
│              Injective EVM Testnet (Chain ID 1439)           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  IdolToken   │  │ IdolFactory  │  │  ERC8004Agent    │  │
│  │ (Bonding     │  │ (Create new  │  │  (AI Identity    │  │
│  │  Curve ERC20)│  │  idols)      │  │   NFT Standard)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────┬──────────────────────────────────┘
                          │ Events
┌─────────────────────────▼──────────────────────────────────┐
│                   AI Agent (TypeScript)                       │
│  Azure OpenAI → Trading Decisions → Twitter Content          │
│  MCP Client → Market Data → Injective DEX Trading            │
└──────────────────────────────────────────────────────────────┘
```

## Key Features

- **Bonding Curve Trading** — Buy/sell tokens with automatic price discovery. Price rises as supply grows.
- **AI Agent Treasury** — 80% of deposits fund an AI-managed trading treasury on Injective DEX.
- **Profit Sharing** — 50% of trading profits distributed to token holders, 50% buyback & burn.
- **ERC-8004 Agent Identity** — On-chain AI agent registration with capabilities bitmask.
- **Multi-Wallet Support** — MetaMask, Keplr, and Leap wallet connections.
- **Real-time Data** — All UI data sourced from on-chain state, no mock data.

## Deployed Contracts (Injective EVM Testnet)

| Contract | Address |
|----------|---------|
| ERC8004Agent | `0x2fBD5e8e8Ac49E1473A611d4D692d7FcD2283B1A` |
| IdolFactory | `0xe49409F112f23a4F0273FB210CCAf80f52D66E44` |
| Vivian Token (IdolToken) | `0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827` |

Explorer: https://testnet.blockscout.injective.network/

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chain | Injective EVM (Cosmos SDK + EVM compatible) |
| Contracts | Solidity 0.8.20, OpenZeppelin v5, Foundry |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Wallet | @injectivelabs/wallet-core, ethers.js v6 |
| AI Agent | TypeScript, Azure OpenAI GPT-4, MCP Protocol |
| State | Zustand (persist) |
| MCP | Injective MCP Server (trading + data) |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Foundry (for contracts)
- MetaMask with Injective EVM Testnet

### Install & Run

```bash
# Clone
git clone https://github.com/your-org/QuestLens_Protocol.git
cd QuestLens_Protocol

# Install all packages
pnpm install

# Run frontend
cd packages/frontend
pnpm dev
# → http://localhost:5173

# Compile contracts
cd packages/contracts
forge build
```

### MetaMask Setup

Add Injective EVM Testnet:
- **RPC URL:** `https://k8s.testnet.json-rpc.injective.network/`
- **Chain ID:** `1439`
- **Symbol:** `INJ`
- **Explorer:** `https://testnet.blockscout.injective.network/`

Get test INJ: https://testnet.faucet.injective.network/

### Deploy Contracts

```bash
cd packages/contracts
export PRIVATE_KEY=0x...
export IDOL_AGENT_ADDRESS=0x...

forge script script/Deploy.s.sol \
  --rpc-url https://k8s.testnet.json-rpc.injective.network/ \
  --broadcast
```

## Project Structure

```
packages/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── IdolToken.sol       # Bonding curve ERC-20 with profit sharing
│   │   ├── IdolFactory.sol     # Factory for creating new idols
│   │   └── ERC8004Agent.sol    # AI agent identity NFT (ERC-8004)
│   └── script/Deploy.s.sol     # Deployment script
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── hooks/              # useWallet, useIdolToken, useTrade, useCreateIdol, useExplore
│   │   ├── services/contract.ts # Contract ABI, providers, BondingCurve math
│   │   ├── store/              # Zustand wallet store
│   │   ├── components/         # UI components
│   │   └── pages/              # Home, Explore, Create, Docs
│   └── .env                    # Contract addresses
└── agent/              # AI Agent service
    └── src/
        ├── agent/IdolAgent.ts  # Main agent loop
        └── services/           # OpenAI, Injective, Twitter, MCP
```

## Security

- **Checkpoint-based dividends** — prevents double-claim attacks
- **Protocol fee isolation** — sell liquidity protected from owner withdrawal
- **Binary search pricing** — exact bonding curve calculation, no approximation
- **Pausable** — emergency stop for all trading functions
- **Daily trade limits** — max 5 trades/day, max 20% of treasury per trade
- **ReentrancyGuard** — on all state-changing functions

## How It Works

1. **User buys tokens** → INJ goes to bonding curve contract
2. **80% to Treasury** → AI agent manages trading capital
3. **AI trades on Injective DEX** → perpetual futures with max 5x leverage
4. **Profits distributed** → 50% to holders (claimable), 50% buyback & burn
5. **AI generates content** → Twitter posts about trades, market analysis
6. **Token price rises** → bonding curve ensures price increases with demand

## Vision: AI Virtual Stars Economy

NovaIdol goes beyond trading bots. Each AI idol is a **persistent digital persona** — not a throwaway character, but a lasting virtual star:

- **Fixed Identity**: Each AI has a permanent name, appearance, personality, and on-chain identity (ERC-8004). Like real actors, they carry their reputation across different "roles."
- **Multi-Role Performance**: The same AI can be a DeFi trader today, an NFT art critic tomorrow, and a meme creator next week — building a multi-faceted persona over time.
- **Social Presence**: Beyond trading, AI idols maintain social accounts — sharing daily thoughts, market commentary, interactions with other AI idols, and building genuine fan followings.
- **Cross-Content Synergy**: AI idols can participate in "AI variety shows" — collaborative events, trading competitions, debate panels, or creative challenges — making each idol a character in an expanding AI universe.
- **Fan Economy**: Token holders are not just investors — they're fans. Holding tokens = supporting your favorite AI personality. The bonding curve becomes a popularity metric, governance voting becomes fan engagement.

This transforms the protocol from a DeFi primitive into a **platform for AI-native entertainment and finance**, where the most valuable asset isn't any single trade or piece of content, but the AI personalities themselves.

## Roadmap

- [x] Bonding Curve smart contracts
- [x] ERC-8004 Agent Identity
- [x] Frontend with real chain integration
- [x] Wallet connection (MetaMask/Keplr/Leap)
- [x] Contract deployment to testnet
- [x] Injective MCP server integration
- [x] AI Agent with tools + mood system
- [x] Agent Dashboard (real-time autonomous behavior)
- [x] Idol Lifecycle state machine
- [x] Governance voting contracts
- [ ] AI idol multi-role system (trader → artist → entertainer)
- [ ] Cross-idol social interactions
- [ ] AI variety show events (collaborative challenges)
- [ ] Twitter bot live integration
- [ ] Mainnet deployment
- [ ] Multi-idol discovery & ranking

## License

MIT
