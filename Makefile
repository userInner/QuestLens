.PHONY: help install build test contracts schemas sdk relayer frontend \
        demo-up demo-down demo-reset demo-logs \
        chain-up chain-down chain-status \
        deploy relayer-start frontend-dev \
        e2e e2e-fail rehearse clean

# ----------------------------- help -----------------------------

help:
	@echo "QuestLens Protocol - common targets"
	@echo ""
	@echo "  make install         pnpm install + forge install"
	@echo "  make build           build every package + compile contracts"
	@echo "  make test            run every package's test suite (45+ tests)"
	@echo "  make invariant       run Foundry invariant fuzzer (5 properties x 4096 sequences)"
	@echo ""
	@echo "  make demo-up         start anvil, deploy, run relayer, run frontend (Demo Day)"
	@echo "  make demo-down       stop anvil, relayer, frontend"
	@echo "  make demo-reset      tear everything down, wipe state, bring it back up"
	@echo "  make demo-logs       tail the live logs"
	@echo ""
	@echo "  make e2e             happy-path smoke against running stack (~360ms)"
	@echo "  make e2e-fail        GPS-out-of-range smoke (verifies L1 rejection)"
	@echo "  make rehearse        full Demo Day rehearsal: e2e + e2e-fail + cleanup"
	@echo ""
	@echo "  make chain-up        anvil only"
	@echo "  make chain-down      stop anvil"
	@echo "  make deploy          forge deploy + auto-bootstrap relayer + mint demo balances"
	@echo "  make relayer-start   start the relayer in the foreground"
	@echo "  make frontend-dev    start vite dev server in the foreground"

# ----------------------------- install / build / test -----------------------------

install:
	pnpm install
	$(MAKE) -C packages/contracts -f /dev/null forge-install || \
	  (cd packages/contracts && forge install --shallow foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts)

build:
	pnpm -r --filter './packages/**' run build
	cd packages/contracts && forge build

test:
	pnpm -r --filter './packages/**' run test
	cd packages/contracts && forge test

invariant:
	cd packages/contracts && forge test --match-path 'test/invariant/*' -vv

# ----------------------------- demo lifecycle -----------------------------

demo-up:
	@./scripts/demo-up.sh

demo-down:
	@./scripts/demo-down.sh

demo-reset: demo-down
	@rm -rf .demo-state
	@$(MAKE) demo-up

demo-logs:
	@tail -f .demo-state/anvil.log .demo-state/relayer.log .demo-state/frontend.log

# ----------------------------- chain primitives -----------------------------

chain-up:
	@./scripts/chain-up.sh

chain-down:
	@./scripts/demo-down.sh anvil

chain-status:
	@curl -s -X POST -H "content-type:application/json" \
	  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
	  http://127.0.0.1:8545 || echo "anvil unreachable"

deploy:
	@./scripts/deploy-local.sh

relayer-start:
	@cd packages/relayer && env $$(cat .env.demo | xargs) pnpm start

frontend-dev:
	@cd packages/demo-frontend && pnpm dev

# ----------------------------- e2e smokes -----------------------------

e2e:
	@cd packages/sdk && node --import tsx test/e2e-smoke.ts

e2e-fail:
	@cd packages/sdk && node --import tsx test/e2e-smoke-fail.ts

rehearse:
	@./scripts/rehearse.sh

# ----------------------------- cleanup -----------------------------

clean:
	@./scripts/demo-down.sh || true
	@rm -rf .demo-state
	@find . -name 'cache' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name 'out' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name 'dist' -type d -prune -not -path '*/node_modules/*' -exec rm -rf {} + 2>/dev/null || true
