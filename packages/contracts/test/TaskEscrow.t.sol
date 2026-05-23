// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {TaskEscrow} from "../src/TaskEscrow.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {ITaskEscrow} from "../src/interfaces/ITaskEscrow.sol";
import {IReputationRegistry} from "../src/interfaces/IReputationRegistry.sol";
import {MockUSDT} from "../src/test/MockUSDT.sol";

/// @title TaskEscrowTest
/// @notice Covers the happy path and key revert cases for TaskEscrow.
contract TaskEscrowTest is Test {
    TaskEscrow internal escrow;
    ReputationRegistry internal registry;
    MockUSDT internal usdt;

    address internal governance = makeAddr("governance");
    address internal treasury = makeAddr("treasury");
    address internal rewardPool = makeAddr("rewardPool");
    address internal relayer = makeAddr("relayer");
    address internal requester = makeAddr("requester");
    address internal worker = makeAddr("worker");

    uint128 internal constant BUDGET = 1_000_000; // 1.0 USDT (6 decimals)
    uint128 internal constant STAKE = 100_000; // 0.1 USDT
    bytes32 internal constant DR = bytes32(uint256(0xDEADBEEF));

    function setUp() public {
        usdt = new MockUSDT();
        registry = new ReputationRegistry(governance, 0);

        ITaskEscrow.Parameters memory params = ITaskEscrow.Parameters({
            minBounty: 500_000,
            maxBounty: 2_000_000,
            workerStakeAmount: STAKE,
            protocolFeeBps: 500,
            slashRewardPoolBps: 5000,
            slashTreasuryBps: 5000,
            taskTimeout: 72 hours,
            submissionDeadline: 1 hours,
            challengePeriod: 24 hours,
            layer3CostCap: 100_000
        });
        escrow = new TaskEscrow(IReputationRegistry(address(registry)), governance, treasury, rewardPool, params);

        // Wire registry -> escrow and bootstrap the demo Relayer with zero collateral.
        vm.startPrank(governance);
        registry.setTaskEscrow(address(escrow));
        registry.bootstrapRelayer(relayer, "https://relayer.questlens.io/attestation/latest.json");
        escrow.setStablecoinAllowed(address(usdt), true);
        vm.stopPrank();

        // Fund and approve the requester and worker.
        usdt.mint(requester, 10_000_000);
        usdt.mint(worker, 10_000_000);
        vm.prank(requester);
        usdt.approve(address(escrow), type(uint256).max);
        vm.prank(worker);
        usdt.approve(address(escrow), type(uint256).max);
    }

    // ---------------- createTask ----------------

    function test_createTask_locksBudget() public {
        vm.prank(requester);
        uint256 taskId = escrow.createTask(address(usdt), BUDGET, DR);

        assertEq(taskId, 1);
        assertEq(usdt.balanceOf(address(escrow)), BUDGET);
        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(t.requester, requester);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Created));
        assertEq(t.budget, BUDGET);
    }

    function test_createTask_revertsBelowMin() public {
        vm.prank(requester);
        vm.expectRevert(
            abi.encodeWithSelector(ITaskEscrow.BountyOutOfRange.selector, uint128(500_000), uint128(2_000_000), uint128(400_000))
        );
        escrow.createTask(address(usdt), 400_000, DR);
    }

    function test_createTask_revertsAboveMax() public {
        vm.prank(requester);
        vm.expectRevert(
            abi.encodeWithSelector(ITaskEscrow.BountyOutOfRange.selector, uint128(500_000), uint128(2_000_000), uint128(3_000_000))
        );
        escrow.createTask(address(usdt), 3_000_000, DR);
    }

    function test_createTask_revertsUnknownStablecoin() public {
        MockUSDT other = new MockUSDT();
        vm.prank(requester);
        vm.expectRevert(abi.encodeWithSelector(ITaskEscrow.AllowedStablecoinOnly.selector, address(other)));
        escrow.createTask(address(other), BUDGET, DR);
    }

    // ---------------- stakeForTask ----------------

    function test_stakeForTask_locksWorkerStake() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Accepted));
        assertEq(t.worker, worker);
        assertEq(t.workerStake, STAKE);
        assertEq(usdt.balanceOf(address(escrow)), BUDGET + STAKE);
    }

    function test_stakeForTask_revertsIfAlreadyAccepted() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        address worker2 = makeAddr("worker2");
        usdt.mint(worker2, STAKE);
        vm.prank(worker2);
        usdt.approve(address(escrow), STAKE);
        vm.prank(worker2);
        vm.expectRevert(
            abi.encodeWithSelector(
                ITaskEscrow.InvalidTaskStatus.selector,
                ITaskEscrow.TaskStatus.Created,
                ITaskEscrow.TaskStatus.Accepted
            )
        );
        escrow.stakeForTask(taskId);
    }

    // ---------------- submitProof (settlement) ----------------

    function test_submitProof_paysWorkerAndFee() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        uint128 expectedFee = uint128((uint256(BUDGET) * 500) / 10_000); // 5%
        uint128 expectedToWorker = BUDGET - expectedFee + STAKE;

        uint256 workerBefore = usdt.balanceOf(worker);
        uint256 treasuryBefore = usdt.balanceOf(treasury);

        vm.prank(relayer);
        escrow.submitProof(taskId, worker, bytes32("imageHash"), bytes32("OK"));

        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Settled));
        assertEq(usdt.balanceOf(worker) - workerBefore, expectedToWorker);
        assertEq(usdt.balanceOf(treasury) - treasuryBefore, expectedFee);
        assertEq(usdt.balanceOf(address(escrow)), 0);

        (uint16 score, uint16 cheats, bool banned) = registry.getReputation(worker);
        assertEq(score, 51); // initialized to 50, +1 for completion
        assertEq(cheats, 0);
        assertFalse(banned);
    }

    function test_submitProof_revertsForUnauthorized() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        address impostor = makeAddr("impostor");
        vm.prank(impostor);
        vm.expectRevert(abi.encodeWithSelector(ITaskEscrow.UnauthorizedRelayer.selector, impostor));
        escrow.submitProof(taskId, worker, bytes32("imageHash"), bytes32("OK"));
    }

    // ---------------- slashWorker ----------------

    function test_slashWorker_splitsStake5050AndReopensTask() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        uint256 rewardPoolBefore = usdt.balanceOf(rewardPool);
        uint256 treasuryBefore = usdt.balanceOf(treasury);

        vm.prank(relayer);
        escrow.slashWorker(taskId, worker, bytes32("IRRELEVANT_CONTENT"));

        // 50/50 split of 0.1 USDT stake.
        assertEq(usdt.balanceOf(rewardPool) - rewardPoolBefore, STAKE / 2);
        assertEq(usdt.balanceOf(treasury) - treasuryBefore, STAKE / 2);

        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Created));
        assertEq(t.worker, address(0));
        assertEq(t.workerStake, 0);

        (uint16 score, uint16 cheats,) = registry.getReputation(worker);
        assertEq(cheats, 1);
        assertEq(score, 40); // 50 - 10 penalty
    }

    function test_slashWorker_thirdSlashBansWorker() public {
        for (uint256 i = 0; i < 3; i++) {
            uint256 taskId = _createTask();
            vm.prank(worker);
            escrow.stakeForTask(taskId);
            vm.prank(relayer);
            escrow.slashWorker(taskId, worker, bytes32("IRRELEVANT_CONTENT"));
        }

        (, uint16 cheats, bool banned) = registry.getReputation(worker);
        assertEq(cheats, 3);
        assertTrue(banned);

        uint256 newTaskId = _createTask();
        vm.prank(worker);
        vm.expectRevert(abi.encodeWithSelector(ITaskEscrow.WorkerBanned.selector, worker));
        escrow.stakeForTask(newTaskId);
    }

    // ---------------- claimRefund ----------------

    function test_claimRefund_after72hWhenNoWorker() public {
        uint256 taskId = _createTask();
        vm.warp(block.timestamp + 72 hours + 1);

        uint256 requesterBefore = usdt.balanceOf(requester);
        vm.prank(requester);
        escrow.claimRefund(taskId);

        assertEq(usdt.balanceOf(requester) - requesterBefore, BUDGET);
        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Refunded));
    }

    function test_claimRefund_revertsBeforeTimeout() public {
        uint256 taskId = _createTask();
        vm.warp(block.timestamp + 1 hours);
        vm.prank(requester);
        vm.expectRevert(); // TimeoutNotElapsed with positive remaining
        escrow.claimRefund(taskId);
    }

    function test_claimRefund_after1hSubmissionMissedSlashesAndRefunds() public {
        uint256 taskId = _createTask();
        vm.prank(worker);
        escrow.stakeForTask(taskId);

        vm.warp(block.timestamp + 1 hours + 1);

        uint256 requesterBefore = usdt.balanceOf(requester);
        uint256 rewardPoolBefore = usdt.balanceOf(rewardPool);
        uint256 treasuryBefore = usdt.balanceOf(treasury);

        vm.prank(requester);
        escrow.claimRefund(taskId);

        assertEq(usdt.balanceOf(requester) - requesterBefore, BUDGET);
        assertEq(usdt.balanceOf(rewardPool) - rewardPoolBefore, STAKE / 2);
        assertEq(usdt.balanceOf(treasury) - treasuryBefore, STAKE / 2);

        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        assertEq(uint8(t.status), uint8(ITaskEscrow.TaskStatus.Refunded));
    }

    function test_claimRefund_revertsForNonRequester() public {
        uint256 taskId = _createTask();
        vm.warp(block.timestamp + 72 hours + 1);
        address other = makeAddr("other");
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(ITaskEscrow.UnauthorizedRequester.selector, other, requester));
        escrow.claimRefund(taskId);
    }

    // ---------------- helpers ----------------

    function _createTask() internal returns (uint256 taskId) {
        vm.prank(requester);
        taskId = escrow.createTask(address(usdt), BUDGET, DR);
    }
}
