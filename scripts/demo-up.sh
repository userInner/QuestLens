#!/usr/bin/env bash
# One-shot Demo Day bootstrap: anvil + deploy + relayer + frontend.
#
# Idempotent: if any service is already running we reuse it. To start fresh,
# run `make demo-reset` instead.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

T0=$(date +%s)
say "QuestLens demo bootstrap"

"$ROOT/scripts/chain-up.sh"

# Only deploy if the TaskEscrow contract is missing. Forge would otherwise
# fail with "nonce too low" on subsequent runs.
TASK_ESCROW_CODE=$(cast code "$TASK_ESCROW_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "0x")
if [[ "${#TASK_ESCROW_CODE}" -gt 4 ]]; then
  ok "contracts already deployed at expected addresses"
else
  "$ROOT/scripts/deploy-local.sh"
fi

"$ROOT/scripts/relayer-start.sh"
"$ROOT/scripts/frontend-start.sh"

T1=$(date +%s)
ok "demo stack is ready in $((T1 - T0))s"
echo
echo "  anvil    : http://127.0.0.1:$ANVIL_PORT"
echo "  relayer  : http://127.0.0.1:$RELAYER_PORT"
echo "  frontend : http://127.0.0.1:$FRONTEND_PORT"
echo
echo "  open the frontend in a browser, then click 'Run golden path'"
echo "  to abort everything: make demo-down"
