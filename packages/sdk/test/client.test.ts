import {strict as assert} from "node:assert";
import {test} from "node:test";

import {ZeroAddress} from "ethers";

import {
  InvalidParameterError,
  QuestLensClient,
  TASK_STATUS_BY_INDEX,
  TaskNotSettledError,
} from "../src/index.js";

test("constructor rejects zero address taskEscrow", () => {
  assert.throws(
    () =>
      new QuestLensClient({
        taskEscrow: ZeroAddress,
        // @ts-expect-error - testing runtime validation
        provider: {} as never,
      }),
    (err: unknown) => err instanceof InvalidParameterError,
  );
});

test("constructor rejects when neither signer nor provider provided", () => {
  assert.throws(
    () =>
      new QuestLensClient({
        taskEscrow: "0x0000000000000000000000000000000000000001",
      }),
    (err: unknown) => err instanceof InvalidParameterError,
  );
});

test("TaskNotSettledError carries category and taskId metadata", () => {
  const err = new TaskNotSettledError("42", "accepted");
  assert.equal(err.category, "TASK_NOT_SETTLED");
  assert.match(err.message, /Task 42/);
  assert.match(err.message, /accepted/);
});

test("TASK_STATUS_BY_INDEX matches the enum order in TaskEscrow.sol", () => {
  // Mirror of ITaskEscrow.TaskStatus
  assert.deepEqual(TASK_STATUS_BY_INDEX, [
    "none",
    "created",
    "accepted",
    "pending-finalization",
    "settled",
    "refunded",
    "slashed",
  ]);
});
