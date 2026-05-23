#!/usr/bin/env bash
# Deploy contracts to the running anvil and capture the addresses.
#
# This calls the same Deploy.s.sol script used for testnet. The script
# auto-bootstraps the demo Relayer and mints mUSDT to the demo Requester
# and Worker addresses.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if ! is_port_listening "$ANVIL_PORT"; then
  fail "anvil is not running on :$ANVIL_PORT"
  fail "run \`make chain-up\` first"
  exit 1
fi

say "deploying contracts to local anvil"

DEPLOYER_PRIVATE_KEY="$DEPLOYER_KEY" \
  forge script "$ROOT/packages/contracts/script/Deploy.s.sol" \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --root "$ROOT/packages/contracts" \
  > "$STATE_DIR/deploy.log" 2>&1

if ! grep -q "ONCHAIN EXECUTION COMPLETE" "$STATE_DIR/deploy.log"; then
  fail "deploy failed (check $STATE_DIR/deploy.log)"
  tail -20 "$STATE_DIR/deploy.log"
  exit 1
fi

# Persist addresses for downstream consumers.
cat > "$STATE_DIR/addresses.env" <<EOF
MOCK_USDT_ADDRESS=$MOCK_USDT_ADDR
REPUTATION_REGISTRY_ADDRESS=$REPUTATION_REGISTRY_ADDR
TASK_ESCROW_ADDRESS=$TASK_ESCROW_ADDR
EOF

ok "contracts deployed"
ok "  MockUSDT           = $MOCK_USDT_ADDR"
ok "  ReputationRegistry = $REPUTATION_REGISTRY_ADDR"
ok "  TaskEscrow         = $TASK_ESCROW_ADDR"
