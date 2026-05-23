import {useMemo} from "react";
import {JsonRpcProvider, Wallet} from "ethers";
import {QuestLensClient} from "@questlens/sdk";

import {loadConfig, type DemoConfig} from "../lib/config.js";

export type Role = "requester" | "worker";

export interface ChainContext {
  config: DemoConfig;
  provider: JsonRpcProvider;
  requester: Wallet;
  worker: Wallet;
  /** A read-only client (provider only) for listing tasks. */
  readonlyClient: QuestLensClient;
  /** Build a signing client for the given role. */
  clientFor: (role: Role) => QuestLensClient;
  walletFor: (role: Role) => Wallet;
}

export function useChain(): ChainContext {
  return useMemo(() => {
    const config = loadConfig();
    const provider = new JsonRpcProvider(config.rpcUrl);
    const requester = new Wallet(config.requesterPrivateKey, provider);
    const worker = new Wallet(config.workerPrivateKey, provider);
    const readonlyClient = new QuestLensClient({
      taskEscrow: config.taskEscrowAddress,
      provider,
    });
    return {
      config,
      provider,
      requester,
      worker,
      readonlyClient,
      clientFor: (role) =>
        new QuestLensClient({
          taskEscrow: config.taskEscrowAddress,
          signer: role === "requester" ? requester : worker,
        }),
      walletFor: (role) => (role === "requester" ? requester : worker),
    };
  }, []);
}
