/**
 * SDK integration test against a freshly spawned anvil instance.
 *
 * Not run by default (excluded via package.json `test` script). Run with:
 *   pnpm --filter @questlens/sdk run test:integration
 *
 * The default unit tests (client.test.ts) cover the synchronous parts of the
 * SDK without needing a chain.
 */

import {strict as assert} from "node:assert";
import {test} from "node:test";

import {QuestLensClient, TaskNotSettledError} from "../src/index.js";
import {startAnvilFixture, type DeployedFixture} from "./anvilFixture.js";

test(
  "QuestLensClient end-to-end against anvil",
  {timeout: 60_000},
  async (t) => {
    const fx: DeployedFixture = await startAnvilFixture(8546);

    try {
      await t.test("createTask emits TaskCreated and getTaskStatus reflects 'created'", async () => {
        const client = new QuestLensClient({
          taskEscrow: fx.taskEscrow,
          signer: fx.requester,
        });

        const result = await client.createTask({
          budget: 1_000_000n,
          stablecoin: fx.mockUsdt,
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

        assert.equal(result.taskId, 1n);
        assert.match(result.txHash, /^0x[0-9a-f]{64}$/);
        assert.match(result.dataRequirementHash, /^0x[0-9a-f]{64}$/);

        const status = await client.getTaskStatus(result.taskId);
        assert.equal(status, "created");
      });

      await t.test("getTaskResult rejects with TaskNotSettledError before settlement", async () => {
        const client = new QuestLensClient({
          taskEscrow: fx.taskEscrow,
          provider: fx.provider,
        });
        await assert.rejects(
          () => client.getTaskResult(1n),
          (err: unknown) => err instanceof TaskNotSettledError,
        );
      });
    } finally {
      fx.provider.destroy();
      await fx.stop();
    }
  },
);
