# Design Document

## Overview

This document specifies the technical design of QuestLens Protocol, a Physical-World Data Oracle on the Injective blockchain. The design is organized around the four normative protocol artifacts defined in the requirements: on-chain contracts (TaskEscrow, ReputationRegistry), DataRequirement Schema, Proof Standard, and Oracle Protocol. Reference implementations (Telegram Mini App, demo frontend) are documented in a separate non-normative section.

The design choices below trace back to specific requirements and prioritize three properties:

1. **Permissionless integration** — any third party can build a Requester, Worker_Client, or Relayer_Node by following published standards, without protocol-team approval (R1.6, R9.3, R10.3, R14.8).
2. **Auditable verification** — every verification result is anchored to attestation reports (Phase 1) or to challengeable on-chain commitments (Phase 2), with cost-bounded per-submission AI spend (R11.8, R12.3, R13.2).
3. **Economic alignment** — staking, slashing, fee splits, and reputation are implemented in code, not policy (R3, R5, R6, R7, R13).

## Architecture

### High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Requesters (B-side, permissionless)                │
│   AI Labs · Annotation Companies · DApps · AI Agents · Demo FE     │
│             │                                                       │
│             │  createTask / claimRefund (via SDK or raw ABI)        │
└─────────────┼───────────────────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Protocol Layer (Injective chain)                 │
│  ┌───────────────────────┐      ┌──────────────────────────────┐    │
│  │     TaskEscrow        │◄────►│    ReputationRegistry        │    │
│  │  - createTask         │      │  - reputation tracking       │    │
│  │  - stakeForTask       │      │  - relayer registration      │    │
│  │  - submitProof        │      │  - sybil-resistant assignment│    │
│  │  - slashWorker        │      │  - cross-validation weights  │    │
│  │  - claimRefund        │      └──────────────────────────────┘    │
│  │  - challengeResult    │                                          │
│  └───────────────────────┘                                          │
│                  ▲                                                  │
│                  │ submitProof / slashWorker                        │
└──────────────────┼──────────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────────┐
│                Relayer Nodes (Oracle Protocol)                      │
│   Phase 1: Single SGX node (protocol team)                          │
│   Phase 2: Permissionless, 100 USDT collateral, optimistic          │
│   Pipeline: L1 device-side → L2 ResNet → L3 Azure forensics         │
└────────────────────────────▲────────────────────────────────────────┘
                             │ Proof (signed bundle, conforms to A4)
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│              Worker_Clients (C-side, permissionless)                │
│   Telegram Mini App (reference) · DePIN hardware · Custom apps      │
│   Output: Proof object → POST to Relayer Node ingestion endpoint    │
└─────────────────────────────────────────────────────────────────────┘
```

The protocol layer (the two contracts plus the two open standards plus the Oracle Protocol) is what every conforming implementation must obey. Everything outside the dotted box can be replaced.

### Task Lifecycle (Phase 1, Happy Path)

```
Requester                TaskEscrow              Worker          Relayer Node
   │                         │                     │                  │
   │ createTask(2 USDT, dr)  │                     │                  │
   │────────────────────────►│ status: created     │                  │
   │ event TaskCreated       │                     │                  │
   │◄────────────────────────│                     │                  │
   │                         │                     │                  │
   │                         │   stakeForTask(id)  │                  │
   │                         │◄────────────────────│ lock 0.1 USDT    │
   │                         │ status: accepted    │                  │
   │                         │ deadline=now+1h     │                  │
   │                         │                     │                  │
   │                         │                     │  Proof (off-chain)
   │                         │                     │─────────────────►│
   │                         │                     │                  │ run L1
   │                         │                     │                  │ run L2
   │                         │                     │                  │ (skip L3
   │                         │                     │                  │  if bounty
   │                         │                     │                  │  ≤ 1 USDT)
   │                         │  submitProof(...)   │                  │
   │                         │◄────────────────────────────────────────│
   │                         │ pay 1.9 USDT to W   │                  │
   │                         │ pay 0.1 USDT fee→T  │                  │
   │                         │ return 0.1 stake    │                  │
   │                         │ status: settled     │                  │
   │                         │ event Settled       │                  │
```

### Task Lifecycle (Phase 2, with Optional Challenge)

```
Relayer Node ──submitProof──► TaskEscrow
                              status: pending-finalization
                              challengeUntil = now + 24h

         (within 24h)
              ┌──── no challenge ────► auto-finalize → settled
              │
              └──── challengeResult(taskId, 10 USDT bond)
                          │
                          ▼
                   DAO arbitration (48h voting window)
                          │
              ┌───────────┴────────────┐
              │                        │
        relayer wrong             relayer right
        slash 100 USDT            forfeit challenger 10 USDT
        award 50 to challenger    transfer to relayer
        re-process verification   finalize original settlement
```

## Components and Interfaces

### Component 1: TaskEscrow Contract

**Responsibility**: Custody of bounties and stakes, lifecycle state machine, settlement and slashing execution.

**Storage**:

```solidity
enum TaskStatus {
    None,                  // never existed
    Created,               // bounty locked, awaiting Worker
    Accepted,              // Worker staked, within 1h deadline
    PendingFinalization,   // Phase 2 only: challenge window open
    Settled,
    Refunded,
    Slashed
}

struct Task {
    address requester;
    address worker;            // zero until accepted
    address stablecoin;        // USDT or USDC
    uint128 budget;            // bounty in stablecoin smallest unit
    uint128 workerStake;       // 0.1 USDT in smallest unit
    bytes32 dataRequirement;   // keccak256 of canonicalized JSON
    uint64  createdAt;
    uint64  acceptedAt;
    uint64  challengeUntil;    // Phase 2 only
    TaskStatus status;
}

mapping(uint256 => Task) public tasks;
uint256 public nextTaskId;

// governance-controlled parameters (R15)
struct Parameters {
    uint128 minBounty;          // 0.5 USDT
    uint128 maxBounty;          // 2.0 USDT
    uint128 workerStakeAmount;  // 0.1 USDT
    uint16  protocolFeeBps;     // 500 (5%)
    uint16  slashRewardPoolBps; // 5000 (50%)
    uint16  slashTreasuryBps;   // 5000 (50%)
    uint64  taskTimeout;        // 72 * 3600
    uint64  submissionDeadline; // 1 * 3600
    uint64  challengePeriod;    // 24 * 3600 (Phase 2)
    uint128 layer3CostCap;      // 0.10 USDT
}
Parameters public params;
```

**External Functions**:

```solidity
function createTask(
    address stablecoin,
    uint128 budget,
    bytes32 dataRequirement
) external returns (uint256 taskId);

function stakeForTask(uint256 taskId) external;

function submitProof(
    uint256 taskId,
    address worker,
    bytes32 imageHash,
    bytes32 verdictReason   // OK | L2_REJECT | L3_REJECT | TIMEOUT | ...
) external onlyActiveRelayer;

function slashWorker(
    uint256 taskId,
    address worker,
    bytes32 reasonCode
) external onlyActiveRelayer;

function claimRefund(uint256 taskId) external;

// Phase 2 only
function challengeResult(uint256 taskId) external payable;
function resolveChallenge(uint256 taskId, bool relayerWasCorrect)
    external onlyGovernance;
```

**Events**:

```solidity
event TaskCreated(uint256 indexed taskId, address indexed requester,
                  address stablecoin, uint128 budget, bytes32 dataRequirement);
event TaskAccepted(uint256 indexed taskId, address indexed worker, uint64 deadline);
event Settled(uint256 indexed taskId, address indexed worker,
              uint128 paidToWorker, uint128 protocolFee);
event Slashed(uint256 indexed taskId, address indexed worker,
              uint128 amount, uint128 toRewardPool, uint128 toTreasury,
              bytes32 reasonCode);
event Refunded(uint256 indexed taskId, address indexed requester, uint128 amount);
event ChallengeOpened(uint256 indexed taskId, address indexed challenger);
event ChallengeResolved(uint256 indexed taskId, bool relayerWasCorrect);
```

**Authorization Modifiers**:

- `onlyActiveRelayer`: caller must be in `ReputationRegistry.relayers[caller].status == Active`.
- `onlyGovernance`: caller must equal a hardcoded governance multisig or DAO timelock address.

### Component 2: ReputationRegistry Contract

**Responsibility**: Persistent reputation, Sybil-resistant assignment metadata, and Relayer Node registry.

**Storage**:

```solidity
struct WorkerReputation {
    uint16  reputationScore;   // 0-100, init 50
    uint32  completedTasks;
    uint16  cheatingCount;
    uint64  firstRegisteredAt;
    bytes32 deviceFingerprint; // hash of platform attestation pubkey
    bytes16 ipSubnet;          // /24 IPv4 or /48 IPv6 prefix (last seen)
    bool    banned;
}

mapping(address => WorkerReputation) public workers;

enum RelayerStatus { None, Active, Slashed, Withdrawn }

struct RelayerInfo {
    uint128 collateral;
    uint64  registeredAt;
    string  attestationUrl;    // Phase 1: SGX report URL
    RelayerStatus status;
}

mapping(address => RelayerInfo) public relayers;
```

**External Functions**:

```solidity
// called by TaskEscrow on settlement
function recordCompletion(address worker) external onlyTaskEscrow;
// called by TaskEscrow on slashing
function recordSlash(address worker) external onlyTaskEscrow;

// Worker first-time registration (idempotent)
function registerWorker(
    address worker,
    bytes32 deviceFingerprint,
    bytes16 ipSubnet
) external;

// Relayer self-registration
function registerRelayer(string calldata attestationUrl)
    external payable;
function withdrawRelayer() external;

// reads
function getReputation(address worker) external view
    returns (uint16 score, uint16 cheatingCount, bool banned);

function getRelayer(address relayer) external view
    returns (uint128 collateral, uint64 registeredAt,
             string memory attestationUrl, RelayerStatus status);

// cross-validation assignment helper used by Relayer Nodes off-chain
function isEligibleAsCrossValidator(
    uint256 taskId,
    address candidate,
    address[] calldata alreadyAssigned
) external view returns (bool, bytes32 reason);
```

**Sybil isolation logic** (R7.4 and R7.5) is implemented in `isEligibleAsCrossValidator`:

```
for each existing in alreadyAssigned:
  if workers[candidate].deviceFingerprint == workers[existing].deviceFingerprint
     -> reject (same device)
  if workers[candidate].ipSubnet == workers[existing].ipSubnet
     -> reject (same /24 subnet)
  if abs(workers[candidate].firstRegisteredAt - workers[existing].firstRegisteredAt) < 48h
     -> reject (registration window collision)
return true
```

The `deviceFingerprint` and `ipSubnet` are hashed and committed by Relayer Nodes off-chain to avoid leaking PII; the registry stores only opaque commitments.

### Component 3: DataRequirement Schema

**Schema URL** (versioned): `https://schema.questlens.io/dataRequirement/v1.json`

**JSON Schema (v1)**:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schema.questlens.io/dataRequirement/v1.json",
  "type": "object",
  "required": [
    "schemaVersion", "targetLatitude", "targetLongitude",
    "radiusMeters", "timeWindowStart", "timeWindowEnd", "targetCategory"
  ],
  "properties": {
    "schemaVersion": { "const": "1.0" },
    "targetLatitude":  { "type": "number", "minimum": -90,  "maximum": 90  },
    "targetLongitude": { "type": "number", "minimum": -180, "maximum": 180 },
    "radiusMeters":    { "type": "number", "minimum": 1, "maximum": 500 },
    "timeWindowStart": { "type": "string", "format": "date-time" },
    "timeWindowEnd":   { "type": "string", "format": "date-time" },
    "targetCategory":  { "type": "string", "enum": [
        "storefront", "traffic_sign", "vehicle_damage",
        "construction_site", "weather_phenomenon", "other"
    ]},
    "minImageWidthPx":  { "type": "integer", "minimum": 320 },
    "minImageHeightPx": { "type": "integer", "minimum": 320 },
    "additionalConstraints": {
      "type": "array", "items": { "type": "string" }
    }
  }
}
```

**Hashing Procedure** (R9.4):

1. Validate JSON against the schema above.
2. Canonicalize per RFC 8785 (JCS): UTF-8, sorted keys, no insignificant whitespace.
3. Compute `keccak256(canonicalBytes)`.
4. The 32-byte digest is the `dataRequirement` parameter passed to `TaskEscrow.createTask`.

**Storage Convention**:

The original DataRequirement JSON SHOULD be uploaded to IPFS or any public storage, with the CID/URL emitted alongside `TaskCreated` via an off-chain event log (e.g., a separate registry contract or indexer-readable event field). Workers and Relayers fetch the JSON, recompute the hash, and verify it matches the on-chain commitment before processing.

### Component 4: Proof Standard

**Schema URL**: `https://schema.questlens.io/proof/v1.json`

**JSON Schema (v1)**:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schema.questlens.io/proof/v1.json",
  "type": "object",
  "required": [
    "schemaVersion", "taskId", "imageHash",
    "capturedLatitude", "capturedLongitude", "capturedTimestamp",
    "platformAttestation", "hardwareAttestationType",
    "hardwareSignature", "publicKey"
  ],
  "properties": {
    "schemaVersion": { "const": "1.0" },
    "taskId": { "type": "string", "pattern": "^[0-9]+$" },
    "imageHash": { "type": "string", "pattern": "^0x[0-9a-f]{64}$" },
    "capturedLatitude":  { "type": "number" },
    "capturedLongitude": { "type": "number" },
    "capturedTimestamp": { "type": "integer", "minimum": 0 },
    "platformAttestation": { "type": "string" },
    "hardwareAttestationType": {
      "type": "string",
      "enum": ["android-keystore", "ios-secure-enclave", "depin-tee-v1"]
    },
    "hardwareSignature": { "type": "string", "pattern": "^0x[0-9a-f]{128,}$" },
    "publicKey":         { "type": "string", "pattern": "^0x[0-9a-f]{128,}$" }
  }
}
```

**Signing Procedure**:

1. Build the unsigned payload: object containing `taskId`, `imageHash`, `capturedLatitude`, `capturedLongitude`, `capturedTimestamp`, `platformAttestation`.
2. Canonicalize per RFC 8785 (JCS).
3. Sign the canonical bytes with the device's hardware secure element using ECDSA over secp256r1 (P-256). For DePIN hardware, the spec allows alternate algorithms identified by `hardwareAttestationType`.
4. Base64-encode signature and public key, then assemble the full Proof object.
5. POST the Proof JSON plus the original image bytes (multipart/form-data) to a Relayer Node's ingestion endpoint.

**Example Proof (illustrative)**:

```json
{
  "schemaVersion": "1.0",
  "taskId": "42",
  "imageHash": "0x9f2a...c41b",
  "capturedLatitude": 31.230416,
  "capturedLongitude": 121.473701,
  "capturedTimestamp": 1748016000000,
  "platformAttestation": "PLAY_INTEGRITY_TOKEN_BASE64...",
  "hardwareAttestationType": "android-keystore",
  "hardwareSignature": "0x3045...",
  "publicKey": "0x04abc..."
}
```

### Component 5: Relayer Node and Verification Pipeline

**Responsibility**: Ingests Proofs from Worker_Clients, runs the three-layer Verification Pipeline, and submits attested verdicts to TaskEscrow.

**Phase 1 Deployment Topology**:

```
                Worker_Client
                      │ POST /ingest (Proof JSON + image bytes)
                      ▼
   ┌──────────────────────────────────────────────────────┐
   │ Azure VM (untrusted host)                            │
   │  ┌────────────────────────────────────────────────┐  │
   │  │  SGX Enclave (MRENCLAVE pinned in registry)    │  │
   │  │                                                │  │
   │  │   Layer 1: signature & attestation checks      │  │
   │  │   Layer 2: pinned ResNet model + weights hash  │  │
   │  │   Layer 3: Azure ELA / moiré / AIGC (egress    │  │
   │  │            via SGX-attested TLS)               │  │
   │  │                                                │  │
   │  │   wallet keys for submitProof / slashWorker    │  │
   │  │   signed verdict + reason → TaskEscrow         │  │
   │  └────────────────────────────────────────────────┘  │
   │  Untrusted host: image storage (IPFS), queue,        │
   │  HTTPS server, monitoring                            │
   └──────────────────────────────────────────────────────┘
                              │
                              ▼  submitProof / slashWorker
                       Injective TaskEscrow
```

**Verification Pipeline State Machine** (R11):

```
                      ┌─────────────────┐
                      │  Proof received │
                      └────────┬────────┘
                               ▼
                       ┌────────────────┐
                       │ Layer 1 checks │  hardware sig, GPS dist,
                       │  (zero cost)   │  timestamp, platform attest
                       └───┬─────────┬──┘
                       fail│         │pass
                           ▼         ▼
                ┌──────────────┐  ┌────────────────────┐
                │  reject;     │  │ Layer 2 ResNet     │  ≤2s, returns
                │  no slash    │  │ relevance score    │  score ∈ [0,1]
                │  R11.3       │  └─┬─────────┬──────┬─┘
                └──────────────┘   │         │      │
                                   <0.3   0.3-0.7  ≥0.7
                                   ▼         ▼      │
                          ┌──────────┐  escalate    │
                          │ reject;  │              │
                          │ slash    │              │
                          │ R5/R11.5 │              │
                          └──────────┘              │
                                                    │
                  ┌─────────────────────────────────┤
                  │  bounty > 1.0 USDT?             │
                  │  OR Requester disputed (24h)?   │
                  └────────────┬────────────────────┘
                       no      │      yes
                        │      ▼
                        │  ┌─────────────────────────┐
                        │  │ Layer 3                 │  ≤0.10 USDT cost
                        │  │ ELA + moiré + AIGC      │
                        │  │ reject if any ≥0.85     │
                        │  └────┬─────────────┬──────┘
                        │       │ pass        │ fail
                        │       │             ▼
                        ▼       ▼          slash + reject
                     submitProof(OK)
```

**Layer 1 implementation**:

- Parse Proof JSON, recompute `keccak256(canonical(unsignedPayload))` and verify ECDSA-P256 against `publicKey`.
- Extract platform attestation:
  - **Android**: validate Play Integrity verdict using Google's public keys; reject if any of `MEETS_DEVICE_INTEGRITY` or `MEETS_BASIC_INTEGRITY` is missing, or if `appRecognitionVerdict` is unrecognized.
  - **iOS**: validate DeviceCheck token via Apple's API; reject if device flagged.
  - **DePIN hardware**: validate per the registered attestation profile.
- Confirm `capturedTimestamp` within ±120s of `now()` synchronized to NTP.
- Compute haversine distance between `(capturedLatitude, capturedLongitude)` and `(targetLatitude, targetLongitude)` from DataRequirement; reject if > min(200m, radiusMeters).
- All Layer 1 failures are non-slashing (R11.3) — Worker stake returned, task back to "created".

**Layer 2 implementation**:

- Pinned model: ResNet-50 fine-tuned on `targetCategory` enum, distributed as a single ONNX file with SHA-256 published in protocol governance.
- Inference budget: 2 seconds. If exceeded, escalate (do not auto-reject) — this avoids penalizing slow infra (R6.5).
- Output: confidence score for the matched `targetCategory`.

**Layer 3 implementation**:

- Triggered only by escalation, bounty > 1.0 USDT, or dispute (R11.6).
- Three Azure API calls in parallel: ELA, moiré detection, AIGC classifier.
- Per-submission spend tracked; if any single image exceeds 0.10 USDT in API cost, surplus is absorbed by the Relayer (R11.8).
- Verdict aggregation: reject if any single check returns fraud confidence ≥ 0.85.

**SGX Attestation Lifecycle** (R12.3, R12.4):

- On enclave start, generate SGX quote signed by Intel's attestation infrastructure (or Azure's DCAP).
- Publish the quote and `MRENCLAVE` value at `attestationUrl` registered in `ReputationRegistry`.
- Re-attest every 24 hours.
- External verifiers fetch `attestationUrl`, compare `MRENCLAVE` to the value published in protocol governance, and validate the quote signature chain.

**Recovery and Queueing** (R12.5):

- Image bytes and Proof JSON are written to durable storage (IPFS or Azure Blob with immutability flag) before any Layer 1 work begins.
- A persistent FIFO queue tracks pending taskIds.
- If the enclave restarts, the host re-feeds the queue; idempotency on TaskEscrow side (status checks) prevents duplicate settlement.

**Phase 2 Differences**:

- Multiple Relayer Nodes register via `ReputationRegistry.registerRelayer` with 100 USDT collateral each.
- A task is dispatched to a single Relayer (or a small committee) by an off-chain coordinator; the Relayer submits its verdict on-chain.
- TaskEscrow places the task in `PendingFinalization` with `challengeUntil = now + 24h`.
- Any address can call `challengeResult` with a 10 USDT bond, freezing the settlement.
- DAO arbitration (governance multisig in Phase 2 launch, full DAO later) reviews evidence within 48 hours and calls `resolveChallenge`.
- Outcome split as in R13.5 / R13.6.

### Component 6: SDK Reference Library

**Package**: `@questlens/sdk` on npm (TypeScript).

**Public API**:

```ts
import { QuestLensClient, DataRequirement } from "@questlens/sdk";

const client = new QuestLensClient({
  network: "injective-testnet",
  signer: walletSigner,           // EIP-1193 or Injective wallet adapter
});

// Create a task
const taskId = await client.createTask({
  budget: 1.0,                    // USDT
  stablecoin: "USDT",
  dataRequirement: {
    schemaVersion: "1.0",
    targetLatitude: 31.230416,
    targetLongitude: 121.473701,
    radiusMeters: 50,
    timeWindowStart: "2026-05-25T00:00:00Z",
    timeWindowEnd: "2026-05-26T00:00:00Z",
    targetCategory: "storefront",
  },
});

// Watch for status
const status = await client.getTaskStatus(taskId);
// → "created" | "accepted" | "submitted" | "pending-finalization"
//   | "verified" | "settled" | "refunded" | "slashed"

// Retrieve verified result
const result = await client.getTaskResult(taskId);
// → { imageHash, capturedLatitude, capturedLongitude,
//     capturedTimestamp, worker }
```

**Internal Behavior**:

- `createTask` validates the DataRequirement against the published JSON Schema, canonicalizes per RFC 8785, computes keccak256, calls TaskEscrow.createTask, and returns the taskId from the `TaskCreated` event.
- `getTaskStatus` reads the `Task` struct from TaskEscrow.
- `getTaskResult` queries the on-chain status; if not "settled", rejects with `TaskNotSettledError`. Otherwise reads the most recent `Settled` event and decodes the result.
- All SDK methods reject with structured errors: `NetworkError`, `InsufficientBalanceError`, `InvalidParameterError`, `TaskNotSettledError`, `RelayerUnauthorizedError`.

**No-SDK Path**:

The SDK is a convenience wrapper. Any third party can replicate the same flow using only:
- Published contract ABI (TaskEscrow, ReputationRegistry).
- Published DataRequirement Schema and Proof Standard.
- Standard Web3 libraries (ethers.js, viem, @injectivelabs/sdk-ts).

This is a hard guarantee per Requirement 14.8.

## Data Models

### On-chain Storage Summary

| Contract | Key | Field | Type | Purpose |
|---|---|---|---|---|
| TaskEscrow | `tasks[id]` | requester | address | refund recipient |
| TaskEscrow | `tasks[id]` | worker | address | settlement / slash target |
| TaskEscrow | `tasks[id]` | stablecoin | address | USDT or USDC token addr |
| TaskEscrow | `tasks[id]` | budget | uint128 | bounty in token's smallest unit |
| TaskEscrow | `tasks[id]` | workerStake | uint128 | 0.1 USDT locked |
| TaskEscrow | `tasks[id]` | dataRequirement | bytes32 | keccak256 hash |
| TaskEscrow | `tasks[id]` | createdAt | uint64 | for 72h timeout |
| TaskEscrow | `tasks[id]` | acceptedAt | uint64 | for 1h submission deadline |
| TaskEscrow | `tasks[id]` | challengeUntil | uint64 | Phase 2 only |
| TaskEscrow | `tasks[id]` | status | enum | state machine |
| ReputationRegistry | `workers[addr]` | reputationScore | uint16 | 0-100 |
| ReputationRegistry | `workers[addr]` | completedTasks | uint32 | counter |
| ReputationRegistry | `workers[addr]` | cheatingCount | uint16 | counter, ban at 3 |
| ReputationRegistry | `workers[addr]` | firstRegisteredAt | uint64 | for 48h Sybil window |
| ReputationRegistry | `workers[addr]` | deviceFingerprint | bytes32 | hash commitment |
| ReputationRegistry | `workers[addr]` | ipSubnet | bytes16 | last-seen /24 commitment |
| ReputationRegistry | `workers[addr]` | banned | bool | permanent flag |
| ReputationRegistry | `relayers[addr]` | collateral | uint128 | 0 (Phase 1) or 100 USDT |
| ReputationRegistry | `relayers[addr]` | attestationUrl | string | SGX report URL |
| ReputationRegistry | `relayers[addr]` | status | enum | Active / Slashed / Withdrawn |

### Off-chain Artifacts

| Artifact | Storage | Purpose |
|---|---|---|
| DataRequirement JSON | IPFS / public storage | full definition referenced by hash |
| Proof JSON | Relayer durable storage | full evidence bundle |
| Image bytes | IPFS or Azure Blob (immutable) | original photo |
| SGX attestation report | HTTPS endpoint per Relayer | tamper-proof code identity |
| Verification verdict log | Relayer audit log | per-submission L1/L2/L3 outputs |

### State Transitions (TaskEscrow)

```
              createTask
              ─────────►
   None ─────────────► Created ──── stakeForTask ────► Accepted
                          │                              │
                          │ 72h timeout                  │ 1h timeout
                          │ claimRefund                  │ claimRefund
                          ▼                              ▼ (slash worker)
                       Refunded                       Refunded
                                                         │
                                                         │ submitProof OK
                                                         ▼
                                                 PendingFinalization (Phase 2)
                                                         │
                                                         │ 24h no challenge
                                                         ▼
                                                       Settled
                                                         │
                                                         │ challengeResult (Phase 2)
                                                         ▼
                                                      (frozen → DAO → Settled or
                                                       back to Created)

           submitProof slash / Layer 2 reject
   Accepted ───────────────────────────────────► Created (task reopens)
                                                  ↓ (worker stake forfeited)
```

## Error Handling

### Contract-Level Reverts

| Function | Condition | Revert reason |
|---|---|---|
| createTask | budget out of range | `BountyOutOfRange(min, max)` |
| createTask | insufficient allowance | `ERC20InsufficientAllowance` |
| stakeForTask | task not in Created | `InvalidTaskStatus(expected, actual)` |
| stakeForTask | worker banned | `WorkerBanned(addr)` |
| submitProof | caller not active relayer | `UnauthorizedRelayer(addr)` |
| submitProof | task already settled/refunded | `InvalidTaskStatus` |
| slashWorker | caller not active relayer | `UnauthorizedRelayer` |
| claimRefund | caller not requester | `UnauthorizedRequester` |
| claimRefund | timeout not elapsed | `TimeoutNotElapsed(remaining)` |
| challengeResult | challenge period closed | `ChallengePeriodClosed` |
| challengeResult | insufficient bond | `InsufficientChallengeBond` |

### Off-chain Verification Pipeline Errors

| Layer | Error | Action |
|---|---|---|
| L1 | invalid signature | reject, no slash, return reason `INVALID_SIG` |
| L1 | timestamp out of window | reject, no slash, `TIMESTAMP_DRIFT` |
| L1 | GPS out of radius | reject, no slash, `GPS_OUT_OF_RANGE` |
| L1 | Play Integrity / DeviceCheck negative | reject, no slash, `PLATFORM_ATTEST_FAIL` |
| L1 | mock location detected | reject, no slash, `MOCK_LOCATION` |
| L2 | inference timeout (>2s) | escalate to L3 (R6.5) |
| L2 | confidence < 0.3 | reject, slash, `IRRELEVANT_CONTENT` |
| L3 | ELA fraud ≥0.85 | reject, slash, `IMAGE_TAMPERED` |
| L3 | moiré ≥0.85 | reject, slash, `SCREEN_REPHOTOGRAPHY` |
| L3 | AIGC ≥0.85 | reject, slash, `AI_GENERATED` |
| L3 | API spend > 0.10 USDT | Relayer absorbs cost, continue |

### Worker_Client Error Surface

The reference Worker_Client (Telegram Mini App) maps protocol error codes to user-facing messages:

| Code | User Message |
|---|---|
| `INVALID_SIG` | "Couldn't verify your device. Please reopen the app." |
| `TIMESTAMP_DRIFT` | "Your device clock is off. Sync time and retry." |
| `GPS_OUT_OF_RANGE` | "You're too far from the task location. Move closer." |
| `PLATFORM_ATTEST_FAIL` | "This device isn't supported (emulator or rooted device detected)." |
| `MOCK_LOCATION` | "Mock location detected. Disable Fake-GPS apps and retry." |
| `IRRELEVANT_CONTENT` | "Photo doesn't match the task. Stake forfeited." |
| `IMAGE_TAMPERED` / `SCREEN_REPHOTOGRAPHY` / `AI_GENERATED` | "Submission flagged as fake. Stake forfeited." |

## Testing Strategy

### Smart Contract Tests

- **Unit tests (Foundry / Hardhat)** cover every external function and revert path enumerated above. Target: 100% line and branch coverage for TaskEscrow and ReputationRegistry.
- **Property-based tests** for invariants:
  - Sum of locked stablecoin balances in TaskEscrow equals sum of `budget + workerStake` across all non-terminal tasks.
  - A worker cannot be both staked on a task and refunded its stake in the same block without going through a defined exit transition.
  - `reputationScore` always in [0, 100]; `cheatingCount ≥ 3 ⇒ banned == true`.
- **Integration tests** simulate the full happy path and the slash path on a forked Injective testnet using actual stablecoin contracts.
- **Reentrancy and access-control tests** for every authorization modifier.

### Verification Pipeline Tests

- **Layer 1 fixtures**: pre-recorded valid Proofs from physical Android and iOS devices, plus negative samples (emulator-generated, Fake-GPS-spoofed, root-detected). Layer 1 must produce expected accept/reject for each.
- **Layer 2 fixtures**: per-category test set (storefront, traffic_sign, etc.) drawn from public datasets, with confidence-score thresholds asserted within ±0.05.
- **Layer 3 fixtures**: known-real photos, screen re-photographed copies, Photoshop-edited copies, and Stable Diffusion / Midjourney generated copies.
- **Cost-cap test**: synthetic high-resolution adversarial images that drive Azure API spend; verify Relayer enforces the 0.10 USDT cap.

### Oracle Protocol Tests

- **SGX attestation test**: spin up enclave, fetch attestation URL, validate against published MRENCLAVE.
- **Restart recovery test**: kill the enclave mid-queue; verify queued Proofs are re-processed without duplicate `submitProof` calls.
- **Phase 2 challenge test (testnet)**: register two Relayer nodes, submit conflicting verdicts, file a challenge, simulate DAO resolution, confirm slashing and re-processing.

### Hackathon Demo Test

- **Golden Path scripted run**: end-to-end automated rehearsal that completes within 120 seconds; CI runs this against the testnet on every commit to the demo frontend repo.
- **Failure-injection rehearsal**: artificially time out a step to verify the retry control surfaces correctly.

## Migration and Phase 1 → Phase 2 Plan

The contracts deploy in Phase 1 mode with a single Relayer (the protocol team's SGX node, registered with 0 collateral via a one-time governance action). Phase 2 activation is a governance call that:

1. Sets `ReputationRegistry.minRelayerCollateral` to 100 USDT.
2. Enables `PendingFinalization` flow in TaskEscrow (a parameter flag, not a contract upgrade).
3. Opens permissionless `registerRelayer`.

No data migration is required because the contract storage layout already supports both phases; only the parameter set differs. This is consistent with Requirement 15 (governance-controlled parameters).

## Correctness Properties

The following invariants and safety properties must hold for any conforming protocol implementation. They are stated formally so that contract tests, audits, and Phase 2 challenge logic can mechanically check them.

### Property 1: Conservation of Stablecoin Balance

For every block height, the stablecoin balance held by TaskEscrow equals the sum of:

```
  Σ task.budget       over tasks in {Created, Accepted, PendingFinalization}
+ Σ task.workerStake  over tasks in {Accepted, PendingFinalization}
```

No external transfer can deviate from this identity except through the explicit settlement, refund, or slash code paths.

**Validates: Requirements 1, 3, 4, 5**

### Property 2: Single Worker per Task

For every taskId, at most one address satisfies `task.worker != 0` at any point in time. A new Worker may only be assigned after the previous Worker's stake has been resolved (returned, slashed, or forfeited).

**Validates: Requirements 3, 5**

### Property 3: Stake Settlement Atomicity

In any successful `submitProof` execution, the Worker receives exactly `(budget × 0.95) + workerStake` in the same transaction, and the protocol treasury receives exactly `budget × 0.05`. Partial settlements are not permitted.

**Validates: Requirements 4**

### Property 4: Slash Conservation

In any successful `slashWorker` execution, the sum of the reward-pool transfer and the treasury transfer equals exactly `workerStake (0.1 USDT)`, and the Worker's stake balance becomes zero.

**Validates: Requirements 5**

### Property 5: Reputation Bounds

For every Worker address, `0 ≤ reputationScore ≤ 100` always holds. `cheatingCount` is monotonically non-decreasing. Once `cheatingCount ≥ 3`, the `banned` flag is true and remains true.

**Validates: Requirements 6**

### Property 6: Authorization Soundness

`submitProof` and `slashWorker` revert unless `msg.sender` resolves to `RelayerStatus.Active` in `ReputationRegistry.relayers`. `claimRefund` reverts unless `msg.sender == task.requester`. Governance-only parameter setters revert unless `msg.sender` is the configured governance address.

**Validates: Requirements 4, 5, 8, 15**

### Property 7: Liveness Under Timeout

For every task in `Created` status with `now - createdAt ≥ 72h`, `claimRefund` succeeds when called by the requester. For every task in `Accepted` status with `now - acceptedAt ≥ 1h` and no successful `submitProof`, `claimRefund` succeeds when called by the requester.

**Validates: Requirements 2**

### Property 8: Sybil-Resistant Cross-Validation

For any two Worker addresses A and B simultaneously assigned as cross-validators on the same task, all of the following hold:

```
  workers[A].deviceFingerprint != workers[B].deviceFingerprint
  workers[A].ipSubnet           != workers[B].ipSubnet
  |workers[A].firstRegisteredAt - workers[B].firstRegisteredAt| ≥ 48h
```

**Validates: Requirements 7**

### Property 9: Verification Pipeline Determinism

Given the same Proof input, the same DataRequirement, and the same governance-pinned model versions and thresholds, two correctly-functioning Relayer Nodes MUST produce the same Layer 1 verdict and the same Layer 2 verdict (within a confidence-score tolerance of ±0.05 due to floating-point determinism limits). Layer 3 results are non-deterministic across vendors but a `≥ 0.85` rejection from any single check on either node is sufficient grounds for rejection.

**Validates: Requirements 11, 13**

### Property 10: Phase 2 Challenge Soundness

For any task in `PendingFinalization`:

- Until `challengeUntil`, settlement does not finalize.
- After `challengeUntil` with no challenge, exactly one finalization transition fires, paying out per P3.
- If a challenge is filed, settlement is frozen and only `resolveChallenge` (governance/DAO) can finalize, with outcome enforced by R13.5 / R13.6.

This prevents both premature settlement and indefinite freezing.

**Validates: Requirements 13**

### Property 11: SDK / Direct-Call Equivalence

For any operation supported by `QuestLens_SDK` (createTask, getTaskStatus, getTaskResult), the resulting on-chain effect is identical to a direct ABI call constructed from published artifacts. The SDK adds no privileged authentication, no off-chain authorization, and no hidden parameters.

**Validates: Requirements 14**

These eleven properties form the test target for contract audits, formal verification efforts, and the Phase 2 challenge protocol. Any deviation observed by an external monitor is grounds for filing `challengeResult` against the offending Relayer or for triggering an emergency governance proposal.
