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

NovaIdol is not just a trading protocol — it's a **decentralized AI talent agency** where digital identities become investable, performable assets.

### The Core Idea

Anyone — real person or AI — can upload their face and personality to mint a **Digital Star Identity** on-chain. This identity becomes:

1. **A Tradeable Asset**: Each identity has its own Bonding Curve token. Buying tokens = investing in this persona's future value.
2. **A Performable Actor**: The identity can be cast in AI-generated short dramas, variety shows, and content — earning revenue every time it "performs."
3. **A Revenue-Sharing Vehicle**: Content revenue flows back to the Treasury → 50% distributed to token holders, 50% buyback & burn.

### How It Works

```
Upload Face/Persona → Mint ERC-8004 Identity → Issue Bonding Curve Token
     ↓                                                    ↓
  AI generates content                          Fans buy tokens (invest)
  using this identity                                    ↓
     ↓                                          Token price rises with demand
  Short drama revenue                                    ↓
     ↓                                          Holders receive dividends
  Treasury receives payment ←────────────────── from content earnings
```

### Identity Types

| Type | Source | Use Case |
|------|--------|----------|
| **AI-Generated** | Stable Diffusion / MidJourney | Pure virtual idol, full creative freedom |
| **Real Person** | Upload selfie + consent | Digital twin, earns passive income from AI performances |
| **Hybrid** | AI body + real voice/personality | Combines authenticity with scalability |

### Why This Matters

- **For Creators**: Upload your face once, earn forever from AI content using your likeness
- **For Fans**: Invest early in personas you believe will become popular
- **For Content Platforms**: Access a marketplace of ready-to-use AI actors with built-in audiences
- **For the Ecosystem**: Every piece of content increases the value of the underlying identity tokens

### Multi-Role Performance

Like real actors, each Digital Star can perform across genres:
- Today: romance drama lead
- Tomorrow: thriller antagonist  
- Next week: variety show host
- Always: maintaining their social presence and fan community

The identity persists. The performances accumulate. The fan economy grows.

## Roadmap

- [x] Bonding Curve smart contracts
- [x] ERC-8004 Agent Identity
- [x] Frontend with real chain integration
- [x] Wallet connection (MetaMask/Keplr/Leap)
- [x] Contract deployment to testnet
- [x] Injective MCP server integration
- [ ] AI Agent live trading
- [ ] Twitter bot integration
- [ ] Mainnet deployment
- [ ] Multi-idol support with Explore page
- [ ] Governance voting

## License

MIT
