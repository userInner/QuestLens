# QuestLens Protocol

> The decentralized Physical-World Data Oracle for AI and Web3.

**QuestLens is not an app. It is a base-layer protocol.**

Any AI Agent, any DApp, any data company can call QuestLens to commission humans to go to a specific GPS coordinate, photograph something, and submit cryptographically-signed proof — with on-chain settlement in stablecoins on Injective.

---

## Protocol Scope — Exactly Four Artifacts

QuestLens Protocol is defined by four normative artifacts. Anything else (Telegram Mini App, demo frontend, gamification UX) is a replaceable reference implementation.

| # | Artifact | What it does |
|---|---|---|
| 1 | **On-chain Contracts** | `TaskEscrow` + `ReputationRegistry` on Injective EVM. Custody bounties, accept stakes, settle on verified proofs, slash on fraud. Callable by any address without permission. |
| 2 | **DataRequirement Schema** | Public JSON Schema (v1) describing what a Requester wants: target GPS, radius, time window, category. Identified on-chain by `keccak256` of its RFC 8785 canonical form. |
| 3 | **Proof Standard** | Public JSON Schema (v1) defining the evidence bundle a Worker submits: image hash, GPS, timestamp, platform attestation, ECDSA-P256 hardware signature. Any conforming device can produce it. |
| 4 | **Oracle Protocol** | Rules under which Relayer Nodes verify proofs and attest results on-chain. Phase 1: single Azure SGX node. Phase 2: permissionless optimistic verification with 24h challenge periods. |

**The test**: if a third party can build their own Requester, their own Worker client, and their own Relayer node using only published standards and contract ABIs — without asking us for permission — then it's a protocol. QuestLens passes this test.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Requesters (permissionless)                           │
│   AI Labs · Data Annotation Companies · DApps · AI Agents               │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ createTask (via SDK or raw ABI)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Protocol Layer — Injective EVM                                          │
│                                                                          │
│  ┌─────────────────────────┐      ┌────────────────────────────────┐     │
│  │      TaskEscrow         │◄────►│     ReputationRegistry         │     │
│  │                         │      │                                │     │
│  │  • createTask           │      │  • Reputation score (0-100)    │     │
│  │  • stakeForTask         │      │  • 3-strike permanent ban      │     │
│  │  • submitProof          │      │  • Sybil isolation rules       │     │
│  │  • slashWorker          │      │  • Relayer node registry       │     │
│  │  • claimRefund          │      │  • Cross-validation weights    │     │
│  └─────────────────────────┘      └────────────────────────────────┘     │
│                  ▲                                                        │
└──────────────────┼────────────────────────────────────────────────────────┘
                   │ submitProof / slashWorker
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│  Relayer Nodes (Oracle Protocol)                                          │
│                                                                           │
│  Phase 1: Single Azure SGX node (tamper-proof, attestation-verified)      │
│  Phase 2: Permissionless — 100 USDT collateral, 24h challenge period      │
│                                                                           │
│  Verification Pipeline:                                                   │
│    Layer 1 (zero cost)  → Device signature + GPS + timestamp + attestation│
│    Layer 2 (low cost)   → ResNet image classification                     │
│    Layer 3 (on dispute) → Azure ELA + moiré + AIGC detection              │
└──────────────────▲────────────────────────────────────────────────────────┘
                   │ Proof v1 (P-256 signed bundle)
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│  Worker Clients (permissionless)                                          │
│                                                                           │
│  Telegram Mini App (reference) · DePIN hardware · Any custom client       │
│  Output: Proof conforming to the Proof Standard                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Task Lifecycle

```
Requester                    TaskEscrow              Worker              Relayer
   │                              │                    │                    │
   │── createTask(1 USDT, DR) ──►│                    │                    │
   │                              │ status: Created    │                    │
   │                              │                    │                    │
   │                              │◄── stakeForTask ───│ lock 0.1 USDT     │
   │                              │ status: Accepted   │                    │
   │                              │ deadline = now+1h  │                    │
   │                              │                    │                    │
   │                              │                    │── Proof (POST) ──►│
   │                              │                    │                    │ L1 ✓
   │                              │                    │                    │ L2 ✓
   │                              │                    │                    │
   │                              │◄──── submitProof ──────────────────────│
   │                              │                    │                    │
   │                              │── 0.95 USDT ──────►│                    │
   │                              │── 0.1 stake back ─►│                    │
   │                              │── 0.05 fee ──────► treasury            │
   │                              │ status: Settled    │                    │
```

---

## Anti-Fraud: Three-Layer Verification Pipeline

The protocol enforces anti-fraud at the infrastructure level — not as a policy, but as code that every Relayer must execute.

| Layer | Cost | What it checks | On failure |
|---|---|---|---|
| **L1 — Device-side** | Zero | Hardware signature (P-256), GPS within radius, timestamp ≤120s drift, platform attestation (Play Integrity / DeviceCheck), no emulator/root/mock-GPS | **Reject, no slash** (worker keeps stake) |
| **L2 — Lightweight AI** | Very low | ResNet classification: does the photo match the task category? | Confidence <0.3 → **reject + slash**; 0.3–0.7 → escalate to L3 |
| **L3 — Deep Forensics** | Capped at 0.10 USDT | Azure ELA (edit detection), moiré (screen re-photography), AIGC (AI-generated fakes) | Any check ≥0.85 confidence → **reject + slash** |

**Funnel economics**: 90%+ of garbage is caught at L1 (free). L3 only fires on disputes or high-value tasks (>1 USDT). This prevents "DDoS by spam images" from blowing up API costs.

### 9 Adversarial Scenarios — All Unit-Tested

| Attack | Protocol response | Reason code |
|---|---|---|
| Signature tampered | L1 reject, no slash | `INVALID_SIG` |
| Payload mutated post-signing | L1 reject, no slash | `INVALID_SIG` |
| Timestamp drift >120s | L1 reject, no slash | `TIMESTAMP_DRIFT` |
| GPS >200m from target | L1 reject, no slash | `GPS_OUT_OF_RANGE` |
| Android emulator | L1 reject, no slash | `PLATFORM_ATTEST_FAIL` |
| Rooted / jailbroken device | L1 reject, no slash | `PLATFORM_ATTEST_FAIL` |
| Fake-GPS app active | L1 reject, no slash | `MOCK_LOCATION` |
| Irrelevant photo content | L2 reject, **slash 0.1 USDT** | `IRRELEVANT_CONTENT` |
| Photoshop / AIGC fake | L3 reject, **slash 0.1 USDT** | `IMAGE_TAMPERED` / `AI_GENERATED` |

---

## Economic Model (MVP)

| Parameter | Value | Governance-controlled |
|---|---|---|
| Task bounty range | 0.5 – 2.0 USDT | ✓ |
| Worker stake per task | 0.1 USDT | ✓ |
| Protocol fee | 5% of bounty | ✓ |
| Slash distribution | 50% reward pool + 50% treasury | ✓ |
| Task acceptance timeout | 72 hours (no one accepts → refund) | ✓ |
| Submission deadline | 1 hour (after staking) | ✓ |
| Reputation: initial score | 50 / 100 | ✓ |
| Reputation: +1 per completion | capped at 100 | ✓ |
| Reputation: -10 per slash | floored at 0 | ✓ |
| Permanent ban threshold | 3 slashes | ✓ |
| Phase 2 Relayer collateral | 100 USDT | ✓ |
| Phase 2 challenge period | 24 hours | ✓ |

---

## Competitive Differentiation

| Dimension | Scale AI / Toloka (Web2) | QuestLens Protocol |
|---|---|---|
| **Data attribute** | Static — label existing images | **Dynamic** — go to a GPS coordinate and photograph NOW |
| **Organization** | Centralized dispatch, full/part-time outsourcing teams | **Permissionless** — anyone walking by can earn |
| **Settlement** | Fiat, T+7 to T+30, cross-border friction | **Stablecoin, instant**, 0.5 USDT cross-border with zero friction |
| **Anti-fraud** | Manual review (slow, expensive, opaque) | **Protocol-enforced** 3-layer pipeline with on-chain slashing |
| **Extensibility** | Closed API, vendor lock-in | **Open standards** — any client, any Relayer, any Requester |

---

## Relayer Decentralization Roadmap

| Phase | Trust model | How it works |
|---|---|---|
| **Phase 1 (current)** | Centralized but tamper-proof | Single Relayer in Azure SGX (TEE). Code execution is attestation-verified — anyone can fetch the MRENCLAVE hash and validate the enclave report. Honest about centralization, but provably non-tamperable. |
| **Phase 2 (governance-activated)** | Permissionless optimistic verification | Any address stakes 100 USDT → becomes an active Relayer. Results enter a 24h challenge window. If challenged (10 USDT bond), DAO arbitration resolves within 48h. Malicious Relayer loses 100% collateral; frivolous challenger loses bond. |

The Phase 1 → Phase 2 transition is a **single governance parameter flip** — no contract upgrade, no data migration. The storage layout already supports both modes.

---

## Formal Correctness Properties

The protocol's invariants are not just documented — they are **machine-verified** by Foundry's invariant fuzzer (4096 random call sequences per property, 0 reverts):

| Property | What it guarantees |
|---|---|
| **Balance conservation** | Escrow balance ≡ Σ locked budgets + Σ locked stakes at all times |
| **Single worker** | Every Accepted task has exactly one assigned worker |
| **Settlement atomicity** | Worker receives exactly 95% + stake; treasury receives exactly 5% |
| **Slash conservation** | Reward pool + treasury receive exactly 100% of forfeited stake |
| **Reputation bounds** | Score always in [0, 100]; banned ⟹ cheats ≥ 3 |
| **Authorization soundness** | Only active Relayers can call submitProof / slashWorker |

Run `make invariant` to verify these yourself in ~600ms.

---

## Repository Structure

```
packages/
  contracts/          Solidity (TaskEscrow + ReputationRegistry) — 14 unit + 5 invariant tests
  schemas/            DataRequirement v1 + Proof v1 schemas, RFC 8785 canonicalization — 8 tests
  sdk/                @questlens/sdk TypeScript client library — 4 unit tests + e2e smokes
  relayer/            Verification Pipeline (L1/L2/L3) + Fastify ingest server — 19 tests
  demo-frontend/      React platform UI (Requester + Worker marketplace)
scripts/
  demo-up.sh          One-shot: anvil + deploy + relayer + frontend (~4s)
  demo-down.sh        Clean shutdown
  rehearse.sh         Full Demo Day rehearsal (happy path + failure injection)
  anvil-reset.sh      Wipe chain state between scenarios
docs/
  pitch-onepager.md   One-page pitch for reviewers
  demo-day-script.md  5-minute live demo script with Q&A predictions
.kiro/specs/
  questlens-protocol/ Requirements (18) + Design (6 components, 11 properties) + Tasks (10 waves)
```

---

## Quick Start

### Prerequisites

- **Node** ≥ 20
- **pnpm** ≥ 9
- **Foundry** ≥ 1.0 (`forge`, `cast`, `anvil`)

### Run everything locally

```bash
git clone git@github.com:userInner/QuestLens.git
cd QuestLens
pnpm install
make build

# Run all tests (50 unit + 5 invariant, <2s)
make test

# Boot the full platform on localhost
make demo-up
# → anvil :8545, relayer :3000, frontend :5173

# Open the platform
open http://127.0.0.1:5173

# Run the Demo Day rehearsal (happy path + GPS failure injection)
make rehearse

# Run formal invariant verification
make invariant

# Stop everything
make demo-down
```

### What you'll see in the browser

- **Landing** (`/`) — Protocol KPIs + how-it-works
- **Browse tasks** (`/worker`) — Open task marketplace with map, bounty, distance, category filter
- **Post task** (`/requester`) — Map picker + form → locks bounty on-chain
- **Task detail** — Stake → Capture → Submit → watch the Relayer verdict arrive in real-time
- **Failure injection buttons** — GPS spoof and emulator attestation to demo L1 rejection live

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.26, Foundry, OpenZeppelin v5 |
| Chain | Injective EVM (testnet), anvil for local dev |
| Schemas | JSON Schema Draft 2020-12, RFC 8785 (JCS), keccak256 |
| Signatures | ECDSA over secp256r1 (P-256) via hardware secure elements |
| Relayer | Node.js + Fastify, Azure SGX (Phase 1), ONNX Runtime (L2 model) |
| SDK | TypeScript, ethers v6, published as `@questlens/sdk` |
| Frontend | React 18, Vite, React Router, Leaflet (OpenStreetMap) |
| CI | GitHub Actions (Foundry + pnpm test on every push) |

---

## Status

- ✅ Protocol contracts deployed and tested (14 unit + 5 invariant)
- ✅ Three-layer Verification Pipeline operational (19 adversarial tests)
- ✅ TypeScript SDK with `createTask` / `stakeForTask` / `listTasks` / `getTaskResult`
- ✅ Full marketplace UI (Requester posts + Worker browses/accepts/submits)
- ✅ One-shot demo bootstrap (`make demo-up` in 4 seconds)
- ✅ End-to-end verified: happy path ~550ms, GPS rejection ~50ms
- ⏳ Phase 1 hardening: real Azure SGX deployment, ERC-4337 paymaster, Telegram Mini App
- ⏳ Phase 2: permissionless Relayer registration, challenge periods, DAO arbitration

---

## License

MIT
