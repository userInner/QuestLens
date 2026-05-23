#!/usr/bin/env bash
# Stop the running demo stack.
# Usage:
#   demo-down.sh             # stop everything
#   demo-down.sh anvil       # stop anvil only
#   demo-down.sh relayer     # stop relayer only
#   demo-down.sh frontend    # stop frontend only

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

target="${1:-all}"

case "$target" in
  all)
    stop_pid frontend
    stop_pid relayer
    stop_pid anvil
    ;;
  anvil|relayer|frontend)
    stop_pid "$target"
    ;;
  *)
    echo "usage: $0 [all|anvil|relayer|frontend]"
    exit 1
    ;;
esac

ok "demo stopped: $target"
