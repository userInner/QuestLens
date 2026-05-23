#!/usr/bin/env bash
# Demo Day full rehearsal:
#   1. tear down any running stack
#   2. bring it up clean
#   3. run the happy-path e2e smoke (counts as Demo Day "main run")
#   4. anvil_reset + redeploy (so the failure smoke starts from a fresh chain)
#   5. run the failure-injection smoke (GPS_OUT_OF_RANGE)
#   6. tear down again
#
# Exits 0 only if both smokes pass. Designed to be run on a CI cadence so any
# regression in the end-to-end flow is caught before Demo Day.

source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

say "rehearsal: tearing down any running stack"
"$ROOT/scripts/demo-down.sh" all || true
rm -rf "$STATE_DIR"
mkdir -p "$STATE_DIR"

say "rehearsal: bringing up fresh stack"
"$ROOT/scripts/demo-up.sh"

cleanup() {
  local rc=$?
  say "rehearsal cleanup (exit $rc)"
  "$ROOT/scripts/demo-down.sh" all || true
  exit $rc
}
trap cleanup EXIT

say "rehearsal: e2e happy path"
( cd "$ROOT/packages/sdk" && node --import tsx test/e2e-smoke.ts )
ok "happy path settled"

say "rehearsal: anvil reset between scenarios"
"$ROOT/scripts/anvil-reset.sh"

say "rehearsal: e2e failure injection (GPS_OUT_OF_RANGE)"
( cd "$ROOT/packages/sdk" && node --import tsx test/e2e-smoke-fail.ts )
ok "L1 rejection observed and no on-chain settle"

ok "rehearsal complete - the Demo Day golden path is ready"
