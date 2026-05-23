/**
 * Runtime configuration for the demo. Reads from Vite env vars so the
 * single-page app can be re-targeted between local anvil and Injective testnet
 * without rebuilding the bundle.
 */

export interface DemoConfig {
  rpcUrl: string;
  taskEscrowAddress: string;
  mockUsdtAddress: string;
  /** Anvil/local: pre-funded private key for the Requester role. Demo only. */
  requesterPrivateKey: string;
  /** Anvil/local: pre-funded private key for the Worker role. Demo only. */
  workerPrivateKey: string;
  /** URL of the running Relayer ingest endpoint. */
  relayerUrl: string;
  /** Demo task location. */
  targetLatitude: number;
  targetLongitude: number;
  targetCategory: string;
  bountyDecimals: number; // 6 for mUSDT
  bountyAmount: bigint; // smallest units, e.g. 1_000_000n = 1.0 USDT
  workerStakeAmount: bigint; // smallest units, e.g. 100_000n = 0.1 USDT
}

function readEnv(key: string, fallback?: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing Vite env var ${key}`);
}

export function loadConfig(): DemoConfig {
  return {
    rpcUrl: readEnv("VITE_RPC_URL", "http://127.0.0.1:8545"),
    taskEscrowAddress: readEnv("VITE_TASK_ESCROW", ""),
    mockUsdtAddress: readEnv("VITE_MOCK_USDT", ""),
    /** Anvil deterministic account #1 - publicly known test key, NOT a real secret. */
    requesterPrivateKey: readEnv(
      "VITE_REQUESTER_KEY",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    ),
    /** Anvil deterministic account #2 - publicly known test key, NOT a real secret. */
    workerPrivateKey: readEnv(
      "VITE_WORKER_KEY",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    ),
    relayerUrl: readEnv("VITE_RELAYER_URL", "http://127.0.0.1:3000"),
    targetLatitude: Number(readEnv("VITE_TARGET_LAT", "31.230416")),
    targetLongitude: Number(readEnv("VITE_TARGET_LON", "121.473701")),
    targetCategory: readEnv("VITE_TARGET_CATEGORY", "storefront"),
    bountyDecimals: 6,
    bountyAmount: 1_000_000n,
    workerStakeAmount: 100_000n,
  };
}
