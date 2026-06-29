# NovaIdol Protocol

**Your Face, Your Asset. — AI Virtual Stars × Bonding Curve × Injective**

NovaIdol is a decentralized AI talent agency where anyone — real person or AI — can upload a likeness, mint an on-chain identity, issue a token, and earn revenue from AI-generated short dramas. Token holders share profits automatically.

> GitHub: https://github.com/userInner/QuestLens  
> Network: Injective EVM Testnet (Chain ID 1439)  
> Explorer: https://testnet.blockscout.injective.network/

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                         │
│  Upload Face → Mint Idol → Buy/Sell → K-Line → License → Claim   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ ethers.js + EVM RPC
┌──────────────────────────▼───────────────────────────────────────┐
│                Injective EVM Testnet (Chain ID 1439)               │
│                                                                    │
│ ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────────┐ │
│ │ IdolToken  │ │IdolFactory │ │ERC8004Agent │ │IdolLicensing  │ │
│ │(Bonding    │ │(Create new │ │(AI Identity │ │(Usage Rights  │ │
│ │ Curve)     │ │ idols)     │ │ NFT)        │ │ 10/20/50%)   │ │
│ └────────────┘ └────────────┘ └─────────────┘ └───────────────┘ │
│ ┌────────────────────┐ ┌──────────────────┐                      │
│ │  IdolLifecycle     │ │  IdolGovernance  │                      │
│ │  (State Machine)   │ │  (Voting)        │                      │
│ └────────────────────┘ └──────────────────┘                      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Events + Function Calls
┌──────────────────────────▼───────────────────────────────────────┐
│                     Backend (Express + TypeScript)                  │
│  Image Upload API → Save to /public/idols/{symbol}/avatar.png     │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                  AI Agent (TypeScript + DeepSeek)                   │
│  ERC-8004 Identity Verification → Tool Calling → Mood System      │
│  Market Analysis → Trade Execution → Tweet Generation             │
│  MCP Server → Injective DEX Real-time Data                        │
└──────────────────────────────────────────────────────────────────┘
```

## Key Features

**Core**
- **Face = Asset** — Upload any likeness (AI or real person), mint on-chain identity, issue Bonding Curve token
- **Bonding Curve Trading** — Price rises automatically as supply grows; early fans are rewarded
- **Likeness Licensing** — Hold 10% for community use, 20% for commercial AI dramas, 50% for exclusive rights
- **Profit Sharing** — AI drama revenue → Treasury → 50% dividends to holders, 50% buyback & burn

**AI Agent**
- **Autonomous Decision-Making** — DeepSeek v4-flash with function calling, chooses actions autonomously
- **Mood System** — 7 emotional states (euphoric/excited/neutral/cautious/stressed/rebellious/bored) affect trading behavior
- **ERC-8004 Verification** — Agent verifies on-chain identity and capabilities before operating
- **Tool Registry** — check_price, check_balance, open_trade, generate_tweet, wait

**Governance**
- **Token-Weighted Voting** — Holders vote on strategy, risk parameters, personality tweaks
- **Idol Lifecycle** — Newborn → Growth → Star → Retired (auto-transitions based on treasury/holders)

**Frontend**
- **i18n** — Full English/Chinese localization (180+ keys)
- **Real-time Chain Data** — All displayed data from on-chain (no mock)
- **Demo Story Page** — 6-step flywheel walkthrough with real tx hashes

## Deployed Contracts (Injective EVM Testnet)

| Contract | Address |
|----------|---------|
| ERC8004Agent | `0x2fBD5e8e8Ac49E1473A611d4D692d7FcD2283B1A` |
| IdolFactory (v2, no limit) | `0x4f5c4409710567565A1f12806Aee05B1827F9Ba4` |
| Vivian Token (IdolToken) | `0x65aa80FdD8014F36Cb6D13C40fD6F4167d956827` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chain | Injective EVM (Cosmos SDK + EVM compatible) |
| Contracts | Solidity 0.8.20, OpenZeppelin v5, Foundry |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Backend | Express, TypeScript, Sharp (image processing) |
| Wallet | MetaMask (EVM signing on Chain ID 1439) |
| AI Agent | DeepSeek v4-flash, Function Calling, Mood System |
| State | Zustand (persist) |
| MCP | Injective MCP Server (market data + trading) |
| i18n | Custom hook + JSON (EN/ZH) |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Foundry (for contracts)
- MetaMask

### Install & Run

```bash
# Clone
git clone https://github.com/userInner/QuestLens.git
cd QuestLens

# Install all packages
pnpm install
pnpm approve-builds  # approve sharp native build

# Run frontend (port 5173)
cd packages/frontend
pnpm dev

# Run backend (port 3456) — handles image uploads
cd packages/backend
npx tsx src/index.ts

# Run AI Agent (optional)
cd packages/agent
npx tsx src/index.ts       # demo mode (2 cycles)
npx tsx src/index.ts loop  # continuous mode
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
├── contracts/              # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── IdolToken.sol         # Bonding curve ERC-20 with dividends
│   │   ├── IdolFactory.sol       # Factory for creating new idols
│   │   ├── ERC8004Agent.sol      # AI agent identity NFT
│   │   ├── IdolLicensing.sol     # Token-gated usage rights (10/20/50%)
│   │   ├── IdolLifecycle.sol     # State machine (Newborn→Growth→Star→Retired)
│   │   └── IdolGovernance.sol    # Token-weighted voting
│   └── script/Deploy.s.sol
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/                # Home, Explore, Create, IdolDetail, Portfolio, Agent, Demo, Profile
│   │   ├── hooks/                # useWallet, useIdolToken, useTrade, useCreateIdol, useExplore, useAgentIdentity
│   │   ├── services/contract.ts  # ABI, providers, BondingCurve math
│   │   ├── components/           # Header, IdolAnime, Chart, Trade, Treasury, ClaimDividends
│   │   ├── i18n/                 # EN/ZH translations (180+ keys)
│   │   ├── data/idols.ts         # Multi-idol registry
│   │   └── store/                # Zustand wallet store
│   └── public/idols/             # Idol avatar images
├── backend/                # Express API server
│   └── src/
│       ├── index.ts              # Server entry (port 3456)
│       └── routes/               # /api/upload/avatar, /api/idol
└── agent/                  # AI Agent service
    └── src/
        ├── index.ts              # Entry point (demo/loop modes)
        ├── agent/
        │   ├── AgentLoop.ts      # Main autonomous loop
        │   ├── mood.ts           # 7-state mood system
        │   ├── tools.ts          # Tool registry (5 tools)
        │   ├── identity.ts       # ERC-8004 on-chain verification
        │   └── logger-file.ts    # Write activity to frontend log
        ├── services/ai.ts        # DeepSeek API integration
        └── config/index.ts       # Environment configuration
```

## Security

- **Checkpoint-based dividends** — prevents double-claim attacks
- **Protocol fee isolation** — sell liquidity protected from owner withdrawal
- **Binary search pricing** — exact bonding curve calculation (128 iterations)
- **Pausable** — emergency stop for all trading functions
- **Daily trade limits** — max 5 trades/day, max 20% of treasury per trade
- **ReentrancyGuard** — on all state-changing functions
- **License auto-revoke** — if holder sells below tier threshold, license invalidates

## The Flywheel

```
Upload Face → Mint Token → Fans Buy In → AI Drama Revenue → 
Dividends to All Holders → Token Price Rises → More Fans → ...
```

1. Creator uploads likeness → mints ERC-8004 identity + Bonding Curve token
2. Fans buy tokens → 80% to Treasury, 20% protocol fee
3. AI Agent manages treasury → trades on Injective DEX
4. Producers hold 20%+ → acquire commercial license → cast idol in AI dramas
5. Drama revenue → `distributeProfits()` → 50% holder dividends, 50% buyback & burn
6. Token price rises via bonding curve → more fans buy in → flywheel accelerates

## Vision: AI Virtual Stars Economy

NovaIdol transforms digital identities into investable, performable assets:

- **Fixed Identity** — Each idol has permanent name, appearance, personality (ERC-8004 on-chain)
- **Multi-Role Performance** — Same persona acts across genres: romance, thriller, variety show
- **Social Presence** — AI generates daily content (thoughts, trades, memes, lifestyle)
- **Fan Economy** — Holding tokens = being a fan + investor; governance = fan engagement
- **Licensing Model** — Hold 10% for community use, 20% for commercial AI dramas, 50% exclusive

### Identity Types

| Type | Source | Use Case |
|------|--------|----------|
| AI-Generated | Stable Diffusion / MidJourney | Pure virtual idol |
| Real Person | Upload selfie + consent | Digital twin, passive income |
| Hybrid | AI body + real voice | Authenticity + scalability |

## Roadmap

- [x] Bonding Curve smart contracts (with security audit)
- [x] ERC-8004 Agent Identity
- [x] Frontend with real chain integration
- [x] Wallet connection (MetaMask)
- [x] Contract deployment to testnet
- [x] Injective MCP server integration
- [x] AI Agent with tools + mood system + ERC-8004 verification
- [x] Agent Dashboard (real-time activity log)
- [x] Idol Lifecycle state machine
- [x] Governance voting contracts
- [x] Likeness Licensing (10/20/50% tiers)
- [x] Image upload flow (Create → Backend → public/idols/)
- [x] Multi-idol registry
- [x] i18n (EN/ZH)
- [x] Demo Story page (full flywheel walkthrough)
- [x] Idol Profile page (timeline, roles, fan tiers)
- [ ] IPFS image storage (production)
- [ ] Twitter bot live integration
- [ ] Mainnet deployment
- [ ] AI drama content generation pipeline

## License

MIT
