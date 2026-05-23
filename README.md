# QuestLens Protocol

A decentralized Physical-World Data Oracle for AI and Web3 on the Injective blockchain.

## What this protocol provides

- An on-chain task escrow that locks bounties and routes payments based on verifiable proofs of physical-world data capture.
- A reputation registry with Sybil-resistant cross-validation and slashing.
- An open `DataRequirement` schema and `Proof` standard so any third party can build a Requester, Worker client, or Relayer node.
- An oracle protocol with two phases: a single SGX-attested node (Phase 1) and permissionless optimistic verification (Phase 2).

The protocol layer is exactly four artifacts: the two contracts, the two open standards. Reference implementations (Telegram Mini App worker client, demo frontend) live in the same monorepo as `packages/mini-app` and `packages/demo-frontend`, and are explicitly replaceable.

See `.kiro/specs/questlens-protocol/` for the requirements, design, and task plan.

## Repository layout

```
packages/
  contracts/        Solidity contracts (TaskEscrow, ReputationRegistry) + Foundry tests
  schemas/          DataRequirement and Proof JSON Schemas + canonicalization utilities
  sdk/              @questlens/sdk - TypeScript client library
  relayer/          Phase 1 Azure SGX Relayer Node (verification pipeline)
  mini-app/         Reference Telegram Mini App for workers
  demo-frontend/    Hackathon demo single-page app
```

## Prerequisites

- Node >= 20 (tested on 24)
- pnpm >= 9 (tested on 11)
- Foundry >= 1.0 (tested on 1.5)

## Quick start

```bash
pnpm install
pnpm contracts:build
pnpm contracts:test
```

## Development

Each package has its own README with package-specific instructions. The Demo Day golden path is documented in `packages/demo-frontend/README.md`.

## License

MIT (placeholder, to be confirmed)
