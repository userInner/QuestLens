/**
 * Seed the local TaskEscrow with a handful of demo tasks so the marketplace
 * page has content the moment you open it.
 *
 * Note: tasks are only visible in the Worker browse page if their on-chain
 * dataRequirement hash matches a JSON entry in the browser's localStorage.
 * For the demo we add the task entries to BOTH the on-chain state and a
 * localStorage seed file (printed at the end) which the frontend will
 * import on first load.
 */

/* eslint-disable no-console */
import {writeFileSync} from "node:fs";

import {JsonRpcProvider, Wallet} from "ethers";

import type {DataRequirementV1, TargetCategory} from "@questlens/schemas";
import {hashDataRequirement} from "@questlens/schemas";
import {QuestLensClient} from "@questlens/sdk";

const RPC = "http://127.0.0.1:8545";
const TASK_ESCROW = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const MOCK_USDT = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const REQUESTER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

interface Seed {
  category: TargetCategory;
  lat: number;
  lon: number;
  radius: number;
  bountyMicros: number;
}

const SEEDS: Seed[] = [
  {category: "storefront", lat: 31.230416, lon: 121.473701, radius: 80, bountyMicros: 1_000_000},
  {category: "traffic_sign", lat: 31.234000, lon: 121.480000, radius: 100, bountyMicros: 1_500_000},
  {category: "vehicle_damage", lat: 31.225200, lon: 121.475800, radius: 150, bountyMicros: 2_000_000},
  {category: "construction_site", lat: 31.228700, lon: 121.470500, radius: 200, bountyMicros: 800_000},
  {category: "weather_phenomenon", lat: 31.232000, lon: 121.478500, radius: 300, bountyMicros: 600_000},
];

async function main(): Promise<void> {
  const provider = new JsonRpcProvider(RPC);
  const requester = new Wallet(REQUESTER_KEY, provider);
  const client = new QuestLensClient({taskEscrow: TASK_ESCROW, signer: requester});

  const localStorageSeed: Record<string, DataRequirementV1> = {};

  for (const seed of SEEDS) {
    const dr: DataRequirementV1 = {
      schemaVersion: "1.0",
      targetLatitude: seed.lat,
      targetLongitude: seed.lon,
      radiusMeters: seed.radius,
      timeWindowStart: new Date(Date.now() - 60_000).toISOString(),
      timeWindowEnd: new Date(Date.now() + 24 * 3600_000).toISOString(),
      targetCategory: seed.category,
    };
    const {hash} = hashDataRequirement(dr);
    const result = await client.createTask({
      budget: BigInt(seed.bountyMicros),
      stablecoin: MOCK_USDT,
      dataRequirement: dr,
    });
    console.log(`  seeded task ${result.taskId} (${seed.category}, ${seed.bountyMicros / 1e6} mUSDT)`);
    localStorageSeed[hash.toLowerCase()] = dr;
  }

  // Emit a JSON file the frontend can import on first load.
  const outPath = "../demo-frontend/public/seed-tasks.json";
  writeFileSync(outPath, JSON.stringify(localStorageSeed, null, 2));
  console.log(`\nWrote ${Object.keys(localStorageSeed).length} entries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
