#!/usr/bin/env bash
# Start anvil in the background and wait for it to be ready.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if is_port_listening "$ANVIL_PORT"; then
  warn "anvil already listening on :$ANVIL_PORT (reusing)"
  exit 0
fi

say "starting anvil on :$ANVIL_PORT"
nohup anvil --port "$ANVIL_PORT" --silent \
  > "$STATE_DIR/anvil.log" 2>&1 &
echo $! > "$STATE_DIR/anvil.pid"

wait_for_port "$ANVIL_PORT" 10 "anvil"
