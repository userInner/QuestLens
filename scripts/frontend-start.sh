#!/usr/bin/env bash
# Start the Vite dev server in the background.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if is_port_listening "$FRONTEND_PORT"; then
  warn "frontend already listening on :$FRONTEND_PORT"
  exit 0
fi

say "starting demo frontend on :$FRONTEND_PORT"

# Inject the addresses the frontend needs.
cat > "$ROOT/packages/demo-frontend/.env.local" <<EOF
VITE_RPC_URL=$RPC_URL
VITE_TASK_ESCROW=$TASK_ESCROW_ADDR
VITE_MOCK_USDT=$MOCK_USDT_ADDR
VITE_RELAYER_URL=http://127.0.0.1:$RELAYER_PORT
VITE_TARGET_LAT=31.230416
VITE_TARGET_LON=121.473701
VITE_TARGET_CATEGORY=storefront
EOF

cd "$ROOT/packages/demo-frontend"
nohup pnpm dev --host 127.0.0.1 --port "$FRONTEND_PORT" \
  > "$STATE_DIR/frontend.log" 2>&1 &

echo $! > "$STATE_DIR/frontend.pid"
wait_for_port "$FRONTEND_PORT" 30 "frontend"
ok "frontend ready at http://127.0.0.1:$FRONTEND_PORT"
