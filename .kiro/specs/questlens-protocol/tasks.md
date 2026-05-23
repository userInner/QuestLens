# Implementation Plan

## Overview

This plan is sequenced to deliver the Hackathon Demo Golden Path (Requirement 18) end-to-end first, then layer in the remaining protocol features. Each task is scoped so a single engineer can complete it in one sitting and verify it against named requirements.

Phase markers:
- **[D]** Demo Day critical path (must work for the 120-second golden path)
- **[P1]** Phase 1 protocol completeness (post-demo, pre-mainnet)
- **[P2]** Phase 2 decentralization features (post-launch, governance-gated)

## Tasks

## 1. Repository and Environment Setup

- [ ] 1.1 Initialize monorepo with workspaces for contracts, relayer, sdk, mini-app, and demo-frontend **[D]**
  - Create root `package.json` with pnpm workspaces or Turborepo
  - Add shared TypeScript config and ESLint rules
  - Add `.editorconfig` and `.gitignore`
  - _Validates: foundational scaffolding_

- [ ] 1.2 Add Foundry and Hardhat configs for the contracts workspace **[D]**
  - `foundry.toml` with Injective EVM-compatible profile
  - `hardhat.config.ts` for deployment scripts
  - Add OpenZeppelin contracts as dependency (ERC20 interfaces)
  - _Validates: Requirements 1, 6_

- [ ] 1.3 Set up Injective testnet RPC and deployer wallet **[D]**
  - Document RPC URL and chain ID in `.env.example`
  - Create deployer key generator script (testnet only)
  - Fund deployer with testnet INJ from faucet
  - _Validates: Requirement 18_

## 2. Smart Contracts: TaskEscrow

- [ ] 2.1 Implement `TaskEscrow` storage layout and `Parameters` struct **[D]**
  - Define `TaskStatus` enum, `Task` struct, `Parameters` struct as in design
  - Implement constructor that sets governance address and initial parameters
  - Add governance-only `setParameters` function
  - _Validates: Requirements 1, 15_

- [ ] 2.2 Implement `createTask` with budget validation and ERC20 lock **[D]**
  - Validate budget is in [minBounty, maxBounty]
  - Pull stablecoin via `transferFrom` (requires prior approval)
  - Assign taskId, set status to `Created`, emit `TaskCreated`
  - Write Foundry tests for happy path, out-of-range, insufficient allowance
  - _Validates: Requirement 1_

- [ ] 2.3 Implement `stakeForTask` with worker assignment and deadline **[D]**
  - Lock 0.1 USDT from caller via `transferFrom`
  - Reject if status is not `Created` or worker is banned (call ReputationRegistry)
  - Set `worker`, `acceptedAt`, transition to `Accepted`, emit `TaskAccepted`
  - Foundry tests for happy path, double-stake rejection, banned worker rejection
  - _Validates: Requirement 3_

- [ ] 2.4 Implement `submitProof` with settlement math and `Settled` event **[D]**
  - Add `onlyActiveRelayer` modifier reading from ReputationRegistry
  - Compute `paidToWorker = budget * 95 / 100`, `protocolFee = budget - paidToWorker`
  - Transfer paidToWorker + workerStake to worker, protocolFee to treasury
  - Set status to `Settled`, emit `Settled`
  - Reject if status not `Accepted` (or `PendingFinalization` in Phase 2)
  - Foundry tests for happy path, unauthorized caller, double-settle rejection
  - _Validates: Requirement 4_

- [ ] 2.5 Implement `slashWorker` with split distribution and reputation hook **[D]**
  - `onlyActiveRelayer` modifier
  - Transfer 0.05 USDT to reward pool, 0.05 USDT to treasury
  - Call `ReputationRegistry.recordSlash(worker)`
  - Reset task status to `Created` (clear `worker`, `acceptedAt`)
  - Emit `Slashed`
  - Foundry tests covering full slash distribution and task reopening
  - _Validates: Requirement 5_

- [ ] 2.6 Implement `claimRefund` for both timeout paths **[D]**
  - Branch 1: status `Created` AND `now - createdAt >= 72h`, refund full budget
  - Branch 2: status `Accepted` AND `now - acceptedAt >= 1h`, refund full budget AND slash worker stake (call internal slash flow, attribute to TIMEOUT reason)
  - Reject if neither timeout met
  - Reject if caller != requester
  - Foundry tests for all four branches plus negative cases
  - _Validates: Requirement 2_

- [ ] 2.7 Add `challengeResult` and `resolveChallenge` (Phase 2 stubs, parameter-gated) **[P2]**
  - Implement state transition to `PendingFinalization` in `submitProof` when Phase 2 flag is on
  - Add 24h challenge window logic
  - `challengeResult` accepts 10 USDT bond, freezes finalization
  - `resolveChallenge` is governance-only, applies R13.5/R13.6 outcomes
  - _Validates: Requirement 13_

- [ ] 2.8 Add reentrancy guards and access control unit tests **[P1]**
  - Apply `nonReentrant` modifier to all state-mutating external functions
  - Test attempted reentrancy from a malicious ERC20 callback
  - Test all `onlyActiveRelayer` and `onlyGovernance` paths reject unauthorized callers
  - _Validates: Property 6_

## 3. Smart Contracts: ReputationRegistry

- [ ] 3.1 Implement `WorkerReputation` and `RelayerInfo` storage **[D]**
  - Define structs and mappings as in design
  - Initialize new workers to `reputationScore = 50` lazily on first `registerWorker` call
  - _Validates: Requirements 6, 8_

- [ ] 3.2 Implement `registerWorker`, `recordCompletion`, `recordSlash` **[D]**
  - `registerWorker` is idempotent and stores deviceFingerprint and ipSubnet hashes
  - `recordCompletion` and `recordSlash` are `onlyTaskEscrow`
  - Cap reputationScore at 100, floor at 0
  - Set `banned = true` when `cheatingCount >= 3`
  - Foundry tests for monotonicity, ban activation, score bounds
  - _Validates: Requirements 6, Property 5_

- [ ] 3.3 Implement `registerRelayer`, `withdrawRelayer`, `getRelayer` **[D]**
  - Phase 1: accept zero-collateral registration via governance bootstrap call
  - Phase 2: enforce 100 USDT minimum collateral
  - Store `attestationUrl` and `RelayerStatus`
  - `withdrawRelayer` returns collateral and sets status to `Withdrawn`
  - _Validates: Requirements 8, 13_

- [ ] 3.4 Implement `isEligibleAsCrossValidator` view function **[P1]**
  - Implement the three-rule check (device fingerprint, IP subnet, 48h registration window)
  - Return `(bool, bytes32 reason)` for off-chain consumption by Relayer assignment logic
  - Foundry tests for each rejection condition
  - _Validates: Requirement 7, Property 8_

## 4. DataRequirement Schema

- [ ] 4.1 Author and publish `dataRequirement/v1.json` JSON Schema **[D]**
  - Write schema file matching design Component 3
  - Host at `https://schema.questlens.io/dataRequirement/v1.json` (or temporary GitHub Pages for demo)
  - _Validates: Requirement 9_

- [ ] 4.2 Implement RFC 8785 canonicalization + keccak256 utility in TypeScript **[D]**
  - Add `canonicalizeDataRequirement(obj) -> bytes` using a JCS library
  - Add `hashDataRequirement(obj) -> 0x...` returning the keccak256 digest
  - Unit tests with known fixtures (verify the same hash from JS and from a reference Python JCS impl)
  - _Validates: Requirement 9_

- [ ] 4.3 Implement schema validator + IPFS upload helper **[P1]**
  - Validate input against JSON Schema using Ajv
  - Pin canonicalized JSON to IPFS via Web3.Storage or local IPFS daemon
  - Return CID alongside the hash
  - _Validates: Requirement 9_

## 5. Proof Standard

- [ ] 5.1 Author and publish `proof/v1.json` JSON Schema **[D]**
  - Write schema file matching design Component 4
  - Host at stable URL
  - _Validates: Requirement 10_

- [ ] 5.2 Implement Proof builder + canonical signing helper (TypeScript) **[D]**
  - `buildUnsignedProof({taskId, imageBytes, lat, lon, ts, attestation, attestationType}) -> object`
  - `canonicalizeProof(obj) -> bytes`
  - Hook for hardware signing: accept a sign function `(canonicalBytes) => signatureHex`
  - Assemble the final Proof JSON
  - _Validates: Requirement 10_

- [ ] 5.3 Implement Proof verifier (used by Relayer Layer 1) **[D]**
  - Verify ECDSA-P256 signature against published key
  - Verify timestamp drift, GPS distance (haversine), and DataRequirement hash match
  - Validate Play Integrity / DeviceCheck token via official SDK
  - Return structured `{ok: bool, reasonCode}` result
  - Unit tests with positive and negative fixtures
  - _Validates: Requirements 10, 11 (Layer 1)_

## 6. Verification Pipeline

- [ ] 6.1 Implement Layer 1 device-side verifier module **[D]**
  - Wire together signature check, timestamp drift, GPS distance, platform attestation
  - Single entry point `runLayer1(proof, dataRequirement) -> Layer1Verdict`
  - Return reason codes from the design Error Handling table
  - _Validates: Requirement 11.2, 11.3_

- [ ] 6.2 Provision and pin reference ResNet-50 model for Layer 2 **[D]**
  - Fine-tune (or pick a public checkpoint) on the targetCategory enum
  - Export as ONNX, compute SHA-256 of the weights file
  - Publish weights to IPFS, record hash in governance parameters
  - _Validates: Requirement 11.4_

- [ ] 6.3 Implement Layer 2 inference runner with 2s budget **[D]**
  - Use onnxruntime-node, load the pinned model on Relayer startup
  - `runLayer2(imageBytes, targetCategory) -> {confidence, latencyMs}`
  - Apply thresholds: ≥0.7 pass, <0.3 reject (+ slash signal), 0.3-0.7 escalate
  - On timeout (>2s), return `escalate` instead of rejecting
  - _Validates: Requirement 11.5, 6.5_

- [ ] 6.4 Implement Layer 3 Azure forensics adapter **[P1]**
  - Wrap Azure ELA, moiré detection, AIGC classifier APIs
  - Run the three checks in parallel, collect confidence scores
  - Track per-submission spend; bail with current results if 0.10 USDT cap is hit
  - Reject if any score ≥ 0.85
  - _Validates: Requirement 11.6, 11.7, 11.8_

- [ ] 6.5 Wire L1 → L2 → L3 funnel with skip rules **[D]**
  - Compose `runVerificationPipeline(proof, dataRequirement, taskBudget) -> FinalVerdict`
  - Skip L3 unless escalated, bounty > 1.0 USDT, or dispute flag
  - Emit per-stage audit log with reason code
  - Integration test: 5 fixture Proofs covering each branch
  - _Validates: Requirement 11.1, 11.6_

## 7. Relayer Node (Phase 1)

- [ ] 7.1 Build the Relayer ingestion HTTP endpoint **[D]**
  - `POST /ingest` accepts multipart (Proof JSON + image bytes)
  - Persist image to durable storage (Azure Blob with immutability or IPFS)
  - Enqueue taskId for processing
  - _Validates: Requirement 12.5_

- [ ] 7.2 Build the Relayer worker process **[D]**
  - Pop from queue, run `runVerificationPipeline`, call `submitProof` or `slashWorker` on TaskEscrow
  - Use a hot wallet held in the enclave (or KMS-backed for non-SGX dev)
  - Idempotency: check on-chain status before submitting
  - Target latency <30s end-to-end
  - _Validates: Requirement 12.2_

- [ ] 7.3 Containerize the Relayer for Azure SGX deployment **[P1]**
  - Dockerfile with SGX SDK and DCAP libraries
  - Use Open Enclave or Gramine as the SGX runtime
  - Write Bicep / Terraform for Azure Confidential Computing VM provisioning
  - _Validates: Requirement 12.1_

- [ ] 7.4 Implement attestation report publisher **[P1]**
  - On enclave start, generate SGX quote
  - Publish at `https://relayer.questlens.io/attestation/latest.json`
  - Re-attest every 24h via cron inside the enclave
  - _Validates: Requirement 12.3, 12.4_

- [ ] 7.5 Add restart-recovery test **[P1]**
  - Simulate enclave kill mid-queue, verify pending Proofs resume without duplicate submitProof
  - _Validates: Requirement 12.5_

- [ ] 7.6 For Demo only: run Relayer outside SGX with mock attestation **[D]**
  - Allow `MOCK_ATTESTATION=true` env flag for local dev / hackathon demo
  - Document the trust delta clearly in the Relayer README
  - _Validates: Demo-time pragmatism, will be removed in P1 hardening_

## 8. SDK Reference Library

- [ ] 8.1 Scaffold `@questlens/sdk` TypeScript package **[D]**
  - Set up tsup or rollup build with ESM + CJS outputs
  - Add type definitions for `DataRequirement`, `Proof`, `TaskStatus`, error classes
  - _Validates: Requirement 14.4_

- [ ] 8.2 Implement `QuestLensClient.createTask` **[D]**
  - Validate DataRequirement against JSON Schema (Ajv)
  - Canonicalize + hash via task 4.2 utility
  - Approve stablecoin allowance, call TaskEscrow.createTask, return taskId from event
  - Reject with structured errors on each failure category
  - _Validates: Requirement 14.1, 14.6_

- [ ] 8.3 Implement `getTaskStatus` and `getTaskResult` **[D]**
  - Read task status enum from contract
  - Decode `Settled` event for result retrieval
  - Reject `getTaskResult` if status != settled
  - _Validates: Requirement 14.2, 14.3, 14.7_

- [ ] 8.4 Publish SDK to npm under @questlens/sdk **[P1]**
  - Set up GitHub Actions to publish on tag
  - Add README with quickstart matching design's TypeScript example
  - _Validates: Requirement 14.4_

## 9. Reference Worker Client: Telegram Mini App

- [ ] 9.1 Create Telegram Mini App skeleton (React + Telegram WebApp SDK) **[D]**
  - Initialize project, configure bot via BotFather, link Mini App URL
  - Restore session via Telegram initData
  - _Validates: Requirement 16.7_

- [ ] 9.2 Integrate Account Abstraction wallet generation **[D]**
  - Use a deterministic key derivation from Telegram user identity (server-held salt for the demo; replace with MPC or proper AA in P1)
  - Generate AA wallet on first open, display confirmation within 5s
  - Persist mapping server-side for restoration
  - _Validates: Requirement 16.1, 16.7_

- [ ] 9.3 Implement camera capture + Proof builder integration **[D]**
  - Use Telegram WebApp camera or browser MediaDevices API
  - On capture, fetch attestation token (Play Integrity on Android, DeviceCheck on iOS)
  - Build Proof using SDK helper from task 5.2
  - POST to Relayer ingestion endpoint
  - _Validates: Requirement 16.5, 16.8_

- [ ] 9.4 Wire task list and status display **[D]**
  - Fetch open tasks (off-chain indexer for the demo, on-chain getTaskStatus for canonical status)
  - Show available bounty, distance to target, time remaining
  - Trigger `stakeForTask` flow with gas sponsorship
  - _Validates: Requirement 16, 18.2_

- [ ] 9.5 Implement gas sponsorship via paymaster **[P1]**
  - Set up an ERC-4337 bundler + paymaster (or Injective equivalent)
  - Pre-fund paymaster from protocol treasury
  - All Worker transactions sponsored
  - _Validates: Requirement 16.4_

- [ ] 9.6 Add gamification UI (reputation, streak, tier) **[P1]**
  - Display Reputation_Score, completedTasks, streak counter
  - Trigger on-chain reputation bonus call when streak conditions met
  - _Validates: Requirement 17_

## 10. Reference Demo Frontend

- [ ] 10.1 Build single-page demo frontend with step indicator **[D]**
  - Five-step progress bar: created → notified → submitted → verifying → paid
  - Subscribe to Injective testnet events for live updates
  - _Validates: Requirement 18.5_

- [ ] 10.2 Implement "Create Task" button + 1 USDT lock flow **[D]**
  - Pre-set DataRequirement for the demo location and category
  - Click → SDK.createTask → display lock tx hash within 15s
  - _Validates: Requirement 18.1_

- [ ] 10.3 Implement Telegram Bot notification dispatcher **[D]**
  - On `TaskCreated` event, send Telegram message to pre-assigned demo Worker via Bot API within 5s
  - Include deep link into the Mini App with the taskId
  - _Validates: Requirement 18.2_

- [ ] 10.4 Display verification status and AI confidence in real time **[D]**
  - Subscribe to Relayer status webhook (or poll Relayer status endpoint)
  - Show "L1 pass / L2 score 0.87" within 10s of submission
  - _Validates: Requirement 18.3_

- [ ] 10.5 Display final tx hash and worker payment confirmation **[D]**
  - Subscribe to `Settled` event, display the Injective testnet tx hash
  - Show "0.95 USDT paid" within 5s of verification
  - _Validates: Requirement 18.4_

- [ ] 10.6 Add error handling and retry control **[D]**
  - If any step misses its deadline, display which step failed and a Retry button that resets the demo
  - _Validates: Requirement 18.7_

## 11. Hackathon Demo Day Preparation

- [ ] 11.1 Pre-deploy all contracts to Injective testnet and pin addresses **[D]**
  - Run deployment script, record addresses in `addresses.testnet.json`
  - Bootstrap governance to register the demo Relayer with 0 collateral
  - _Validates: Requirements 1, 6, 8_

- [ ] 11.2 Pre-fund demo wallets with testnet USDT **[D]**
  - Funder wallet → Requester demo wallet (10 USDT)
  - Funder wallet → Worker demo wallet (1 USDT for stakes)
  - Funder wallet → paymaster (5 USDT for gas)
  - _Validates: Requirement 18_

- [ ] 11.3 Write end-to-end golden path test script **[D]**
  - Headless script that drives the full demo in <120s
  - Run in CI on every commit to demo-frontend
  - _Validates: Requirement 18.6_

- [ ] 11.4 Run failure-injection rehearsal **[D]**
  - Force-fail each step (relayer offline, ResNet timeout, settlement gas spike)
  - Confirm retry control surfaces correctly
  - _Validates: Requirement 18.7_

- [ ] 11.5 Prepare backup video recording of a successful run **[D]**
  - Record one clean end-to-end run as a fallback if live testnet hiccups during the demo
  - _Validates: pragmatic risk mitigation_

## 12. Post-Demo Hardening (Phase 1 Completeness)

- [ ] 12.1 Run full Foundry property-based test suite **[P1]**
  - Implement invariant tests for Properties 1, 4, 5 from design
  - Target 100% line + branch coverage on TaskEscrow and ReputationRegistry
  - _Validates: design Properties 1, 4, 5_

- [ ] 12.2 Commission third-party security audit of contracts **[P1]**
  - Engage an audit firm (Trail of Bits, OpenZeppelin, or comparable)
  - Address all critical and high findings before mainnet
  - _Validates: Requirements 1-8_

- [ ] 12.3 Migrate Relayer to actual Azure SGX deployment **[P1]**
  - Remove `MOCK_ATTESTATION` flag, deploy to Azure Confidential VM
  - Publish first attestation report
  - Document MRENCLAVE in governance for external verification
  - _Validates: Requirement 12_

- [ ] 12.4 Replace demo AA wallet with production-grade AA implementation **[P1]**
  - Adopt ERC-4337 with social recovery, or Injective-native AA solution
  - Migration path for existing Worker wallets
  - _Validates: Requirement 16.1, 16.7_

- [ ] 12.5 Build off-chain indexer for task discovery **[P1]**
  - Subgraph or custom indexer that exposes open tasks by GPS proximity
  - Powers Worker task list and Requester analytics
  - _Validates: Requirement 16, 18.2_

## 13. Phase 2 Decentralization

- [ ] 13.1 Activate optimistic verification flag in TaskEscrow **[P2]**
  - Governance proposal to set Phase 2 mode on
  - All new tasks enter `PendingFinalization` after submitProof
  - _Validates: Requirement 13_

- [ ] 13.2 Open permissionless Relayer registration with 100 USDT collateral **[P2]**
  - Update `ReputationRegistry.minRelayerCollateral` parameter via governance
  - Document Relayer operator onboarding guide
  - _Validates: Requirement 13.1, 13.7_

- [ ] 13.3 Build challenger tooling and DAO arbitration UI **[P2]**
  - CLI for filing `challengeResult` with evidence bundle
  - Web UI for DAO voters to review evidence and cast votes
  - _Validates: Requirement 13.4, 13.5, 13.6_

- [ ] 13.4 Run public Phase 2 testnet challenge drill **[P2]**
  - Stage two relayers with conflicting verdicts
  - Walk through full challenge → arbitration → slash flow
  - _Validates: Requirement 13_

## Task Dependency Graph

The Demo Day critical path is organized into waves. Tasks within the same wave can run in parallel; each wave depends on the previous waves completing.

```json
{
  "waves": [
    {
      "wave": 1,
      "name": "Foundation",
      "tasks": ["1.1", "1.2", "1.3"],
      "dependsOn": []
    },
    {
      "wave": 2,
      "name": "Contract storage and schemas",
      "tasks": ["2.1", "3.1", "4.1", "5.1"],
      "dependsOn": [1]
    },
    {
      "wave": 3,
      "name": "Contract core functions and schema utilities",
      "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "5.2"],
      "dependsOn": [2]
    },
    {
      "wave": 4,
      "name": "Settlement, slashing, refund, proof verifier",
      "tasks": ["2.4", "2.5", "2.6", "5.3"],
      "dependsOn": [3]
    },
    {
      "wave": 5,
      "name": "Verification pipeline",
      "tasks": ["6.1", "6.2", "6.3", "6.5"],
      "dependsOn": [4]
    },
    {
      "wave": 6,
      "name": "Relayer node demo build",
      "tasks": ["7.1", "7.2", "7.6"],
      "dependsOn": [5]
    },
    {
      "wave": 7,
      "name": "SDK and reference clients",
      "tasks": ["8.1", "8.2", "8.3", "9.1", "9.2", "9.3", "9.4", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6"],
      "dependsOn": [4, 6]
    },
    {
      "wave": 8,
      "name": "Demo day preparation",
      "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"],
      "dependsOn": [7]
    },
    {
      "wave": 9,
      "name": "Phase 1 hardening (post-demo)",
      "tasks": ["2.8", "3.4", "4.3", "6.4", "7.3", "7.4", "7.5", "8.4", "9.5", "9.6", "12.1", "12.2", "12.3", "12.4", "12.5"],
      "dependsOn": [8]
    },
    {
      "wave": 10,
      "name": "Phase 2 decentralization",
      "tasks": ["2.7", "13.1", "13.2", "13.3", "13.4"],
      "dependsOn": [9]
    }
  ]
}
```

**Critical path duration estimate (single experienced engineer)**: ~5-7 working days for waves 1 through 8 if scoped strictly to [D] tasks. Realistic with a 2-3 person team in 3-4 days.

**Parallelization opportunities**:
- Within wave 2, all four tasks (contract storage, reputation storage, both schemas) run fully in parallel.
- Wave 3 spreads across two contract engineers, one schema/util engineer, and one Proof builder author.
- Wave 7 (SDK + Mini App + Demo FE) can begin as soon as the contract ABI is stable from wave 4, even while the Relayer (wave 6) is still being built.

## Notes

**Demo-time pragmatism**: Several tasks intentionally take shortcuts for the hackathon (task 7.6 mock attestation, task 9.2 server-side AA key derivation). These shortcuts are explicitly marked and have corresponding [P1] tasks (12.3, 12.4) for proper hardening before mainnet. The trust delta is documented in each shortcut's task description.

**Schema hosting**: For the demo, schema URLs (`schema.questlens.io/...`) can be served from GitHub Pages or any static host. Production hosting with content-addressed pinning (IPFS) is a P1 task.

**Stablecoin choice on testnet**: Injective testnet may not have native USDT/USDC. For the demo, deploy a mock ERC20 named `mUSDT` and use it everywhere. Make this explicit in the demo narration so judges understand the substitution.

**Cost cap on testnet**: Layer 3 cost-cap enforcement (task 6.4) is meaningful only on mainnet. On testnet, log the simulated cost but don't gate execution.

**ResNet model**: For the demo, a publicly available pretrained ResNet-50 checkpoint with the demo-specific category head fine-tuned on a small dataset (a few hundred images per category) is sufficient. Production model retraining is part of [P1].

**Governance address for Phase 1**: A 2-of-3 multisig of the protocol team is acceptable for Phase 1 launch. Migration to a full DAO is a [P2] task with its own governance proposal.

**Indexer for the demo**: The Telegram Mini App can call `getTaskStatus` directly on chain for the demo (tens of tasks, low frequency). A proper indexer (task 12.5) is only needed once task volume scales.
