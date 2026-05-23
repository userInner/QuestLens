# Requirements Document

## Introduction

QuestLens Protocol is a decentralized Physical-World Data Oracle for AI and Web3. It is a base-layer protocol on the Injective blockchain that enables any AI agent or application to commission humans to photograph and verify physical-world objects. The protocol defines the on-chain rules (escrow, staking, slashing, reputation, oracle attestation) and the open standards (data requirement schema, proof format, verification interface) that any third party can build against. Reference implementations such as the Telegram Mini App worker client and the hackathon demo frontend are explicitly out of the protocol scope and are documented separately as replaceable reference clients.

## Protocol Scope

The QuestLens Protocol consists of exactly four normative artifacts. Anything not listed here is application-layer reference material that may be replaced or omitted without breaking protocol compatibility.

1. **On-chain contracts**: TaskEscrow and ReputationRegistry contracts deployed on Injective, callable by any address without permission.
2. **DataRequirement Schema**: The public JSON schema describing what a Requester is asking for (location, time window, target category, tolerance).
3. **Proof Standard**: The public format and signature requirements that any conforming Worker client must produce when submitting evidence.
4. **Oracle Protocol**: The rules under which Relayer Nodes attest to verification results, including staking, attestation reports (Phase 1) and challenge periods (Phase 2).

Reference implementations (Telegram Mini App, hackathon demo frontend, gamification UX) are documented in Part B and are non-normative.

Requirements 1-15 below are protocol-layer (normative). Requirements 16-19 are reference-implementation (non-normative) and explicitly tagged.

## Glossary

- **Protocol Layer**: Normative components defined in Requirements 1-15. Any conforming implementation must adhere to these rules.
- **Reference Implementation**: Non-normative components in Requirements 16-19. They demonstrate one way to build on the protocol but can be replaced by third parties.
- **TaskEscrow**: The smart contract on Injective responsible for locking task bounties, accepting Worker stakes, releasing payments, handling refunds, and executing slashing.
- **ReputationRegistry**: The smart contract that tracks Worker reputation scores, staking history, fraud records, and Relayer Node registrations.
- **Relayer_Node**: An oracle service that runs the verification pipeline and attests verification results on-chain. Phase 1 runs as a single Azure SGX node operated by the protocol team; Phase 2 is permissionless with collateral and challenge periods.
- **Worker**: A C-side participant who accepts tasks, captures physical-world data, and submits Proofs.
- **Requester**: A B-side client (AI lab, data annotation company, AI Agent, or any third-party DApp) that creates tasks and locks bounties.
- **Worker_Client**: Any software that produces Proofs conforming to the Proof Standard. The Telegram Mini App is one reference Worker_Client.
- **DataRequirement**: A JSON object describing what a task requires (target GPS coordinates, location tolerance radius, time window, target category, optional constraints). Identified on-chain by its keccak256 hash.
- **Proof**: The submission package produced by a Worker_Client, containing the photo content hash, hardware-signed GPS and timestamp, and platform attestation.
- **Verification_Pipeline**: The three-layer anti-fraud funnel (device-side checks, lightweight AI classification, deep forensics) that a conforming Relayer_Node must execute.
- **QuestLens_SDK**: The reference JavaScript client library wrapping the on-chain protocol, published as an npm package. Use of the SDK is optional; any caller may interact with the contracts directly.
- **Account_Abstraction_Wallet**: A smart contract wallet generated for a user that supports gas sponsorship and removes seed-phrase management. Account abstraction is supported by the protocol but the specific wallet implementation is application-level.
- **Reputation_Score**: A numeric value in the range 0 to 100 (new Workers initialized at 50) tracked by ReputationRegistry, used for weighted voting and task tier access.

## Requirements

### Requirement 1: TaskEscrow - Task Creation and Budget Locking

[Protocol-Layer | TaskEscrow]

**User Story:** As a Requester, I want to create a task with a locked bounty, so that Workers are guaranteed payment upon successful completion.

#### Acceptance Criteria

1. WHEN any address calls createTask with a budget amount and a dataRequirement hash, THE TaskEscrow SHALL deduct the budget from the caller's stablecoin balance, lock it in the contract, assign a unique taskId, and set the task status to "created"
2. THE TaskEscrow SHALL accept task bounties in the inclusive range of 0.5 to 2.0 USDT or USDC with precision of up to 2 decimal places
3. WHEN a task is created, THE TaskEscrow SHALL store the dataRequirement hash and emit a TaskCreated event containing taskId, requester address, budget amount, stablecoin token address, and dataRequirement hash
4. IF a caller attempts to create a task with a budget below 0.5 or above 2.0 of the chosen stablecoin, THEN THE TaskEscrow SHALL revert the transaction with no state changes
5. IF a caller attempts to create a task with insufficient stablecoin allowance or balance, THEN THE TaskEscrow SHALL revert the transaction with no state changes
6. THE TaskEscrow SHALL allow any externally owned account or smart contract account (including Account_Abstraction_Wallet implementations) to call createTask without requiring whitelisting

### Requirement 2: TaskEscrow - Task Timeout and Refund

[Protocol-Layer | TaskEscrow]

**User Story:** As a Requester, I want to reclaim my budget if no Worker completes the task, so that my funds are not locked indefinitely.

#### Acceptance Criteria

1. WHEN no Worker has staked on a task within 72 hours of its creation, THE TaskEscrow SHALL allow the original Requester to call claimRefund and reclaim the full budget
2. WHEN a Worker has staked on a task but no proof has been submitted within 1 hour of staking, THE TaskEscrow SHALL allow the original Requester to call claimRefund, reclaim the full budget, and forfeit the Worker's stake per the slashing flow defined in Requirement 5
3. IF a caller invokes claimRefund on a task that has not met any timeout condition, THEN THE TaskEscrow SHALL revert the transaction with an error indicating the timeout has not elapsed
4. IF a caller other than the original Requester invokes claimRefund, THEN THE TaskEscrow SHALL revert the transaction
5. WHEN a refund is successfully claimed, THE TaskEscrow SHALL set the task state to "refunded" and reject any subsequent stakeForTask, submitProof, or claimRefund calls on that taskId

### Requirement 3: TaskEscrow - Worker Staking and Task Acceptance

[Protocol-Layer | TaskEscrow]

**User Story:** As a Worker, I want to stake a micro-deposit to accept a task, so that I demonstrate commitment and deter fraudulent behavior.

#### Acceptance Criteria

1. WHEN any address calls stakeForTask with a taskId in "created" status, THE TaskEscrow SHALL lock 0.1 USDT from the caller's wallet, record the caller as the assigned Worker, and transition the task to "accepted" status
2. IF a caller attempts to stake on a task with insufficient stablecoin balance for the 0.1 USDT stake, THEN THE TaskEscrow SHALL revert the transaction with an error indicating insufficient balance
3. IF a caller attempts to stake on a task that is already in "accepted", "submitted", "verified", "settled", or "refunded" status, THEN THE TaskEscrow SHALL revert the transaction
4. WHEN a Worker successfully stakes, THE TaskEscrow SHALL record a submission deadline 1 hour after the staking timestamp
5. WHEN a Worker's proof passes verification within the submission deadline, THE TaskEscrow SHALL return the 0.1 USDT stake to the Worker as part of the settlement transaction defined in Requirement 4
6. IF a Worker does not submit proof within 1 hour of staking, THEN THE TaskEscrow SHALL forfeit the Worker's 0.1 USDT stake via the slashing flow and transition the task back to "created" status
7. IF a task is refunded by the Requester while a Worker has an active stake on it, THEN THE TaskEscrow SHALL forfeit the Worker's stake only if the worker missed the 1-hour submission deadline; otherwise the task cannot be refunded while the deadline is active

### Requirement 4: TaskEscrow - Settlement and Bounty Release

[Protocol-Layer | TaskEscrow]

**User Story:** As a Worker, I want to receive instant payment when my submission passes verification, so that I am rewarded without delay.

#### Acceptance Criteria

1. WHEN an authorized Relayer_Node calls submitProof with a valid taskId, worker address, and image hash, THE TaskEscrow SHALL transfer 95% of the locked bounty to the Worker's wallet within 1 block on the Injective chain
2. WHEN settlement occurs, THE TaskEscrow SHALL transfer the remaining 5% of the bounty to the protocol treasury address as the protocol fee
3. WHEN settlement occurs, THE TaskEscrow SHALL also return the Worker's 0.1 USDT stake to the Worker in the same transaction
4. THE TaskEscrow SHALL settle payments in the same stablecoin token (USDT or USDC) that was locked at task creation
5. IF submitProof is called by an address not registered as an authorized Relayer_Node, THEN THE TaskEscrow SHALL revert the transaction
6. IF submitProof is called for a taskId that does not exist, has already been settled, or has been refunded, THEN THE TaskEscrow SHALL revert the transaction with no balance changes
7. WHEN settlement succeeds, THE TaskEscrow SHALL emit a Settled event containing taskId, worker address, bounty paid to worker, protocol fee, and timestamp

### Requirement 5: TaskEscrow - Fraud Slashing

[Protocol-Layer | TaskEscrow]

**User Story:** As the protocol, I want to confiscate stakes from fraudulent Workers, so that cheating is economically punished and the community is rewarded.

#### Acceptance Criteria

1. WHEN an authorized Relayer_Node calls slashWorker on a task whose proof was rejected at Layer 2 or Layer 3 of the Verification_Pipeline, THE TaskEscrow SHALL confiscate the Worker's 0.1 USDT stake
2. WHEN a stake is slashed, THE TaskEscrow SHALL distribute 0.05 USDT to the community reward pool address
3. WHEN a stake is slashed, THE TaskEscrow SHALL distribute 0.05 USDT to the protocol treasury address
4. WHEN a stake is slashed, THE TaskEscrow SHALL invoke ReputationRegistry to increment the Worker's cheating count by 1
5. WHEN a stake is slashed, THE TaskEscrow SHALL reset the task status to "created" so another Worker may accept it within the original 72-hour task lifetime
6. IF an address other than an authorized Relayer_Node calls slashWorker, THEN THE TaskEscrow SHALL revert the transaction
7. WHEN a slash occurs, THE TaskEscrow SHALL emit a Slashed event containing taskId, worker address, slashed amount, reward pool share, treasury share, and reason code

### Requirement 6: ReputationRegistry - Reputation Tracking

[Protocol-Layer | ReputationRegistry]

**User Story:** As the protocol, I want to track Worker reputation across all tasks, so that the network can enforce weighted voting and tier-based access.

#### Acceptance Criteria

1. THE ReputationRegistry SHALL track for each Worker address: cumulative completed tasks, cumulative cheating count, and a Reputation_Score in the inclusive range of 0 to 100
2. WHEN a Worker address interacts with the protocol for the first time, THE ReputationRegistry SHALL initialize that Worker's Reputation_Score to 50
3. WHEN a Worker successfully completes a task and passes verification, THE ReputationRegistry SHALL increase that Worker's Reputation_Score by 1, capped at 100
4. WHEN a Worker is slashed via TaskEscrow.slashWorker, THE ReputationRegistry SHALL increment the Worker's cheating count by 1 and decrease the Reputation_Score by 10, floored at 0
5. IF a Worker's cumulative cheating count reaches 3, THEN THE ReputationRegistry SHALL set a permanent ban flag on that Worker address that prevents future stakeForTask calls
6. THE ReputationRegistry SHALL expose a public view function getReputation(address) returning current Reputation_Score, cheating count, and ban status

### Requirement 7: ReputationRegistry - Sybil Resistance and Cross-Validation

[Protocol-Layer | ReputationRegistry]

**User Story:** As the protocol, I want to prevent Sybil attacks during cross-validation, so that colluding accounts cannot dominate the verification result.

#### Acceptance Criteria

1. WHEN a task triggers cross-validation, THE ReputationRegistry SHALL require a minimum of 3 independent Workers to vote
2. WHEN cross-validation votes are tallied, THE ReputationRegistry SHALL weight each vote by Reputation_Score multiplied by the Worker's stake amount
3. THE ReputationRegistry SHALL accept the majority result only if the weighted votes for the winning side exceed 60% of total weighted votes cast
4. WHEN assigning cross-validators, THE ReputationRegistry SHALL reject any candidate whose device fingerprint shares a /24 IPv4 subnet (or equivalent IPv6 prefix) with another candidate already assigned to the same task
5. WHEN assigning cross-validators, THE ReputationRegistry SHALL reject any candidate whose Worker address was first registered within 48 hours of another candidate already assigned to the same task

### Requirement 8: ReputationRegistry - Relayer Node Registry

[Protocol-Layer | ReputationRegistry]

**User Story:** As the protocol, I want a public registry of Relayer Nodes, so that anyone can verify which nodes are authorized to attest results and what collateral they have at risk.

#### Acceptance Criteria

1. THE ReputationRegistry SHALL expose a registerRelayer function that locks a minimum collateral and registers the caller as an active Relayer_Node
2. THE ReputationRegistry SHALL set the Phase 1 minimum collateral to 0 USDT (the single Phase 1 node is the protocol team) and the Phase 2 minimum collateral to 100 USDT
3. WHEN any caller queries getRelayer(address), THE ReputationRegistry SHALL return the Relayer's registration timestamp, collateral amount, and current status (active, slashed, withdrawn)
4. THE ReputationRegistry SHALL reject submitProof and slashWorker calls on TaskEscrow originating from any address not currently in active Relayer status

### Requirement 9: DataRequirement Schema - Open Schema Definition

[Protocol-Layer | DataRequirement Schema]

**User Story:** As a third-party Requester, I want a public schema for describing what I need, so that I can construct DataRequirement objects without depending on protocol-team SDKs.

#### Acceptance Criteria

1. THE DataRequirement Schema SHALL be a JSON object containing the following required fields: targetLatitude (number), targetLongitude (number), radiusMeters (number, max 500), timeWindowStart (ISO 8601 timestamp), timeWindowEnd (ISO 8601 timestamp), targetCategory (string from a published enum)
2. THE DataRequirement Schema SHALL support the following optional fields: minImageWidthPx (number), minImageHeightPx (number), additionalConstraints (string array)
3. THE DataRequirement Schema definition SHALL be published as a JSON Schema document at a stable, publicly accessible URL versioned by schema version
4. WHEN a Requester creates a task, THE Requester SHALL canonicalize the DataRequirement JSON per RFC 8785 (JSON Canonicalization Scheme) and submit its keccak256 hash as the dataRequirement parameter
5. WHEN a Worker_Client or Relayer_Node retrieves a task, IT SHALL be able to fetch the original DataRequirement JSON from any public storage referenced by the Requester (e.g., IPFS) and verify its hash matches the on-chain commitment

### Requirement 10: Proof Standard - Proof Format

[Protocol-Layer | Proof Standard]

**User Story:** As a Worker_Client developer, I want a public Proof format, so that any conforming client can submit evidence accepted by any conforming Relayer_Node.

#### Acceptance Criteria

1. THE Proof Standard SHALL define a JSON object containing: imageHash (sha256 of original image bytes), capturedLatitude, capturedLongitude, capturedTimestamp (Unix epoch milliseconds), platformAttestation (Android Play Integrity verdict, iOS DeviceCheck token, or equivalent), hardwareSignature (signature over the canonicalized payload by the device's hardware secure element), publicKey (the device's attestation public key)
2. THE Proof Standard SHALL specify ECDSA over secp256r1 (P-256) as the signature algorithm for hardwareSignature when the secure element is Android Keystore or iOS Secure Enclave
3. THE Proof Standard SHALL be published as a JSON Schema document at a stable, publicly accessible URL
4. THE Proof Standard SHALL define an extensibility field hardwareAttestationType (string) so future DePIN hardware nodes can register additional attestation formats without breaking compatibility

### Requirement 11: Proof Standard - Verification Pipeline Specification

[Protocol-Layer | Proof Standard]

**User Story:** As the protocol, I want a fixed Verification Pipeline specification for Phase 1, so that any Relayer Node executing it produces consistent results.

#### Acceptance Criteria

1. THE Verification_Pipeline SHALL execute three layers in order: Layer 1 device-side checks, Layer 2 lightweight AI classification, and Layer 3 deep forensics
2. THE Verification_Pipeline SHALL specify Layer 1 checks as: hardware signature validity over the canonicalized Proof, signed timestamp within 120 seconds of the Relayer's NTP-synchronized clock, signed GPS within 200 meters of DataRequirement.targetLatitude/targetLongitude (or within DataRequirement.radiusMeters if specified), platform attestation verdict negative for emulator and rooted/jailbroken state, no mock-location flag
3. IF any Layer 1 check fails, THEN THE Verification_Pipeline SHALL reject the submission, return the failure code, and SHALL NOT trigger slashing
4. THE Verification_Pipeline SHALL specify Layer 2 as a published reference ResNet model identified by version and weights hash, returning a relevance confidence score in [0.0, 1.0] within 2 seconds
5. THE Verification_Pipeline SHALL apply Layer 2 thresholds as: confidence >= 0.7 passes to settlement; confidence < 0.3 rejects and triggers slashing per Requirement 5; 0.3 <= confidence < 0.7 escalates to Layer 3
6. THE Verification_Pipeline SHALL trigger Layer 3 only when escalated from Layer 2 OR when the task bounty is greater than 1.0 USDT OR when the Requester files a dispute within 24 hours of settlement
7. THE Verification_Pipeline SHALL specify Layer 3 as Error Level Analysis, moire pattern detection, and AIGC detection, with rejection threshold at any check returning fraud confidence >= 0.85
8. THE Verification_Pipeline SHALL cap Layer 3 cost at 0.10 USDT per submission; if the cap is exceeded the Relayer absorbs the overage rather than billing the protocol
9. THE Verification_Pipeline specification (model versions, thresholds, cost caps) SHALL be governed by on-chain parameters that can only be changed by protocol governance, not by individual Relayer Nodes

### Requirement 12: Oracle Protocol - Phase 1 Single-Node TEE Attestation

[Protocol-Layer | Oracle Protocol]

**User Story:** As the protocol, I want a tamper-proof centralized oracle for the MVP, so that verification results are trustworthy despite single-operator centralization.

#### Acceptance Criteria

1. THE Phase 1 Relayer_Node SHALL execute the entire Verification_Pipeline inside an Azure SGX Trusted Execution Environment
2. WHEN a Worker submits a Proof, THE Relayer_Node SHALL run the Verification_Pipeline and call submitProof or slashWorker on TaskEscrow within 30 seconds of receipt
3. WHEN the Relayer_Node starts and every 24 hours thereafter, THE Relayer_Node SHALL produce an SGX attestation report and publish it at a publicly accessible URL specified in its registry entry
4. THE Relayer_Node SHALL expose a public verification endpoint allowing any external party to fetch the latest attestation report and validate it against the expected enclave measurement (MRENCLAVE)
5. IF the SGX enclave fails or restarts, THEN THE Relayer_Node SHALL queue pending Proofs and resume processing within 5 minutes without data loss
6. IF the Verification_Pipeline rejects a submission at Layer 1, THEN THE Relayer_Node SHALL record the rejection with reason code and SHALL NOT call submitProof or slashWorker

### Requirement 13: Oracle Protocol - Phase 2 Optimistic Verification

[Protocol-Layer | Oracle Protocol]

**User Story:** As the protocol, I want permissionless decentralized verification with challenge periods, so that the network is not dependent on a single operator.

#### Acceptance Criteria

1. WHEN any address stakes 100 USDT or more via ReputationRegistry.registerRelayer, THE protocol SHALL register that address as an active Relayer_Node eligible to submit verification results
2. WHEN a Phase 2 Relayer_Node calls submitProof, THE TaskEscrow SHALL move the task to "pending-finalization" status and start a 24-hour challenge period before releasing the bounty
3. IF no challenge is filed within the 24-hour challenge period, THEN THE TaskEscrow SHALL auto-finalize settlement and release the bounty per Requirement 4
4. WHEN any address stakes a 10 USDT challenge bond and calls challengeResult during the challenge period, THE TaskEscrow SHALL freeze the pending settlement and emit a ChallengeOpened event triggering DAO arbitration with a 48-hour voting window
5. IF DAO arbitration majority finds the challenged result incorrect, THEN THE TaskEscrow SHALL slash 100% of the challenged Relayer_Node's collateral, award 50% of the slashed amount to the challenger, and re-process the task verification
6. IF DAO arbitration majority upholds the challenged result, THEN THE TaskEscrow SHALL forfeit the challenger's 10 USDT bond, transferring 100% of it to the challenged Relayer_Node, and finalize the original settlement
7. THE Phase 2 Relayer_Node SHALL allow any address meeting the 100 USDT collateral requirement to register and submit results without protocol-team approval

### Requirement 14: SDK Reference Library

[Protocol-Layer | SDK]

**User Story:** As a third-party developer, I want a JavaScript SDK that wraps the protocol contracts and standards, so that I can integrate QuestLens with minimal code, while retaining the option to call contracts directly.

#### Acceptance Criteria

1. THE QuestLens_SDK SHALL expose a createTask method accepting budget (number), dataRequirement (object conforming to Requirement 9), and a signer instance, returning the assigned taskId after on-chain confirmation
2. THE QuestLens_SDK SHALL expose a getTaskStatus method that accepts a taskId and returns the current status from the enum: created, accepted, submitted, pending-finalization, verified, settled, refunded, slashed
3. THE QuestLens_SDK SHALL expose a getTaskResult method that accepts a taskId and returns the verified imageHash, capturedLatitude, capturedLongitude, capturedTimestamp, and worker address for tasks in "settled" status
4. THE QuestLens_SDK SHALL be published as an npm package and SHALL include TypeScript type definitions for all public methods, parameters, and return types
5. THE QuestLens_SDK SHALL accept any signer instance compatible with EIP-1193 or Injective's wallet adapter, including Account_Abstraction_Wallet implementations, without requiring a specific wallet provider
6. IF an SDK call fails due to network error, insufficient balance, or invalid parameters, THEN THE SDK SHALL reject the returned Promise with a structured error object containing failure category and human-readable description
7. IF a developer calls getTaskResult on a task not yet in "settled" status, THEN THE SDK SHALL reject the Promise with an error indicating the task is not yet settled
8. THE protocol SHALL guarantee that any third party can construct equivalent on-chain interactions without using the SDK by following the published contract ABI, DataRequirement Schema, and Proof Standard

### Requirement 15: Protocol Governance and Parameter Updates

[Protocol-Layer | Governance]

**User Story:** As a protocol participant, I want a clearly defined governance path for changing protocol parameters, so that economic and verification parameters cannot be changed unilaterally.

#### Acceptance Criteria

1. THE protocol SHALL designate the following as governance-controlled parameters: bounty range (0.5-2.0 USDT), Worker stake amount (0.1 USDT), protocol fee percentage (5%), slash distribution split (50/50), task acceptance timeout (72h), submission deadline (1h), Verification_Pipeline thresholds, Layer 3 cost cap (0.10 USDT), Phase 2 Relayer collateral (100 USDT), challenge bond (10 USDT), challenge period (24h), DAO voting window (48h)
2. WHEN a governance proposal to change any parameter is approved on-chain, THE TaskEscrow and ReputationRegistry contracts SHALL apply the new parameter only to tasks created after the proposal's effective block
3. THE TaskEscrow and ReputationRegistry contracts SHALL reject any direct parameter mutation that does not originate from the authorized governance address
4. THE protocol SHALL publish all governance-controlled parameter values via on-chain view functions accessible to any caller

### Requirement 16: Reference Worker Client - Telegram Mini App Onboarding

[Reference-Implementation | Non-Normative]

**User Story:** As a Worker using the reference client, I want to participate without downloading a standalone app or managing crypto keys, so that I can start earning immediately.

#### Acceptance Criteria

1. WHEN a Worker opens the Telegram Mini App for the first time, THE Telegram Mini App SHALL generate an Account_Abstraction_Wallet linked to the Worker's Telegram user identity within 5 seconds and display a confirmation
2. IF wallet generation fails due to network error or service unavailability, THEN THE Telegram Mini App SHALL display an error message and provide a retry option
3. THE Account_Abstraction_Wallet SHALL execute on-chain transactions without exposing seed phrases, private keys, or signing prompts to the Worker
4. THE Account_Abstraction_Wallet SHALL sponsor all gas fee payments via the protocol so that the Worker is never charged gas fees and no gas-related information is displayed
5. THE Telegram Mini App SHALL request camera permission and provide photo capture functionality within the Telegram interface
6. IF the Worker denies camera permission, THEN THE Telegram Mini App SHALL display a message indicating camera access is required and prompt the Worker to grant permission
7. WHEN a Worker reopens the Telegram Mini App after initial onboarding, THE Telegram Mini App SHALL restore the previously generated Account_Abstraction_Wallet without requiring login or recovery steps
8. THE Telegram Mini App SHALL produce Proofs conforming to the Proof Standard (Requirement 10) so that submissions are accepted by any conforming Relayer_Node

### Requirement 17: Reference Worker Client - Gamification and Retention

[Reference-Implementation | Non-Normative]

**User Story:** As a Worker using the reference client, I want gamified retention features, so that consistent participation feels rewarding.

#### Acceptance Criteria

1. THE Telegram Mini App SHALL display the Worker's current Reputation_Score, cumulative completed tasks, and active streak counter
2. WHEN a Worker completes tasks on at least 3 consecutive UTC calendar days where each day's task location is within 500 meters of at least one task location from the previous day, THE Telegram Mini App SHALL display a "territory patrol" badge and call ReputationRegistry to apply a +5 Reputation_Score bonus on the third consecutive day and +2 for each additional consecutive day
3. IF a Worker fails to complete any task within a UTC calendar day, THEN THE Telegram Mini App SHALL reset the active streak counter to zero
4. THE Telegram Mini App SHALL display a tier indicator showing whether the Worker currently has access to high-value tasks (Reputation_Score >= 80)
5. THE gamification logic in this Requirement is implemented by the reference client and is not part of the protocol; alternative Worker clients may implement different retention mechanisms

### Requirement 18: Reference Demo Frontend - Hackathon Golden Path

[Reference-Implementation | Non-Normative]

**User Story:** As a hackathon judge, I want to see the end-to-end flow from task creation to instant payment, so that the protocol's core value proposition is demonstrated.

#### Acceptance Criteria

1. WHEN a judge clicks "create task" on the demo frontend, THE demo frontend SHALL call TaskEscrow.createTask with a 1 USDT budget on the Injective testnet and SHALL display the lock transaction hash within 15 seconds
2. WHEN a task is created, THE Telegram Mini App SHALL deliver a notification to the pre-assigned demo Worker via Telegram Bot within 5 seconds
3. WHEN the demo Worker captures and submits a photo via the Telegram Mini App, THE Relayer_Node SHALL run the Verification_Pipeline and THE demo frontend SHALL display the verification status and AI confidence result within 10 seconds
4. WHEN verification passes, THE TaskEscrow SHALL transfer 0.95 USDT to the Worker (1 USDT minus 5% protocol fee) and THE demo frontend SHALL display the Injective testnet transaction hash within 5 seconds
5. THE demo frontend SHALL display a step-progress indicator covering: task created, worker notified, photo submitted, verification in progress, payment complete
6. THE end-to-end demo flow from "create task" click to payment confirmation SHALL complete within 120 seconds under normal testnet conditions
7. IF any step fails or times out, THEN THE demo frontend SHALL display which step failed and provide a "retry" control to restart the demo
8. THE demo frontend is a non-normative reference implementation; it demonstrates protocol-layer behavior using the reference SDK and reference Worker_Client
