#!/usr/bin/env bash
# Start the Relayer service in the background.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if is_port_listening "$RELAYER_PORT"; then
  warn "relayer already listening on :$RELAYER_PORT"
  exit 0
fi

if ! is_port_listening "$ANVIL_PORT"; then
  fail "anvil not running on :$ANVIL_PORT"
  exit 1
fi

say "starting relayer on :$RELAYER_PORT"

RELAYER_DIR="$ROOT/packages/relayer"
cd "$RELAYER_DIR"

INJECTIVE_TESTNET_RPC="$RPC_URL" \
TASK_ESCROW_ADDRESS="$TASK_ESCROW_ADDR" \
RELAYER_PRIVATE_KEY="$DEPLOYER_KEY" \
PORT="$RELAYER_PORT" \
RELAYER_STORAGE_DIR="$STATE_DIR/relayer-storage" \
MOCK_ATTESTATION="true" \
nohup node --import tsx src/server/main.ts > "$STATE_DIR/relayer.log" 2>&1 &

echo $! > "$STATE_DIR/relayer.pid"
wait_for_port "$RELAYER_PORT" 15 "relayer"

# Health check
HEALTH=$(curl -s "http://127.0.0.1:$RELAYER_PORT/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "relayer health: $HEALTH"
else
  fail "relayer health check failed: $HEALTH"
  exit 1
fi
