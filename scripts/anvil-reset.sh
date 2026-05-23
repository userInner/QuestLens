#!/usr/bin/env bash
# Reset the running anvil chain to a clean genesis state and redeploy.
# Faster than restarting the anvil process (~200ms vs ~3s).

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if ! is_port_listening "$ANVIL_PORT"; then
  fail "anvil not running"
  exit 1
fi

say "anvil_reset: wiping chain state"
RES=$(curl -s -X POST -H "content-type:application/json" \
  --data '{"jsonrpc":"2.0","method":"anvil_reset","params":[],"id":1}' \
  "$RPC_URL")
if ! echo "$RES" | grep -q '"result":null'; then
  fail "anvil_reset failed: $RES"
  exit 1
fi

# Relayer caches the wallet object, but ethers reads chainId/nonce on each tx,
# so the relayer service stays valid across resets without a restart.

"$ROOT/scripts/deploy-local.sh"
