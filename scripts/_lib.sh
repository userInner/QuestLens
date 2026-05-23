#!/usr/bin/env bash
# Shared helpers for the demo scripts.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT/.demo-state"
mkdir -p "$STATE_DIR"

# Anvil + workspace defaults. Mirror packages/relayer/.env.demo.
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RELAYER_PORT="${RELAYER_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Anvil deterministic accounts (well-known test keys).
DEPLOYER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
REQUESTER_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
WORKER_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# Deployed contract addresses (deterministic on a fresh anvil with deployer #0).
MOCK_USDT_ADDR="0x5fbdb2315678afecb367f032d93f642f64180aa3"
REPUTATION_REGISTRY_ADDR="0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"
TASK_ESCROW_ADDR="0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"

color() {
  local code="$1"; shift
  printf "\033[%sm%s\033[0m\n" "$code" "$*"
}
say()  { color "1;36" "[demo] $*"; }
ok()   { color "1;32" "[ ok ] $*"; }
warn() { color "1;33" "[warn] $*"; }
fail() { color "1;31" "[fail] $*"; }

is_port_listening() {
  local port="$1"
  nc -z 127.0.0.1 "$port" >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local timeout_seconds="${2:-15}"
  local label="${3:-port $port}"
  local start_ts
  start_ts=$(date +%s)
  while ! is_port_listening "$port"; do
    if (( $(date +%s) - start_ts > timeout_seconds )); then
      fail "$label did not come up within ${timeout_seconds}s"
      return 1
    fi
    sleep 0.2
  done
  ok "$label is up"
}

read_pid() {
  local name="$1"
  local file="$STATE_DIR/${name}.pid"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

stop_pid() {
  local name="$1"
  local pid
  pid="$(read_pid "$name")"
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    say "stopping $name (pid $pid)"
    kill "$pid" 2>/dev/null || true
    # Give it 2s to exit, then SIGKILL.
    for _ in 1 2 3 4; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.5
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$STATE_DIR/${name}.pid"
}
