// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

import {TaskEscrow} from "../../src/TaskEscrow.sol";
import {ReputationRegistry} from "../../src/ReputationRegistry.sol";
import {ITaskEscrow} from "../../src/interfaces/ITaskEscrow.sol";
import {IReputationRegistry} from "../../src/interfaces/IReputationRegistry.sol";
import {MockUSDT} from "../../src/test/MockUSDT.sol";

/// @title Handler
/// @notice Handler contract that drives the protocol with bounded random inputs
///         under Foundry's invariant fuzzer. Each `do*` function is one possible
///         action a participant can take; the fuzzer picks call sequences and
///         verifies the protocol's invariants hold across all of them.
/// @dev Per design.md Properties 1-7 (the Phase 1 contract-level invariants).
contract Handler is Test {
    TaskEscrow public escrow;
    ReputationRegistry public registry;
    MockUSDT public usdt;

    address public governance;
    address public treasury;
    address public rewardPool;
    address public relayer;

    address[] public requesters;
    address[] public workers;

    /// @notice Tasks that have been created during this run, used to drive
    ///         later actions (stake, submitProof, slash, refund) against an
    ///         actually-existing taskId rather than burning fuzzer cycles on
    ///         non-existent ids.
    uint256[] public createdTasks;

    /// @notice Counters for assertion-time accounting.
    uint256 public ghost_totalBudgetLocked; // sum of budgets currently in escrow custody
    uint256 public ghost_totalStakeLocked; // sum of worker stakes currently in escrow custody
    uint256 public ghost_totalPaidToWorkers;
    uint256 public ghost_totalProtocolFee;
    uint256 public ghost_totalSlashedToTreasury;
    uint256 public ghost_totalSlashedToRewardPool;
    uint256 public ghost_totalRefunded;

    constructor(
        TaskEscrow escrow_,
        ReputationRegistry registry_,
        MockUSDT usdt_,
        address governance_,
        address treasury_,
        address rewardPool_,
        address relayer_,
        address[] memory requesters_,
        address[] memory workers_
    ) {
        escrow = escrow_;
        registry = registry_;
        usdt = usdt_;
        governance = governance_;
        treasury = treasury_;
        rewardPool = rewardPool_;
        relayer = relayer_;
        requesters = requesters_;
        workers = workers_;
    }

    function getCreatedTasksLength() external view returns (uint256) {
        return createdTasks.length;
    }

    // ---------------- actions ----------------

    function doCreateTask(uint256 reqIdx, uint128 budget) external {
        address requester = requesters[reqIdx % requesters.length];
        // Bound the budget to the protocol's accepted range to maximize the
        // useful state transitions; out-of-range tries already get tested in
        // the unit-test suite (TaskEscrow.t.sol).
        budget = uint128(bound(budget, 500_000, 2_000_000));

        if (usdt.balanceOf(requester) < budget) return;

        vm.startPrank(requester);
        usdt.approve(address(escrow), budget);
        try escrow.createTask(address(usdt), budget, keccak256(abi.encode(block.timestamp, reqIdx))) returns (
            uint256 taskId
        ) {
            createdTasks.push(taskId);
            ghost_totalBudgetLocked += budget;
        } catch {
            // intentional: bad bounds may revert, fuzzer keeps going
        }
        vm.stopPrank();
    }

    function doStakeForTask(uint256 workerIdx, uint256 taskIdx) external {
        if (createdTasks.length == 0) return;
        address worker = workers[workerIdx % workers.length];
        uint256 taskId = createdTasks[taskIdx % createdTasks.length];

        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        if (t.status != ITaskEscrow.TaskStatus.Created) return;

        ITaskEscrow.Parameters memory p = escrow.params();
        if (usdt.balanceOf(worker) < p.workerStakeAmount) return;

        vm.startPrank(worker);
        usdt.approve(address(escrow), p.workerStakeAmount);
        try escrow.stakeForTask(taskId) {
            ghost_totalStakeLocked += p.workerStakeAmount;
        } catch {}
        vm.stopPrank();
    }

    function doSubmitProof(uint256 taskIdx) external {
        if (createdTasks.length == 0) return;
        uint256 taskId = createdTasks[taskIdx % createdTasks.length];
        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        if (t.status != ITaskEscrow.TaskStatus.Accepted) return;

        ITaskEscrow.Parameters memory p = escrow.params();
        uint128 fee = uint128((uint256(t.budget) * p.protocolFeeBps) / 10_000);
        uint128 paidToWorker = t.budget - fee;
        uint128 stake = t.workerStake;

        vm.startPrank(relayer);
        try escrow.submitProof(taskId, t.worker, bytes32("img"), bytes32("OK")) {
            ghost_totalBudgetLocked -= t.budget;
            ghost_totalStakeLocked -= stake;
            ghost_totalPaidToWorkers += paidToWorker;
            ghost_totalProtocolFee += fee;
        } catch {}
        vm.stopPrank();
    }

    function doSlashWorker(uint256 taskIdx) external {
        if (createdTasks.length == 0) return;
        uint256 taskId = createdTasks[taskIdx % createdTasks.length];
        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        if (t.status != ITaskEscrow.TaskStatus.Accepted) return;

        ITaskEscrow.Parameters memory p = escrow.params();
        uint128 stake = t.workerStake;
        uint128 toRewardPool = uint128((uint256(stake) * p.slashRewardPoolBps) / 10_000);
        uint128 toTreasury = stake - toRewardPool;

        vm.startPrank(relayer);
        try escrow.slashWorker(taskId, t.worker, bytes32("FRAUD")) {
            ghost_totalStakeLocked -= stake;
            ghost_totalSlashedToRewardPool += toRewardPool;
            ghost_totalSlashedToTreasury += toTreasury;
        } catch {}
        vm.stopPrank();
    }

    function doClaimRefund(uint256 taskIdx, uint256 elapseHours) external {
        if (createdTasks.length == 0) return;
        uint256 taskId = createdTasks[taskIdx % createdTasks.length];
        ITaskEscrow.Task memory t = escrow.tasks(taskId);
        if (t.status != ITaskEscrow.TaskStatus.Created && t.status != ITaskEscrow.TaskStatus.Accepted) {
            return;
        }
        // Time-warp by a bounded amount so the timeout branch can fire.
        elapseHours = bound(elapseHours, 0, 96);
        vm.warp(block.timestamp + elapseHours * 1 hours);

        uint128 budget = t.budget;
        uint128 stake = t.workerStake;
        ITaskEscrow.Parameters memory p = escrow.params();
        uint128 toRewardPool = uint128((uint256(stake) * p.slashRewardPoolBps) / 10_000);
        uint128 toTreasury = stake - toRewardPool;

        vm.startPrank(t.requester);
        try escrow.claimRefund(taskId) {
            ghost_totalBudgetLocked -= budget;
            ghost_totalRefunded += budget;
            if (stake > 0) {
                ghost_totalStakeLocked -= stake;
                ghost_totalSlashedToRewardPool += toRewardPool;
                ghost_totalSlashedToTreasury += toTreasury;
            }
        } catch {}
        vm.stopPrank();
    }
}
