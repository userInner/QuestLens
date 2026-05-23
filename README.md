# QuestLens Protocol

A decentralized Physical-World Data Oracle for AI and Web3, on the Injective blockchain.

## What this protocol provides

- **TaskEscrow + ReputationRegistry** smart contracts that custody bounties, accept Worker stakes, settle on verified proofs, and slash on fraud.
- An open **DataRequirement** schema and **Proof** standard so any third party can build a Requester, Worker client, or Relayer node.
- A three-layer **Verification Pipeline** (device-side checks, lightweight AI, deep forensics) that turns "anti-fraud" into a protocol guarantee, not a policy promise.
- A two-phase **Oracle Protocol**: a single SGX-attested node for the MVP, evolving to permissionless optimistic verification with challenge periods.

The protocol layer is exactly four artifacts: the two contracts, the two open standards. Reference implementations (Telegram Mini App worker client, demo frontend) are in this repo as `packages/mini-app` and `packages/demo-frontend`, and are explicitly replaceable.

See `.kiro/specs/questlens-protocol/` for the requirements, design, task plan, and 11 formal correctness properties.

For Demo Day prep, see:
- `docs/pitch-onepager.md` — one-page pitch you can hand to a reviewer
- `docs/demo-day-script.md` — 5-minute live demo script with Q&A predictions
- `docs/backup-video-script.md` — 30-second / 90-second backup video plan

## Repository layout

```
packages/
  contracts/         Solidity contracts + 14 Foundry tests
  schemas/           Open schemas + RFC 8785 canonicalization (8 tests)
  sdk/               @questlens/sdk - typed client over the contracts (4 tests)
  relayer/           Phase 1 verification pipeline + ingest server (19 tests)
  demo-frontend/     React SPA driving the Demo Day golden path
scripts/
  demo-up.sh         start anvil + deploy + relayer + frontend (~4s)
  demo-down.sh       stop everything
  rehearse.sh        full Demo Day rehearsal: happy path + GPS failure injection
  anvil-reset.sh     wipe chain state between scenarios
.kiro/specs/         requirements / design / tasks / 11 correctness properties
```

## Prerequisites

- **Node** >= 20 (tested on 24)
- **pnpm** >= 9 (tested on 11)
- **Foundry** >= 1.0 (tested on 1.5; provides `forge`, `cast`, `anvil`)

## Demo Day quickstart

```bash
# 1. Install dependencies and build the contracts
pnpm install
make build

# 2. Run all unit tests (45 across 4 packages, ~1s)
make test

# 3. Bring up the full demo stack on localhost
make demo-up

# 4. Open the demo frontend
open http://127.0.0.1:5173

# 5. Click "Run golden path" - watch the 5-step progress fill in
#    Click "Inject GPS-out-of-range" - watch L1 reject with distanceM=5560
#    Click "Inject emulator attestation" - watch L1 reject with PLATFORM_ATTEST_FAIL

# 6. Tear down when done
make demo-down
```

## Demo Day rehearsal

Run the full rehearsal whenever you change anything end-to-end. It tears down any running stack, brings it back up cleanly, runs the happy-path smoke (~550ms), runs the failure-injection smoke (GPS out of range), and tears the stack down again. Exits non-zero if any step regresses.

```bash
make rehearse
```

Add this to CI to catch regressions before they land.

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│                Requesters (B-side, permissionless)                   │
│   AI labs · annotation companies · DApps · AI Agents · demo FE       │
└─────────────┬────────────────────────────────────────────────────────┘
              │ createTask (via SDK or raw ABI)
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Protocol Layer (Injective EVM)                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐    │
│  │ TaskEscrow           │◄──►│ ReputationRegistry               │    │
│  │  createTask          │    │  worker reputation (0-100)       │    │
│  │  stakeForTask        │    │  3-strike permanent ban          │    │
│  │  submitProof         │    │  Sybil isolation (subnet, time)  │    │
│  │  slashWorker         │    │  Relayer registry (collateral)   │    │
│  │  claimRefund         │    └──────────────────────────────────┘    │
│  └──────────────────────┘                                            │
└──────────────▲───────────────────────────────────────────────────────┘
               │ submitProof / slashWorker
┌──────────────┴───────────────────────────────────────────────────────┐
│  Relayer Node (Phase 1: Azure SGX; Phase 2: optimistic verification) │
│  Pipeline: L1 device-side → L2 ResNet → L3 Azure forensics           │
└──────────────▲───────────────────────────────────────────────────────┘
               │ Proof v1 (signed bundle)
┌──────────────┴───────────────────────────────────────────────────────┐
│  Worker_Clients (C-side, permissionless)                             │
│  Telegram Mini App (reference) · DePIN hardware · custom apps        │
└──────────────────────────────────────────────────────────────────────┘
```

## What's been verified end to end

| Path | Latency | Guarantee |
|---|---|---|
| Happy path (Requester → Worker → Relayer → settle on-chain) | ~550ms | 0.95 mUSDT to Worker, 0.05 to treasury, stake refunded |
| Layer 1 fraud rejection (GPS 5560m off, allowed 100m) | ~50ms | No on-chain action, stake preserved (R11.3) |
| Layer 1 fraud rejection (emulator attestation token) | ~50ms | No on-chain action, stake preserved |
| Layer 1 fraud rejection (rooted device, mock GPS, sig tampered) | ~50ms | Each path covered by a dedicated test |

## Anti-fraud, demonstrated not promised

The Verification Pipeline is fully unit-tested with 19 cases covering 9 distinct adversarial scenarios:

- valid signature, on-target GPS, fresh timestamp → pass
- tampered signature → `INVALID_SIG`
- payload mutated post-signing → `INVALID_SIG`
- timestamp drift > 120s → `TIMESTAMP_DRIFT`
- GPS > 200m off → `GPS_OUT_OF_RANGE`
- emulator attestation → `PLATFORM_ATTEST_FAIL` (kind=emulator)
- rooted/jailbroken attestation → `PLATFORM_ATTEST_FAIL` (kind=rooted)
- mock-location flag → `MOCK_LOCATION`
- unknown attestation type → `DEVICE_UNSUPPORTED`
- DataRequirement custom radius < 200m → respected
- L2 confidence < 0.3 → reject + slash
- L2 0.3 ≤ conf < 0.7 → escalate to L3
- L3 ELA / moiré / AIGC ≥ 0.85 → reject + slash with specific reason

Run `pnpm --filter @questlens/relayer test` to see all of them in under 300ms.

## License

MIT (placeholder, to be confirmed)
